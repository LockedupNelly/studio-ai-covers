import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

// Subscription tier limits (monthly generation counts)
const SUBSCRIPTION_TIERS = {
  "prod_TaUTWhd9yIEw4B": { name: "starter", limit: 50 },
  "prod_TaUUCtQXelHcBD": { name: "pro", limit: 150 },
  "prod_TaUUG2rRmV18Nz": { name: "studio", limit: 500 },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-COVER] ${step}${detailsStr}`);
};

// Get current month in YYYY-MM format
const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { prompt, genre, style, mood, referenceImage, textStyleReferenceImage } = await req.json();
    logStep("Request received", { 
      prompt: prompt?.slice(0, 50), 
      genre, 
      style, 
      mood, 
      hasReferenceImage: !!referenceImage,
      hasTextStyleReference: !!textStyleReferenceImage 
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    let hasUnlimitedAccess = false;
    let subscriptionTier: string | null = null;
    let subscriptionLimit: number | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });

        // Check for subscription and determine tier/limits
        if (userEmail) {
          const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
          if (stripeKey) {
            try {
              const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
              const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
              
              if (customers.data.length > 0) {
                const subscriptions = await stripe.subscriptions.list({
                  customer: customers.data[0].id,
                  status: "active",
                  limit: 10,
                });

                for (const sub of subscriptions.data) {
                  const productId = sub.items.data[0]?.price?.product as string;
                  const tierInfo = SUBSCRIPTION_TIERS[productId as keyof typeof SUBSCRIPTION_TIERS];
                  
                  if (tierInfo) {
                    subscriptionTier = tierInfo.name;
                    subscriptionLimit = tierInfo.limit;
                    hasUnlimitedAccess = true; // All subscription tiers skip credit check
                    logStep("User has subscription", { tier: subscriptionTier, limit: subscriptionLimit });
                    break;
                  }
                }
              }
            } catch (stripeError) {
              logStep("Stripe check error (continuing)", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
            }
          }
        }

        // If user has subscription, check and enforce monthly limits
        if (subscriptionTier && subscriptionLimit && userId) {
          const currentMonth = getCurrentMonthYear();
          
          // Get current usage
          const { data: usageData, error: usageError } = await supabaseClient
            .from("subscription_usage")
            .select("generation_count")
            .eq("user_id", userId)
            .eq("month_year", currentMonth)
            .maybeSingle();

          if (usageError) {
            logStep("Error fetching usage (non-blocking)", { error: usageError.message });
          }

          const currentUsage = usageData?.generation_count || 0;
          logStep("Current monthly usage", { month: currentMonth, usage: currentUsage, limit: subscriptionLimit });

          // Check if limit exceeded
          if (currentUsage >= subscriptionLimit) {
            logStep("Monthly limit exceeded", { usage: currentUsage, limit: subscriptionLimit });
            return new Response(
              JSON.stringify({ 
                error: `Monthly generation limit reached (${currentUsage}/${subscriptionLimit}). Your limit resets at the start of next month.` 
              }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    // Extract song title and artist name from prompt
    const songTitleMatch = prompt.match(/Song Title:\s*([^|]+)/i);
    const artistNameMatch = prompt.match(/Artist:\s*([^|]+)/i);
    const descriptionMatch = prompt.match(/Description:\s*(.+?)(?:\s*$|\s*Song Title:)/is);
    
    const songTitle = songTitleMatch ? songTitleMatch[1].trim() : null;
    const artistName = artistNameMatch ? artistNameMatch[1].trim() : null;
    const description = descriptionMatch ? descriptionMatch[1].trim() : prompt;
    
    // Extract text styling instructions if provided
    const textStylingMatch = prompt.match(/TEXT STYLING INSTRUCTIONS:\s*([^|]+)/i);
    const textStyleInstructions = textStylingMatch ? textStylingMatch[1].trim() : null;
    
    logStep("Parsed prompt", { songTitle, artistName, hasTextStyle: !!textStyleInstructions });

    // ========== GENRE-SPECIFIC DIRECTOR LAYERS ==========
    const genreDirectors: Record<string, { visual: string; narrative: string }> = {
      "Hip-Hop": {
        visual: "gritty cinematic realism, bold presence, high contrast, dramatic lighting, grounded energy",
        narrative: "confidence, power, confrontation, movement"
      },
      "Rap": {
        visual: "gritty cinematic realism, bold presence, high contrast, dramatic lighting, grounded energy",
        narrative: "confidence, power, confrontation, movement"
      },
      "Pop": {
        visual: "polished, vibrant, modern, clean composition with strong visual punch",
        narrative: "confidence, clarity, star presence"
      },
      "EDM": {
        visual: "energetic, futuristic, neon accents, motion, light trails",
        narrative: "movement, intensity, sensory overload"
      },
      "R&B": {
        visual: "moody, sensual, cinematic softness, rich shadows",
        narrative: "intimacy, emotion, closeness"
      },
      "Rock": {
        visual: "raw, dramatic, gritty textures, bold lighting",
        narrative: "rebellion, intensity, impact"
      },
      "Alternative": {
        visual: "experimental, atmospheric, unconventional framing",
        narrative: "ambiguity, tension, individuality"
      },
      "Indie": {
        visual: "intimate, cinematic restraint, natural lighting",
        narrative: "authenticity, emotion, subtle storytelling"
      },
      "Metal": {
        visual: "dark fantasy, ominous, epic scale, heavy textures",
        narrative: "destruction, power, confrontation"
      },
      "Country": {
        visual: "grounded cinematic realism, rustic textures, warm contrast",
        narrative: "story, place, nostalgia"
      },
      "Jazz": {
        visual: "elegant, low-key lighting, cinematic noir",
        narrative: "mood, atmosphere, sophistication"
      },
      "Classical": {
        visual: "refined, timeless, painterly lighting",
        narrative: "grandeur, emotion, permanence"
      },
    };

  // ========== STYLE PRIORITY FLAGS ==========
  const stylePriority: Record<string, "high" | "normal"> = {
    "Retro": "high",
    "Anime": "high",
    "Abstract": "high",
    "Minimalist": "high",
    "3D Render": "high",
    "Fine Art": "normal",
    "Illustration": "normal",
    "Cinematic": "normal",
    "Realism": "normal",
  };

  // ========== STYLE TECHNICAL OVERRIDES ==========
  const styleTechnicalOverrides: Record<string, string> = {
    "Minimalist": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Vector-clean edges with mathematically precise geometry
- Flat color rendering - NO gradients, NO noise, NO grain
- Maximum negative space (60-90% empty)
- NO atmospheric effects, NO fog, NO particles, NO textures
- NO photorealistic depth of field
- Swiss design grid precision`,

    "Abstract": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Non-representational forms only
- Emotional color expression over literal depiction
- NO realistic depth of field
- NO recognizable objects, faces, or scenes
- Pure artistic abstraction
- Bold texture and surface quality`,

    "Anime": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Japanese animation cel-shading technique
- Bold black outlines with aggressive line weight variation
- Speed lines, impact frames, motion blur streaks
- Dramatic lens flares and glowing auras
- Exaggerated expressions and dynamic poses
- NOT cute/soft - this is INTENSE, CINEMATIC anime`,

    "3D Render": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Octane/Redshift/Arnold render engine aesthetic
- Studio HDRI lighting with visible light sources
- Impossibly smooth geometry and perfect surfaces
- Neon rim lights (cyan, magenta, orange glows)
- Reflective floors, gradient backgrounds
- NO film grain, NO organic imperfections
- That "Cinema 4D Instagram" aesthetic`,

    "Retro": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Heavy analog film grain (ISO 400-1600)
- Faded color science: Kodachrome, Ektachrome, or Polaroid
- Visible aging: scratches, dust, wear, light leaks
- Period-accurate color shifts: warm ambers, magenta casts
- VHS artifacts OR halftone printing dots where appropriate
- Must feel authentically vintage, not digitally filtered`,
  };

  // ========== VISUAL STYLE MODIFIERS ==========
  const styleModifiers: Record<string, string> = {
    "Realism": `Style: High-End Cinematic Photography. > Optics: Shot on 35mm prime lens, f/2.8. Sharp focal plane with natural depth-of-field falloff. Subtle lens characteristics including natural bloom and organic micro-contrast. Material Fidelity: Hyper-detailed surface shaders. Render authentic material response to light (specular highlights on hard surfaces, subsurface scattering on organic textures). No digital smoothing or artificial sharpening. Lighting: Global illumination with physically accurate shadows. High dynamic range (HDR) with deep, detailed blacks and preserved highlight detail. Finish: Professional color grade, subtle filmic grain, and authentic atmospheric density.`,

    "3D Render": `HYPER-STYLIZED CGI / CINEMA 4D AESTHETIC - Impossibly smooth surfaces, toy-like materials. Subjects look like high-end 3D models. Glowing neon rim lights (cyan, magenta, orange). Reflective floor with gradient studio background. Perfect edge bevels, impossibly smooth curves. Volumetric god rays, atmospheric fog with glow. Octane/Redshift/Arnold render look.`,

    "Illustration": `TRADITIONAL ILLUSTRATION - Visible brushstrokes, paint texture, artistic mark-making. Oil painting, gouache, or watercolor aesthetic. Loose, expressive linework with intentional imperfection. Rich color layering with visible underpainting. Must look like it was painted by a human artist.`,

    "Anime": `MAXIMUM INTENSITY JAPANESE ANIME - Exaggerated dramatic expressions, intense eyes. Dynamic action poses, extreme foreshortening. Intense backlighting, lens flares, glowing auras. Speed lines, motion blur streaks, impact frames. High contrast cel-shading. Attack on Titan / Demon Slayer intensity.`,

    "Fine Art": `MUSEUM-QUALITY FINE ART - Chiaroscuro lighting with dramatic light/shadow contrast. Classical composition: rule of thirds, golden ratio. Oil painting texture with visible canvas weave. Renaissance/Baroque color palette. Rembrandt lighting, Caravaggio shadows.`,

    "Abstract": `PURE ABSTRACT EXPRESSIONISM - Subject IS the color, shape, and texture. NO recognizable faces, NO realistic objects. Bold color fields, gestural brushstrokes, drips, splatters. Rothko color fields, Pollock action painting, Kandinsky geometry.`,

    "Minimalist": `RADICAL MINIMALIST DESIGN - 70-90% empty negative space. Maximum 2-3 visual elements total. FLAT colors only - NO gradients, NO textures. Clean vector-like shapes with mathematically sharp edges. Swiss design principles.`,

    "Cinematic": `HOLLYWOOD MOVIE POSTER - Anamorphic lens characteristics, horizontal lens flares. Film-grade color grading: teal and orange. Dramatic three-point lighting. Depth layers with atmospheric haze. Epic scale, $200M film production quality.`,

    "Retro": `AUTHENTIC VINTAGE AESTHETIC - Heavy film grain (ISO 400-1600). Faded palette with lifted blacks. Kodachrome warmth, Ektachrome saturation. Light leaks, dust, scratches, age wear. VHS tracking lines for 80s/90s vibe. Must feel FROM a past era.`,
  };

    // ========== MOOD / VIBE EMOTIONAL LAYERS ==========
    const moodLayers: Record<string, string> = {
      "Aggressive": "Sharp lighting, high contrast, forceful energy.",
      "Dark": "Low-key lighting, ominous shadows, tension.",
      "Mysterious": "Fog, restrained lighting, partial obscurity.",
      "Euphoric": "Glowing highlights, motion, energy.",
      "Uplifting": "Warm contrast, hopeful tone, openness.",
      "Melancholic": "Muted colors, soft lighting, emotional weight.",
      "Romantic": "Warm highlights, intimacy, closeness.",
      "Peaceful": "Balanced composition, gentle lighting.",
      "Intense": "High tension, dramatic contrast.",
      "Nostalgic": "Soft contrast, film-like grading.",
    };

    const genreDirection = genreDirectors[genre] || { 
      visual: "cinematic realism, dramatic lighting, professional quality",
      narrative: "emotion, story, impact"
    };
    const visualStyle = styleModifiers[style] || "Photorealistic, cinematic lighting, high detail.";
    const moodStyle = moodLayers[mood] || "Dramatic, atmospheric, emotionally evocative.";
    const isHighPriorityStyle = stylePriority[style] === "high";
    const technicalOverride = styleTechnicalOverrides[style] || "";

    // ========== NEW 2-PASS ARCHITECTURE: Prompt Expansion + Single Power Call ==========
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      const startTime = Date.now();

      // ===== PASS 0: PROMPT EXPANSION (Keep as-is using Lovable AI Gateway) =====
      logStep("PASS 0: Starting prompt expansion with AI");
      
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let expandedDescription = description; // Fallback to original if expansion fails
      
      if (LOVABLE_API_KEY) {
        try {
          const expansionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `You are a world-class concept artist creating album cover artwork. Your task: transform simple descriptions into VIVID, IMMERSIVE scene descriptions.

${isHighPriorityStyle ? `
===== CRITICAL STYLE CONSTRAINT: ${style} =====
This is a HIGH-PRIORITY STYLE that OVERRIDES normal cinematic/photorealistic language.

${style === "Minimalist" ? `For MINIMALIST: Describe vast emptiness, single geometric shapes, flat colors, negative space. Do NOT add fog, particles, textures, or atmospheric effects. Think Saul Bass, Japanese minimalism.` : ""}
${style === "Abstract" ? `For ABSTRACT: Describe color fields, shapes, textures, emotional color relationships - NOT literal objects. If the user mentions "a rose", describe "organic red forms bleeding into warm gradients". NO recognizable objects or faces.` : ""}
${style === "3D Render" ? `For 3D RENDER: Describe impossibly smooth CGI surfaces, neon rim lights, reflective floors, gradient backgrounds, toy-like perfection. This is Cinema 4D/Octane aesthetic, NOT photography.` : ""}
${style === "Anime" ? `For ANIME: Describe intense expressions, speed lines, dramatic backlighting, wind-blown elements, impact frames. This is Attack on Titan intensity, NOT soft/cute anime.` : ""}
${style === "Retro" ? `For RETRO: Describe faded film colors, heavy grain, light leaks, vintage warmth. The scene should feel like it's FROM the 70s/80s/90s.` : ""}

Your expanded description MUST be written specifically for ${style} rendering. Do NOT add cinematic/realistic language that contradicts this style.
` : `
THINK LIKE A DIRECTOR:
- What is the STORY of this scene? What just happened? What's about to happen?
- What EMOTION should viewers feel instantly?
- Where is the CAMERA positioned? What's in foreground, midground, background?
- What TIME OF DAY/NIGHT? What's the WEATHER? What's in the AIR (fog, smoke, particles, rain)?

SCENE-BUILDING REQUIREMENTS:
1. ENVIRONMENT - Build a complete world: ground textures, sky conditions, distant elements
2. LIGHTING - Be SPECIFIC: "warm golden hour light streaming from camera-left, casting long purple shadows"
3. ATMOSPHERE - Layer the air: volumetric fog, dust motes, smoke wisps, falling particles
4. SUBJECT DETAIL - Describe materials, textures, wear patterns, reflections
5. DEPTH - Include foreground elements (blurred), midground (subject), background (atmosphere)
6. MOTION/ENERGY - Flowing elements, rising smoke, swirling particles, wind-swept items
`}

OUTPUT RULES:
- 200-350 words of pure visual poetry
- NO text/typography references (text will be added separately)
- Paint a scene so vivid the reader can FEEL the atmosphere
- Match ${style} aesthetic, ${mood} emotion, ${genre} genre context`
                },
                {
                  role: "user",
                  content: `Transform this into a breathtaking scene description${isHighPriorityStyle ? ` optimized for ${style} style` : ""}:

"${description}"

Style: ${style} | Mood: ${mood} | Genre: ${genre}

Write ONLY the expanded scene description - no explanations:`
                }
              ],
            }),
          });

          if (expansionResponse.ok) {
            const expansionData = await expansionResponse.json();
            const expandedContent = expansionData.choices?.[0]?.message?.content;
            if (expandedContent && expandedContent.length > 50) {
              expandedDescription = expandedContent.trim();
              logStep("PASS 0 complete: Prompt expanded", { 
                originalLength: description.length, 
                expandedLength: expandedDescription.length,
                preview: expandedDescription.slice(0, 100) + "..."
              });
            }
          } else {
            logStep("PASS 0 warning: Expansion API failed, using original", { status: expansionResponse.status });
          }
        } catch (expansionError) {
          logStep("PASS 0 warning: Expansion failed, using original", { error: expansionError instanceof Error ? expansionError.message : String(expansionError) });
        }
      } else {
        logStep("PASS 0 skipped: No LOVABLE_API_KEY available");
      }

      const pass0Time = Date.now() - startTime;
      logStep("PASS 0 timing", { timeMs: pass0Time });

      // ===== POWER CALL: Single Google AI Studio call for Artwork + Typography =====
      // This generates the complete album cover with integrated text at native 2048x2048
      
      const genreSection = isHighPriorityStyle 
        ? `===== GENRE CONTEXT: ${genre} =====
Adapt the ${style} aesthetic to feel appropriate for ${genre} music.
(Note: The visual STYLE takes priority over genre-typical visuals)`
        : `===== GENRE: ${genre} =====
Visual Direction: ${genreDirection.visual}
Emotional Narrative: ${genreDirection.narrative}`;

      const technicalSection = isHighPriorityStyle && technicalOverride
        ? `===== STYLE-SPECIFIC TECHNICAL REQUIREMENTS =====
${technicalOverride}`
        : `===== TECHNICAL REQUIREMENTS =====
- Volumetric fog and atmospheric depth
- Cinematic lighting with high contrast
- Ultra-detailed textures and materials
- Realistic depth of field
- Ultra high resolution, maximum detail and quality
- 8K render quality`;

      // Build the unified prompt for artwork + typography in ONE call
      const unifiedPrompt = `Create a COMPLETE, FINISHED album cover for a ${genre} song at MAXIMUM QUALITY.

===== ARTWORK VISION =====
${expandedDescription}

===== VISUAL STYLE: ${style} =====
${visualStyle}

===== MOOD: ${mood} =====
${moodStyle}

${genreSection}

===== TYPOGRAPHY CONTENT =====
Song Title: "${songTitle || "Untitled"}"
Artist Name: "${artistName || ""}"

${textStyleInstructions ? `===== TYPOGRAPHY STYLE (CRITICAL - FOLLOW EXACTLY) =====
${textStyleInstructions}

TYPOGRAPHY IDENTITY RULES:
- Letterform identity must remain recognizable
- Stroke structure, shapes, and proportions must match the style exactly
- Overall typography style must match the reference with high fidelity
` : `===== TYPOGRAPHY STYLING =====
Design professional, album-ready typography that fits the ${genre} aesthetic.
The text should have depth, dimension, effects, and feel integrated with the scene.
`}

===== INTEGRATED COMPOSITION REQUIREMENTS =====

**CRITICAL: Generate artwork AND text as ONE UNIFIED PIECE**
The typography must be PAINTED INTO the scene, not added on top.

1. TEXT-LIGHTING INTEGRATION
   - Text receives the SAME lighting as the artwork
   - If scene has rim lighting, text has rim lighting
   - Text color reflects ambient light temperature
   - Shadows on text match the scene's shadow direction

2. TEXT-ATMOSPHERE INTEGRATION  
   - If fog/haze exists, it affects the text
   - Text exists INSIDE the atmosphere, not above it
   - Environmental elements may partially occlude text

3. PHYSICS CONSISTENCY
   - Text catches reflections, fog, and light from the artwork
   - Text surface matches artwork's material quality
   - Same grain, noise, or film texture throughout

4. PLACEMENT
   - Text in lower third unless composition demands otherwise
   - 25-35% of composition width for visibility
   - Professional album cover composition

${technicalSection}

===== FINAL OUTPUT REQUIREMENTS =====
- Perfect 1:1 square composition
- Album cover framing, edge-to-edge artwork
- NO borders, NO margins
- Professional studio quality
- Text must be spelled EXACTLY as provided
- Song title: "${songTitle || "Untitled"}" - spell each letter correctly
- Artist name: "${artistName || ""}" - spell each letter correctly`;

      logStep("POWER CALL: Starting unified artwork + text generation", { 
        style, 
        isHighPriorityStyle, 
        hasTechnicalOverride: !!technicalOverride,
        hasTextStyleInstructions: !!textStyleInstructions,
        songTitle,
        artistName
      });

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000); // 2 minute timeout

      let response: Response;
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: unifiedPrompt }]
              }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                imageConfig: {
                  aspectRatio: "1:1",
                  imageSize: "2K"  // Guaranteed 2048x2048 output
                }
              }
            }),
            signal: controller.signal,
          }
        );
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof DOMException && e.name === "AbortError") {
          throw new Error("Generation timed out. Please try again.");
        }
        throw e;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        const errorText = await response.text();
        logStep("POWER CALL API error", { status: response.status, error: errorText });
        if (response.status === 429) throw new Error("RATE_LIMIT");
        if (response.status === 402 || response.status === 401 || response.status === 403) throw new Error("API_KEY_ERROR");
        if (errorText.includes("SAFETY") || errorText.includes("blocked")) {
          throw new Error("CONTENT_MODERATED");
        }
        throw new Error(`Google AI API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract the base64 image from the response
      const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      const base64Image = imagePart?.inlineData?.data;
      
      if (!base64Image) {
        const textContent = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
        logStep("No image in response", { textContent: textContent?.slice(0, 200) });
        throw new Error("Failed to generate cover - no image returned");
      }

      imageUrl = `data:image/png;base64,${base64Image}`;
      
      const powerCallTime = Date.now() - startTime - pass0Time;
      logStep("POWER CALL complete", { timeMs: powerCallTime, totalMs: Date.now() - startTime });

      // Upload to storage
      finalImageUrl = imageUrl;
      
      if (imageUrl.startsWith("data:image")) {
        try {
          const base64Data = imageUrl.split(",")[1];
          const mimeMatch = imageUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
          const extension = mimeType.split("/")[1] || "png";
          const fileName = `${userId || "anon"}/${Date.now()}.${extension}`;

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const { error: uploadError } = await supabaseClient.storage
            .from("covers")
            .upload(fileName, bytes, { contentType: mimeType, upsert: true });

          if (uploadError) {
            logStep("Storage upload failed, returning base64", { error: uploadError.message });
          } else {
            const { data: publicUrl } = supabaseClient.storage.from("covers").getPublicUrl(fileName);
            finalImageUrl = publicUrl.publicUrl;
            logStep("Uploaded to storage", { url: finalImageUrl });
          }
        } catch (uploadErr) {
          logStep("Storage upload error, returning base64", {
            error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
        }
        imageUrl = finalImageUrl;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      if (errorMessage === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "API_KEY_ERROR") {
        return new Response(
          JSON.stringify({ error: "API key error. Please check your Google AI API key configuration." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "CONTENT_MODERATED") {
        return new Response(
          JSON.stringify({
            error:
              "This prompt was flagged by content safety filters. Please try a different description.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage.includes("timed out")) {
        return new Response(
          JSON.stringify({ error: "Generation timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      logStep("ERROR", { message: errorMessage });
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Generation complete (2-pass: expansion + power call)");

    // Track subscription usage OR deduct credit
    if (userId && hasUnlimitedAccess && subscriptionTier) {
      // Increment monthly usage for subscribers
      const currentMonth = getCurrentMonthYear();
      
      const { data: existingUsage } = await supabaseClient
        .from("subscription_usage")
        .select("id, generation_count")
        .eq("user_id", userId)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (existingUsage) {
        await supabaseClient
          .from("subscription_usage")
          .update({ generation_count: existingUsage.generation_count + 1 })
          .eq("id", existingUsage.id);
        
        logStep("Subscription usage incremented", { 
          month: currentMonth, 
          newCount: existingUsage.generation_count + 1,
          limit: subscriptionLimit 
        });
      } else {
        await supabaseClient
          .from("subscription_usage")
          .insert({ 
            user_id: userId, 
            month_year: currentMonth, 
            generation_count: 1 
          });
        
        logStep("Subscription usage started", { month: currentMonth, count: 1, limit: subscriptionLimit });
      }
    } else if (userId && !hasUnlimitedAccess) {
      // Deduct credit for non-subscribers
      const { data: creditsData, error: creditsError } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching credits", { error: creditsError.message });
        throw new Error("Failed to check credits");
      }

      const currentCredits = creditsData?.credits ?? 0;

      if (currentCredits < 1) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({ credits: currentCredits - 1 })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error deducting credit", { error: updateError.message });
      } else {
        await supabaseClient.from("credit_transactions").insert({
          user_id: userId,
          amount: -1,
          type: "generation",
          description: `Generated cover: ${prompt.slice(0, 50)}...`,
        });
        logStep("Credit deducted", { newBalance: currentCredits - 1 });
      }
    }

    // Save generation to database
    if (userId) {
      try {
        const { error: saveError } = await supabaseClient.from("generations").insert({
          user_id: userId,
          prompt: prompt,
          genre: genre,
          style: style,
          mood: mood,
          image_url: finalImageUrl,
          song_title: songTitle,
          artist_name: artistName,
        });

        if (saveError) {
          logStep("Error saving generation", { error: saveError.message });
        } else {
          logStep("Generation saved to database");
        }
      } catch (saveErr) {
        logStep("Error saving generation", { error: saveErr instanceof Error ? saveErr.message : String(saveErr) });
      }
    }

    return new Response(
      JSON.stringify({ imageUrl: finalImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
