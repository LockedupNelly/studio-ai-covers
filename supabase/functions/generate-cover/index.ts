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
        visual: "Gritty urban textures, high-contrast wide angles, bold cinematic photography with heavy shadows",
        narrative: "street authenticity, raw power, cultural weight"
      },
      "Rap": {
        visual: "Gritty urban textures, high-contrast wide angles, bold cinematic photography with heavy shadows",
        narrative: "street authenticity, raw power, cultural weight"
      },
      "Pop": {
        visual: "High-saturation, clean commercial aesthetic. Vibrant trendy color palettes, soft lighting, modern iconic imagery",
        narrative: "mass appeal, visual clarity, star presence"
      },
      "EDM": {
        visual: "Synthetic light sources, neon color palettes, abstract energy flows. Liquid textures and symmetrical layouts",
        narrative: "movement, electronic energy, sensory overload"
      },
      "R&B": {
        visual: "Soft warm mood lighting. Smooth gradients, intimate close-ups, elegant high-fashion photography vibes",
        narrative: "intimacy, sensuality, emotional closeness"
      },
      "Rock": {
        visual: "High-grain film aesthetic. Harsh lighting, desaturated tones, distressed textures",
        narrative: "rebellion, raw intensity, visceral impact"
      },
      "Alternative": {
        visual: "High-concept surrealism. Moody lighting, unconventional color-grading, avant-garde composition",
        narrative: "ambiguity, artistic tension, individuality"
      },
      "Indie": {
        visual: "Lo-fi analog aesthetic. Natural lighting, candid film-frame composition, earthy muted color palettes",
        narrative: "authenticity, intimacy, subtle storytelling"
      },
      "Metal": {
        visual: "High-grain film aesthetic. Harsh lighting, desaturated tones, distressed textures",
        narrative: "destruction, power, dark confrontation"
      },
      "Country": {
        visual: "Warm natural light, rustic organic textures, wide-open landscape depth. Golden-hour hues, grounded framing",
        narrative: "storytelling, sense of place, heartland nostalgia"
      },
      "Jazz": {
        visual: "Smoky late-night atmosphere, soft lighting, sophisticated high-contrast noir vibes",
        narrative: "mood, elegance, late-night sophistication"
      },
      "Classical": {
        visual: "Grand scale, dramatic chiaroscuro lighting, ornate timeless textures. Majestic and high-prestige",
        narrative: "grandeur, timeless emotion, permanence"
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
    "Realism": `High-end cinematic photography. 35mm lens, f/2.8. Hyper-detailed surface shaders and physically accurate light falloff. Professional color grade with deep, preserved blacks.`,

    "3D Render": `Octane render aesthetic. Metallic and glass textures, soft global illumination, and ray-traced reflections. Clean, futuristic, and polished.`,

    "Illustration": `High-quality digital painting. Sharp edges, hand-drawn character, layered depth, and professional cel-shading or textured brushwork.`,

    "Anime": `Modern "Makoto Shinkai" style. High-vibrancy sky gradients, dramatic backlighting, hand-painted textures, and cinematic bloom.`,

    "Fine Art": `Museum-grade oil on canvas or mixed media. Visible impasto brushstrokes, rich pigment blending, and classical composition.`,

    "Abstract": `Non-representational form and color. Focus on fluid dynamics, geometric tension, and textured layering. High-concept visual energy.`,

    "Minimalist": `High-contrast composition with vast negative space. Bold geometric balance, muted palettes, and a singular, sharp focal point.`,

    "Cinematic": `Anamorphic lens flare, high dynamic range, and volumetric lighting. Dramatic framing with professional color grading.`,

    "Retro": `Vintage 70s/80s film stock. Heavy grain, light leaks, chromatic aberration, and warm, faded analog color palettes.`,
  };

    // ========== MOOD / VIBE EMOTIONAL LAYERS ==========
    const moodLayers: Record<string, string> = {
      "Aggressive": "High-contrast harsh lighting. Jagged edges, deep reds or neon accents, sense of forward motion and tension.",
      "Dark": "Low-key lighting, heavy shadows, monochromatic or desaturated palette. Moody, high-contrast, somber.",
      "Mysterious": "Volumetric haze, silhouettes, obscured subjects. Cool tones with a single glowing light source.",
      "Euphoric": "Warm overexposed light. Lens flares, vibrant gradients, sense of weightlessness. Dreamy and glowing.",
      "Uplifting": "Bright high-key lighting. Happy energy, saturation, open airy composition.",
      "Melancholic": "Muted desaturated cool tones. Soft diffused lighting, rain-softened edges, stillness or longing.",
      "Romantic": "Soft-focus glow, warm golden hour lighting, intimate delicate details. Deep warm colors.",
      "Peaceful": "Harmonious balanced colors, low-contrast lighting, vast calm horizons. Minimalist and steady.",
      "Intense": "Extreme focal depth, high-vibration color contrast, dynamic centered energy. Powerful and arresting.",
      "Nostalgic": "Soft-lit hazy memory aesthetic. Sepia undertones, filmic glow, gentle vintage textures.",
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
                  content: `You are an album cover art director. Transform descriptions into HIGH-DENSITY visual keywords.

${isHighPriorityStyle ? `
===== STYLE CONSTRAINT: ${style} =====
${style === "Minimalist" ? `MINIMALIST: Negative space, single focal point, flat colors, geometric simplicity. NO atmospheric effects.` : ""}
${style === "Abstract" ? `ABSTRACT: Color fields, organic shapes, emotional gradients. NO literal objects or faces.` : ""}
${style === "3D Render" ? `3D RENDER: Smooth CGI surfaces, neon rim lights, reflective floors, Cinema 4D/Octane aesthetic.` : ""}
${style === "Anime" ? `ANIME: Dynamic poses, speed lines, dramatic backlighting, impact frames.` : ""}
${style === "Retro" ? `RETRO: Faded film colors, heavy grain, light leaks, vintage warmth.` : ""}
` : `
TECHNICAL DIRECTIVES:
- COMPOSITION: Rule of thirds, clear focal point, negative space in lower third for text
- LIGHTING: Single key light direction, color temperature, shadow placement
- COLOR: Dominant palette (max 3 colors), color grading direction
- SUBJECT: Core visual element, material/texture keywords
`}

OUTPUT RULES:
- 60-75 words MAXIMUM
- High-density keywords, NOT prose
- Format: "[Subject], [lighting], [color palette], [composition], [atmosphere]"
- NO flowery language or "visual poetry"
- Reserve lower third for typography placement
- Match ${style} aesthetic, ${mood} mood, ${genre} genre`
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

===== TYPOGRAPHY PLACEMENT =====

1. CREATIVE PLACEMENT
   - Position text where it best complements the composition
   - Text can be placed anywhere: top, center, bottom, or integrated into the artwork
   - Let the visual flow of the design guide text placement

2. TEXT RENDERING
   - High-contrast text that remains readable
   - Clean, sharp letterforms with defined edges
   - Text should feel like a natural part of the design

3. INTEGRATION
   - Typography should feel cohesive with the artwork atmosphere
   - Text can interact with, blend into, or emerge from the scene
   - Effects and textures on text are encouraged when they enhance the design

4. SIZING
   - Appropriately sized for visual impact
   - Must remain readable at thumbnail size
   - Adequate padding from edges

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

      // Fetch and convert text style reference image to base64 if provided
      let textStyleImageBase64: string | null = null;
      if (textStyleReferenceImage) {
        try {
          logStep("Fetching text style reference image", { url: textStyleReferenceImage.slice(0, 100) });
          const imageResponse = await fetch(textStyleReferenceImage);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            textStyleImageBase64 = base64;
            logStep("Text style reference image converted to base64", { sizeBytes: imageBuffer.byteLength });
          } else {
            logStep("Failed to fetch text style reference image", { status: imageResponse.status });
          }
        } catch (imgError) {
          logStep("Error fetching text style reference image", { error: imgError instanceof Error ? imgError.message : String(imgError) });
        }
      }

      // Build multimodal content parts - IMAGE FIRST for better style matching
      const contentParts: any[] = [];
      
      if (textStyleImageBase64) {
        // 1. Brief intro priming the AI to study the reference
        contentParts.push({
          text: `===== TEXT STYLE VISUAL REFERENCE =====
CRITICAL: Study this reference image carefully FIRST. This shows the EXACT typography style you must replicate.
The song title must match: the letterforms, effects, textures, glow, distortion, and overall styling shown here.
Use this as your PRIMARY visual target for typography.`
        });
        
        // 2. The reference image FIRST (visual anchor before instructions)
        contentParts.push({
          inlineData: {
            mimeType: "image/png",
            data: textStyleImageBase64
          }
        });
        
        // 3. Reinforcement after seeing the image, then full instructions
        contentParts.push({
          text: `Now that you've seen the exact text style to replicate, here are your full generation instructions:

${unifiedPrompt}`
        });
        
        logStep("Added text style reference image FIRST in multimodal request for better style matching");
      } else {
        // No reference image - just the prompt
        contentParts.push({ text: unifiedPrompt });
      }

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
                parts: contentParts
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
