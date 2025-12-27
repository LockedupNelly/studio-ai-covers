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

    // Build prompt for OpenAI gpt-image-1 using comprehensive system
    const buildPrompt = (): string => {
      // Genre-specific visual bias
      const genreBias: Record<string, string> = {
        "Hip-Hop": "Gritty cinematic realism, urban tone, bold presence, dramatic lighting, high contrast.",
        "Rap": "Gritty cinematic realism, urban tone, bold presence, dramatic lighting, high contrast.",
        "Pop": "Clean, polished, vibrant, modern aesthetic, visually striking, high clarity.",
        "EDM": "Energetic, futuristic, neon accents, motion, light trails, high saturation.",
        "R&B": "Moody, sensual, cinematic, smooth lighting, emotional depth, rich shadows.",
        "Rock": "Raw, dramatic, bold lighting, gritty textures, high contrast.",
        "Alternative": "Experimental, artistic, atmospheric, non-traditional composition.",
        "Indie": "Intimate, cinematic, emotional, natural lighting, artistic restraint.",
        "Metal": "Dark fantasy, aggressive, ominous, epic scale, dramatic lighting, heavy textures.",
        "Country": "Grounded, warm cinematic realism, rustic textures, emotional storytelling.",
        "Jazz": "Moody, elegant, low-key lighting, cinematic noir aesthetic.",
        "Classical": "Refined, timeless, elegant, painterly lighting, dramatic composition.",
      };

      // Visual style modifiers
      const styleModifiers: Record<string, string> = {
        "Realism": "Photorealistic, cinematic realism, natural lighting, realistic materials.",
        "3D Render": "Ultra-detailed 3D render, realistic materials, cinematic lighting, high realism.",
        "Illustration": "Detailed illustration, painterly textures, controlled lighting, artistic clarity.",
        "Anime": "Cinematic anime aesthetic, dramatic lighting, depth of field, expressive motion.",
        "Fine Art": "Gallery-quality fine art, painterly lighting, dramatic composition.",
        "Abstract": "Abstract composition, symbolic imagery, expressive color and form.",
        "Minimalist": "Minimal composition, strong negative space, bold focal point.",
        "Cinematic": "Film still aesthetic, dramatic lighting, depth, motion, atmosphere.",
        "Retro": "Retro-inspired color grading, vintage textures, nostalgic lighting.",
      };

      // Mood modifiers
      const moodModifiers: Record<string, string> = {
        "Aggressive": "Intense, forceful, sharp lighting, high contrast.",
        "Dark": "Dark, moody, ominous, low-key lighting, dramatic shadows.",
        "Mysterious": "Atmospheric, foggy, restrained lighting, subtle tension.",
        "Euphoric": "Uplifting, energetic, glowing highlights, dynamic motion.",
        "Uplifting": "Hopeful, bright accents, emotional warmth.",
        "Melancholic": "Somber, emotional, muted tones, soft lighting.",
        "Romantic": "Warm, intimate, soft highlights, emotional closeness.",
        "Peaceful": "Calm, balanced, gentle lighting, minimal contrast.",
        "Intense": "High tension, dramatic lighting, strong contrast.",
        "Nostalgic": "Nostalgic tone, soft contrast, film-like color grading.",
      };

      const genreStyle = genreBias[genre] || "Cinematic realism, dramatic lighting, professional quality.";
      const visualStyle = styleModifiers[style] || "Photorealistic, cinematic lighting, high detail.";
      const moodStyle = moodModifiers[mood] || "Dramatic, atmospheric, emotionally evocative.";

      // Typography section (only if song title present)
      let typographySection = '';
      if (songTitle) {
        typographySection = `

TYPOGRAPHY RULES (CRITICAL - SPELL EXACTLY AS SHOWN):
- Song Title: "${songTitle}" — Display as the PRIMARY text element, large and prominent
- Artist Name: "${artistName || ''}" — Display SMALLER, below or near the title
${textStyleInstructions ? `- Text Style Reference: ${textStyleInstructions}` : '- Text Style: Prefer engraved, carved, metallic, embossed, painted, neon, or physically embedded lettering'}
- Typography must be integrated naturally into the environment — NOT flat poster-style overlays
- Text should feel like it exists inside the world, not added afterward
- Maintain legibility while preserving realism and atmosphere
- SPELL THE TEXT EXACTLY AS PROVIDED — do not change, add, or omit any characters
- Each text element appears ONCE only — no duplication`;
      }

      // Build the complete prompt
      return `SYSTEM: You are generating professional, high-end album cover artwork intended for commercial music distribution on streaming platforms.

GLOBAL QUALITY RULES:
The image must feel cinematic, dramatic, intentional, and polished — never generic, flat, amateur, or illustrative. The result should look like a finished, high-budget album cover created by an experienced designer.

Always prioritize:
- Strong central or iconographic composition suitable for album covers
- Clear focal hierarchy
- Cinematic lighting (backlighting, rim light, directional light, high contrast)
- Realistic materials and textures (stone, metal, fabric, skin, surfaces)
- Atmospheric depth (fog, rain, smoke, particles, volumetric lighting)
- Mood-driven color grading
- Album-safe framing (important elements not cropped at edges)
- Thumbnail legibility at small sizes

Use cinematic camera angles and depth of field where appropriate. The final image should feel intentional, dramatic, and professionally art-directed.
${typographySection}

GENRE VISUAL DIRECTION (${genre}):
${genreStyle}

VISUAL STYLE (${style}):
${visualStyle}

MOOD/ATMOSPHERE (${mood}):
${moodStyle}

USER'S CREATIVE VISION:
${description}

TECHNICAL REQUIREMENTS:
- EXACT 1:1 square aspect ratio (1024x1024)
- Artwork fills 100% of canvas edge-to-edge with NO borders, NO letterboxing, NO grey/black bars
- Ultra high resolution, maximum detail and texture
- Professional streaming platform quality (Spotify, Apple Music, etc.)`;
    };

    const promptText = buildPrompt();
    logStep("Built prompt", { length: promptText.length, preview: promptText.slice(0, 200) });

    // Make the generation request with OpenAI gpt-image-1
    const makeImageRequest = async (maxRetries = 2): Promise<string> => {
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
          
          // Check for content policy violation
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        logStep("OpenAI response received", { hasData: !!data?.data?.[0] });
        
        // OpenAI returns b64_json by default, or url
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate image. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // gpt-image-1 returns base64 by default
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

    // Generate the image
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      imageUrl = await makeImageRequest();

      // Upload base64 image to storage for better performance + stable URLs
      finalImageUrl = imageUrl;
      if (imageUrl.startsWith("data:image")) {
        try {
          const base64Data = imageUrl.split(",")[1];
          const mimeMatch = imageUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
          const extension = mimeType.split("/")[1] || "png";
          const fileName = `${userId || "anon"}/${Date.now()}.${extension}`;

          // Convert base64 to Uint8Array
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

    logStep("Generation complete");

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

    // Best-effort: persist generation for history (do not fail the request if DB write is slow)
    if (userId) {
      try {
        const { error: genInsertErr } = await supabaseClient.from("generations").insert({
          user_id: userId,
          prompt: typeof prompt === "string" ? prompt : "",
          genre: typeof genre === "string" ? genre : "",
          style: typeof style === "string" ? style : "",
          mood: typeof mood === "string" ? mood : "",
          image_url: imageUrl,
        });

        if (genInsertErr) {
          logStep("Generation save failed (non-blocking)", { error: genInsertErr.message });
        } else {
          logStep("Generation saved");
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
