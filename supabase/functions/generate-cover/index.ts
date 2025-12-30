import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

// Product IDs for unlimited tiers
const UNLIMITED_PRODUCT_IDS = [
  "prod_TaUUCtQXelHcBD", // Pro
  "prod_TaUUG2rRmV18Nz", // Studio
];

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-COVER] ${step}${detailsStr}`);
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

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });

        // Check for Pro/Studio subscription (unlimited access)
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
                  if (UNLIMITED_PRODUCT_IDS.includes(productId)) {
                    hasUnlimitedAccess = true;
                    logStep("User has unlimited access", { productId });
                    break;
                  }
                }
              }
            } catch (stripeError) {
              logStep("Stripe check error (continuing)", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
            }
          }
        }
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
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

    // ========== VISUAL STYLE MODIFIERS ==========
    const styleModifiers: Record<string, string> = {
      "Realism": "Photorealistic, cinematic realism, natural lighting.",
      "3D Render": "Ultra-detailed 3D realism, cinematic lighting, physical materials.",
      "Illustration": "Painterly textures, artistic clarity, controlled lighting.",
      "Anime": "Cinematic anime aesthetic, dramatic lighting, depth of field, expressive motion.",
      "Fine Art": "Gallery-quality composition, painterly lighting, dramatic framing.",
      "Abstract": "Symbolic imagery, expressive color and form.",
      "Minimalist": "Strong negative space, single dominant focal element.",
      "Cinematic": "Film still aesthetic, motion, atmosphere, dramatic lighting.",
      "Retro": "Vintage color grading, nostalgic texture, analog feel.",
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

    // Helper function to make image generation request
    const makeImageRequest = async (promptText: string, maxRetries = 2): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Generation attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);

        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt: promptText,
              n: 1,
              size: "1024x1024",
              quality: "high",
            }),
            signal: controller.signal,
          });
        } catch (e) {
          clearTimeout(timeout);
          if (e instanceof DOMException && e.name === "AbortError") {
            logStep("Request timed out", { attempt });
            if (attempt === maxRetries) throw new Error("Generation timed out. Please try again.");
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("OpenAI API error", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
          
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        logStep("OpenAI response received", { hasData: !!data?.data?.[0] });
        
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate image. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const imageUrl = imageData.b64_json 
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        if (!imageUrl) {
          if (attempt === maxRetries) throw new Error("Failed to generate image. Please try again.");
          continue;
        }

        logStep("Image generated successfully", { urlPrefix: imageUrl.slice(0, 50) });
        return imageUrl;
      }
      throw new Error("Failed to generate image after retries");
    };

    // Helper function to analyze cover with GPT-5 vision for text styling
    const analyzeForTextStyling = async (coverImageBase64: string, userTextStyle?: string): Promise<string> => {
      logStep("PASS 2: Analyzing cover for optimal text styling", { userTextStyle: userTextStyle?.slice(0, 100) });
      
      const analysisPrompt = userTextStyle 
        ? `You are analyzing an album cover to determine how to integrate text that MUST match a specific style.

===== MANDATORY TEXT STYLE (USER SELECTED - MUST FOLLOW EXACTLY) =====
"${userTextStyle}"

The user has explicitly chosen this text style. You MUST honor this choice exactly. Your job is to:
1. PRESERVE the exact font style, weight, and characteristics described above
2. Adapt the COLOR PALETTE from the cover image to apply to this text style
3. Determine how scene elements (lighting, weather, particles) should interact with this specific text style
4. Suggest material/texture integration that matches both the style AND the cover

Analyze the cover image and respond with specific instructions that:
- KEEP the typography style exactly as described: "${userTextStyle}"
- ADAPT colors from the image (list 2-3 specific colors from the cover to use)
- DESCRIBE how the scene's lighting should affect this text style
- SPECIFY environmental interactions (rain, sparks, fog, etc. touching the text)
- EXPLAIN the text's integration method (embossed, carved, painted, glowing, etc.)

CRITICAL: Do not change the fundamental text style. If the user chose "Bold distressed uppercase with splatter texture" - the output MUST be bold, distressed, uppercase with splatter. Only adapt the colors and scene integration.

Respond with a detailed paragraph starting with the exact text style, then color adaptation, then integration details.`
        : `You are analyzing an album cover to determine the PERFECT text styling that will feel naturally integrated.

Analyze the image and determine:
1. The dominant color palette (extract 3-4 key colors with descriptions)
2. The overall mood and aesthetic
3. What material/texture would text naturally be made of in this scene
4. How light sources in the image would affect text
5. What font style best matches the aesthetic (be specific: bold vs thin, serif vs sans, distressed vs clean, etc.)

Respond with a detailed, specific paragraph describing EXACTLY how the text should appear, including:
- Font style characteristics (bold condensed, elegant serif, grunge sans-serif, hand-painted, etc.)
- Primary text color (from the image's color palette) 
- Secondary/accent colors for effects
- Material/texture the text should appear to be (metallic, stone, neon, graffiti, paint, etc.)
- Effects (glow, shadow, emboss, distress, weathering, splatter, etc.)
- How scene elements should interact with text (rain drops, sparks, light flares, fog wisps)
- Specific integration details (text appearing carved, painted, projected, burning, etc.)

Be extremely specific and creative. The goal is text that looks like it was PHOTOGRAPHED in the scene, not added in post.
Choose a distinctive, impactful text style that matches the cover's energy.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: analysisPrompt },
                {
                  type: "image_url",
                  image_url: {
                    url: coverImageBase64.startsWith("data:") 
                      ? coverImageBase64 
                      : `data:image/png;base64,${coverImageBase64}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logStep("Vision analysis error", { error });
        // Fallback to generic styling based on genre/mood
        return `Use colors that complement a ${mood} ${genre} aesthetic. Text should be bold, cinematic, and integrated into the scene with appropriate shadows and lighting effects.`;
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content || "";
      logStep("Text styling analysis complete", { preview: analysis.slice(0, 100) });
      return analysis;
    };

    // ========== 3-PASS GENERATION PIPELINE ==========
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      // ===== PASS 1: Generate cover WITHOUT text =====
      logStep("PASS 1: Generating cover art without text");
      
      const pass1Prompt = `SYSTEM ROLE:
You are generating professional, high-end album cover artwork intended for commercial music distribution.
IMPORTANT: DO NOT include ANY text, titles, or typography in this image. Generate ONLY the visual artwork/background.

===== GLOBAL QUALITY LAYER (ALWAYS APPLY) =====
The image must feel cinematic, dramatic, intentional, and polished — never generic, flat, amateur, or stock-like.
The result should look like a finished, high-budget album cover created by an experienced designer.

Always prioritize:
- Strong central or iconographic composition
- Clear focal hierarchy
- Cinematic lighting (backlighting, rim light, directional light, high contrast)
- Realistic materials and textures
- Atmospheric depth (fog, rain, smoke, particles, volumetric lighting)
- Mood-driven color grading
- Album-safe framing with space for text to be added later
- Strong thumbnail legibility

Avoid flat lighting, symmetrical layouts, empty scenes, or overly clean surfaces.

===== DIRECTOR PASS (CINEMATIC INTENT) =====
The image must capture ONE defining cinematic moment — as if frozen from a movie trailer or album-defining scene.

Prioritize:
- A clear story implied in a single frame
- One dominant visual event (impact, emergence, collision, motion, lightning strike)
- Asymmetry over perfect balance
- Natural imperfections (wear, erosion, grime, sparks, rain distortion)
- Environmental interaction (weather affecting surfaces, light wrapping edges, debris reacting to motion)

Focus on the exact moment of maximum intensity, not before or after.

===== EVENT INTENSITY LAYER (ALWAYS APPLY) =====
The image must depict an active, high-energy moment, not a static scene.

Force the environment to react to the subject:
- Motion causes sparks, debris, rain distortion, smoke, or crowd reaction
- Surfaces show stress, friction, wear, heat, or damage
- Lighting responds to action (flares, explosions, lightning, reflections)
- Perspective exaggerates speed, scale, or impact

The scene should feel unstable, dynamic, and alive.

===== PHYSICAL CONSEQUENCE BIAS =====
Every major action should leave visible consequences on the environment
(scratches, sparks, cracks, debris, distortion, heat, water displacement).

===== SCALE AND DENSITY RULE =====
Fill the frame with meaningful detail.
Avoid large empty areas unless required for composition.
Crowds, structures, weather, and effects should reinforce scale and intensity.
${['Hip-Hop', 'Rap', 'EDM', 'Rock', 'Metal'].includes(genre) ? `
===== FORCED PERSPECTIVE (SPEED/POWER GENRES) =====
Use aggressive perspective, low angles, motion compression, and depth exaggeration to amplify speed, power, and dominance.
` : ''}
===== NEGATIVE CONSTRAINTS =====
Avoid generic AI aesthetics, stock photography composition, flat poster layouts, plastic textures, over-smoothing, washed-out contrast.
DO NOT include any text, typography, letters, words, or titles. This is artwork only.

===== ICON BIAS =====
Compose the image so it is recognizable within one second at small thumbnail size.

===== GENRE-SPECIFIC DIRECTION: ${genre} =====
Visual intent: ${genreDirection.visual}
Narrative bias: ${genreDirection.narrative}

===== VISUAL STYLE: ${style} =====
${visualStyle}

===== MOOD/ATMOSPHERE: ${mood} =====
${moodStyle}

===== USER'S CREATIVE VISION =====
${description}

===== TECHNICAL REQUIREMENTS =====
- EXACT 1:1 square aspect ratio (1024x1024)
- Artwork fills 100% of canvas edge-to-edge with NO borders, NO letterboxing, NO grey/black bars
- Ultra high resolution, maximum detail and texture
- NO TEXT, NO TYPOGRAPHY, NO LETTERS - artwork only
- Leave compositional space for text integration (typically lower third)`;

      const pass1Image = await makeImageRequest(pass1Prompt);
      logStep("PASS 1 complete: Cover artwork generated");

      // If no song title, just return the text-free cover
      if (!songTitle) {
        logStep("No song title provided, returning text-free cover");
        imageUrl = pass1Image;
      } else {
        // ===== PASS 2: Analyze cover for text styling =====
        const textStylingAnalysis = await analyzeForTextStyling(pass1Image, textStyleInstructions || undefined);
        logStep("PASS 2 complete: Text styling analyzed");

        // ===== PASS 3: Generate final cover with integrated styled text =====
        logStep("PASS 3: Generating final cover with integrated text");
        
        // Build text style section - user's selected style takes precedence
        const textStyleSection = textStyleInstructions 
          ? `===== MANDATORY TEXT STYLE (USER SELECTED - FOLLOW EXACTLY) =====
The user has explicitly chosen this text style. You MUST create text that matches this description:
"${textStyleInstructions}"

This is NON-NEGOTIABLE. The font style, weight, texture, and effects described above MUST be followed.
Do not deviate from this style. Do not simplify it. Replicate it exactly.

===== COLOR & INTEGRATION ADAPTATION (FROM AI ANALYSIS) =====
Apply these colors and integration details TO the mandatory text style above:
${textStylingAnalysis}`
          : `===== AI-DETERMINED TEXT STYLING (FOLLOW EXACTLY) =====
${textStylingAnalysis}`;

        const pass3Prompt = `SYSTEM ROLE:
You are generating professional, high-end album cover artwork intended for commercial music distribution.
You must recreate the visual aesthetic and scene from the reference while adding perfectly integrated typography.

===== GLOBAL QUALITY LAYER (ALWAYS APPLY) =====
The image must feel cinematic, dramatic, intentional, and polished — never generic, flat, amateur, or stock-like.
The result should look like a finished, high-budget album cover created by an experienced designer.

Always prioritize:
- Strong central or iconographic composition
- Clear focal hierarchy
- Cinematic lighting (backlighting, rim light, directional light, high contrast)
- Realistic materials and textures
- Atmospheric depth (fog, rain, smoke, particles, volumetric lighting)
- Mood-driven color grading
- Album-safe framing
- Strong thumbnail legibility

===== GENRE-SPECIFIC DIRECTION: ${genre} =====
Visual intent: ${genreDirection.visual}
Narrative bias: ${genreDirection.narrative}

===== VISUAL STYLE: ${style} =====
${visualStyle}

===== MOOD/ATMOSPHERE: ${mood} =====
${moodStyle}

===== USER'S CREATIVE VISION =====
${description}

${textStyleSection}

===== TEXT INTEGRATION CONTRACT (MANDATORY) =====
Text must be treated as a physical object inside the scene, not an overlay.

TEXT CONTENT (SPELL EXACTLY - EACH WORD MUST BE SPELLED CORRECTLY):
- Song Title: "${songTitle}" — Display as PRIMARY text, large and prominent
- Artist Name: "${artistName || ''}" — Display SMALLER, positioned below or near title
- Each text element appears ONCE only — no duplication

CRITICAL SPELLING RULES:
- The song title is "${songTitle}" - spell each letter exactly as shown
- The artist name is "${artistName || ''}" - spell each letter exactly as shown
- Double-check every letter before finalizing
- Do not substitute similar-looking characters
- Do not add or remove any letters

FORBIDDEN:
- Flat overlay text
- Poster-style typography  
- Text floating in empty space
- Clean, stamped, or UI-like lettering
- Text unaffected by lighting, weather, or perspective
- Generic white or black text
- Ignoring the user's selected text style

REQUIRED:
- Text must match the user's selected style EXACTLY (font, weight, effects, texture)
- Text must exist as part of the environment
- Text must interact with light, shadow, depth, weather, and motion
- Text must show wear, texture, imperfections, and perspective distortion
- Text must be partially affected by atmosphere (rain, sparks, fog, smoke)
- Text colors must come from the cover's existing color palette
- Text must feel like it was PHOTOGRAPHED in the scene, not added in post-production

===== TEXT CAMERA RULE =====
Camera angle, depth of field, and framing must acknowledge the text as part of the scene.
Text should share perspective distortion and focus falloff with surrounding elements.

===== NEGATIVE CONSTRAINTS =====
Avoid generic AI aesthetics, stock photography composition, flat poster layouts, plastic textures.
Never use plain white, plain black, or generic colored text. Always use styled, integrated typography.
NEVER ignore the user's selected text style.

===== TECHNICAL REQUIREMENTS =====
- EXACT 1:1 square aspect ratio (1024x1024)
- Artwork fills 100% of canvas edge-to-edge with NO borders, NO letterboxing, NO grey/black bars
- Ultra high resolution, maximum detail and texture
- Professional streaming platform quality (Spotify, Apple Music, etc.)`;
        const pass3Image = await makeImageRequest(pass3Prompt);
        logStep("PASS 3 complete: Final integrated cover generated");
        imageUrl = pass3Image;
      }

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
      }

      imageUrl = finalImageUrl;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      if (errorMessage === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "OpenAI API credits exhausted. Please check your API key." }),
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

    logStep("Generation complete (3-pass pipeline)");

    // Deduct credit after successful generation
    if (userId && !hasUnlimitedAccess) {
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
        throw new Error("Failed to deduct credit");
      }

      await supabaseClient.from("credit_transactions").insert({
        user_id: userId,
        amount: -1,
        type: "generation",
        description: `Generated ${genre} cover art`,
      });

      logStep("Credit deducted", { newBalance: currentCredits - 1 });
    }

    // Best-effort: persist generation for history (now includes song_title and artist_name)
    if (userId) {
      try {
        const { error: genInsertErr } = await supabaseClient.from("generations").insert({
          user_id: userId,
          prompt: typeof prompt === "string" ? prompt : "",
          genre: typeof genre === "string" ? genre : "",
          style: typeof style === "string" ? style : "",
          mood: typeof mood === "string" ? mood : "",
          image_url: imageUrl,
          song_title: songTitle || null,
          artist_name: artistName || null,
        });

        if (genInsertErr) {
          logStep("Generation save failed (non-blocking)", { error: genInsertErr.message });
        } else {
          logStep("Generation saved", { songTitle, artistName });
        }
      } catch (e) {
        logStep("Generation save error (non-blocking)", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
