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

    // Helper function to make artwork generation request (no text)
    const makeArtworkRequest = async (promptText: string, maxRetries = 2): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Artwork generation attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

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
            logStep("Artwork request timed out", { attempt });
            if (attempt === maxRetries) throw new Error("Generation timed out. Please try again.");
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("OpenAI API error (artwork)", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
          
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate artwork. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const imageUrl = imageData.b64_json 
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        if (!imageUrl) {
          if (attempt === maxRetries) throw new Error("Failed to generate artwork. Please try again.");
          continue;
        }

        logStep("Artwork generated successfully");
        return imageUrl;
      }
      throw new Error("Failed to generate artwork after retries");
    };

    // Helper function to generate text layer with transparent background
    const makeTextLayerRequest = async (
      songTitle: string,
      artistName: string | null,
      textStyle: string | null,
      genreHint: string,
      moodHint: string,
      maxRetries = 2
    ): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Text layer generation attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        const textLayerPrompt = `Create ONLY typography on a completely transparent background. This is for an album cover.

TEXT CONTENT (SPELL EXACTLY - EACH LETTER MUST BE CORRECT):
- Song Title: "${songTitle}" — Display as PRIMARY text, large and prominent
- Artist Name: "${artistName || ''}" — Display SMALLER, positioned below or near title

${textStyle ? `===== MANDATORY TEXT STYLE (FOLLOW EXACTLY) =====
${textStyle}

You MUST create text that matches this style description exactly. The font style, weight, texture, and effects described above MUST be followed.` : `===== TEXT STYLE GUIDELINES =====
Create professional, album-ready typography that fits a ${genreHint} ${moodHint} aesthetic.
Use bold, impactful fonts with depth and texture.
Add appropriate effects: shadows, glow, metallic shine, distress, or other effects that fit the genre.`}

CRITICAL REQUIREMENTS:
- TRANSPARENT BACKGROUND ONLY - no imagery, no patterns, no colors behind the text
- The text should have depth, dimension, and visual impact
- Include shadows, highlights, and effects that give the text substance
- Text should be centered and well-composed for album cover use
- Ultra high quality, maximum detail on the text itself
- The background MUST be completely transparent (PNG with alpha)

FORBIDDEN:
- Any background color, gradient, or pattern
- Any imagery behind the text
- Plain flat text without effects
- Misspelled words

SPELLING CHECK:
- Song title is "${songTitle}" - verify each letter
- Artist name is "${artistName || ''}" - verify each letter`;

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
              prompt: textLayerPrompt,
              n: 1,
              size: "1024x1024",
              quality: "high",
              background: "transparent",
              output_format: "png",
            }),
            signal: controller.signal,
          });
        } catch (e) {
          clearTimeout(timeout);
          if (e instanceof DOMException && e.name === "AbortError") {
            logStep("Text layer request timed out", { attempt });
            if (attempt === maxRetries) throw new Error("Text generation timed out. Please try again.");
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("OpenAI API error (text layer)", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
          
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate text layer. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const imageUrl = imageData.b64_json 
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        if (!imageUrl) {
          if (attempt === maxRetries) throw new Error("Failed to generate text layer. Please try again.");
          continue;
        }

        logStep("Text layer generated successfully");
        return imageUrl;
      }
      throw new Error("Failed to generate text layer after retries");
    };

    // Helper function to composite two images using Canvas API
    const compositeImages = async (artworkBase64: string, textLayerBase64: string): Promise<string> => {
      logStep("Compositing artwork and text layer");
      
      // For Deno, we need to use a different approach since OffscreenCanvas isn't available
      // We'll return both images and let the client composite them
      // OR use the final pass approach
      
      // Actually, let's use a final compositing pass with gpt-image-1 for best quality
      const compositePrompt = `You are compositing two layers into a final album cover.

LAYER 1 (BACKGROUND): The artwork/background image
LAYER 2 (FOREGROUND): The text overlay with transparent background

Your job is to:
1. Place the text layer EXACTLY as it appears over the artwork
2. Ensure the text integrates naturally with lighting and atmosphere
3. Add subtle interactions: the text should pick up ambient light from the scene
4. Maintain the exact spelling and positioning of the text
5. Do NOT modify the artwork or text - just composite them together with natural integration

OUTPUT: A perfect 1024x1024 album cover with the text integrated into the scene.`;

      // For now, return both images for client-side compositing (faster)
      // The client already has useTextLayerCompositing hook
      return JSON.stringify({
        artworkUrl: artworkBase64,
        textLayerUrl: textLayerBase64,
        needsCompositing: true,
      });
    };

    // ========== PARALLEL GENERATION PIPELINE ==========
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      // Build the artwork prompt (no text)
      const artworkPrompt = `SYSTEM ROLE:
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

      // If no song title, just generate artwork
      if (!songTitle) {
        logStep("No song title provided, generating artwork only");
        const artwork = await makeArtworkRequest(artworkPrompt);
        imageUrl = artwork;
      } else {
        // ===== PARALLEL GENERATION: Artwork + Text Layer simultaneously =====
        logStep("Starting PARALLEL generation: Artwork + Text Layer");
        const startTime = Date.now();

        const [artworkResult, textLayerResult] = await Promise.all([
          makeArtworkRequest(artworkPrompt),
          makeTextLayerRequest(songTitle, artistName, textStyleInstructions, genre, mood),
        ]);

        const parallelTime = Date.now() - startTime;
        logStep("PARALLEL generation complete", { timeMs: parallelTime });

        // Return both images for client-side compositing
        // This is faster than server-side compositing and uses the existing hook
        imageUrl = JSON.stringify({
          artworkUrl: artworkResult,
          textLayerUrl: textLayerResult,
          needsCompositing: true,
        });
      }

      // Upload to storage (background task for speed)
      finalImageUrl = imageUrl;
      
      // Check if it's a composite result or single image
      const isCompositeResult = imageUrl.startsWith("{") && imageUrl.includes("needsCompositing");
      
      if (!isCompositeResult && imageUrl.startsWith("data:image")) {
        // Single image - upload normally
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
      } else if (isCompositeResult) {
        // Composite result - upload both images in background
        const compositeData = JSON.parse(imageUrl);
        
        // Use EdgeRuntime.waitUntil for background upload
        const uploadBothImages = async () => {
          try {
            const artworkBase64 = compositeData.artworkUrl.split(",")[1];
            const textBase64 = compositeData.textLayerUrl.split(",")[1];
            
            const timestamp = Date.now();
            const artworkFileName = `${userId || "anon"}/${timestamp}-artwork.png`;
            const textFileName = `${userId || "anon"}/${timestamp}-text.png`;

            const artworkBytes = Uint8Array.from(atob(artworkBase64), c => c.charCodeAt(0));
            const textBytes = Uint8Array.from(atob(textBase64), c => c.charCodeAt(0));

            await Promise.all([
              supabaseClient.storage.from("covers").upload(artworkFileName, artworkBytes, { contentType: "image/png", upsert: true }),
              supabaseClient.storage.from("covers").upload(textFileName, textBytes, { contentType: "image/png", upsert: true }),
            ]);

            const { data: artworkUrl } = supabaseClient.storage.from("covers").getPublicUrl(artworkFileName);
            const { data: textUrl } = supabaseClient.storage.from("covers").getPublicUrl(textFileName);

            logStep("Both images uploaded to storage", { artworkUrl: artworkUrl.publicUrl, textUrl: textUrl.publicUrl });
          } catch (e) {
            logStep("Background upload error", { error: e instanceof Error ? e.message : String(e) });
          }
        };

        // Start background upload without awaiting
        uploadBothImages().catch(e => logStep("Background upload failed", { error: e }));
      }
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

    logStep("Generation complete (parallel pipeline)");

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

    // Parse the result to determine response format
    const isCompositeResult = imageUrl.startsWith("{") && imageUrl.includes("needsCompositing");
    
    if (isCompositeResult) {
      const compositeData = JSON.parse(imageUrl);
      
      // Best-effort: persist generation for history
      if (userId) {
        try {
          const { error: genInsertErr } = await supabaseClient.from("generations").insert({
            user_id: userId,
            prompt: typeof prompt === "string" ? prompt : "",
            genre: typeof genre === "string" ? genre : "",
            style: typeof style === "string" ? style : "",
            mood: typeof mood === "string" ? mood : "",
            image_url: compositeData.artworkUrl.slice(0, 100) + "...", // Truncate for storage
            song_title: songTitle || null,
            artist_name: artistName || null,
            cover_analysis: null,
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

      return new Response(JSON.stringify({
        artworkUrl: compositeData.artworkUrl,
        textLayerUrl: compositeData.textLayerUrl,
        needsCompositing: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Single image result (no text)
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
            cover_analysis: null,
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
    }
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
