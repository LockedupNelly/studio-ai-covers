import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const validateTextStyleMatch = async ({
  lovableKey,
  generatedImageUrl,
  styleReferenceUrl,
}: {
  lovableKey: string;
  generatedImageUrl: string;
  styleReferenceUrl: string;
}): Promise<"MATCH" | "MISMATCH" | "UNAVAILABLE"> => {
  // More lenient vision check - focus on typography characteristics, allow partial matches
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a lenient visual QA checker for album cover typography. You should answer MATCH if the generated cover shows a similar typography STYLE (e.g., neon glow, grunge, retro, etc.) to the reference - it does NOT need to be pixel-perfect. Only answer MISMATCH if the typography style is completely different (e.g., reference shows neon glow but generated shows plain sans-serif). Answer with exactly one word: MATCH or MISMATCH.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Compare Image A (style reference) vs Image B (generated cover). Does the TEXT/TYPOGRAPHY in the generated cover capture the GENERAL STYLE CHARACTERISTICS (e.g., glow effects, texture, 3D effects, retro feel, grunge look) of the reference? Be lenient - if the style is in the same family/category, answer MATCH. Only answer MISMATCH if completely different style families. Ignore background artwork differences.",
              },
              { type: "image_url", image_url: { url: styleReferenceUrl } },
              { type: "image_url", image_url: { url: generatedImageUrl } },
            ],
          },
        ],
        max_tokens: 10,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      logStep("Style validation unavailable", { status: resp.status, error: t });
      return "UNAVAILABLE";
    }

    const data = await resp.json();
    const content = (data?.choices?.[0]?.message?.content ?? "")
      .toString()
      .trim()
      .toUpperCase();

    if (content.includes("MISMATCH")) return "MISMATCH";
    if (content.includes("MATCH")) return "MATCH";
    return "UNAVAILABLE";
  } catch (e) {
    logStep("Style validation error", { error: e instanceof Error ? e.message : String(e) });
    return "UNAVAILABLE";
  }
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Build concise prompt - trust the model, give clear instructions
    const buildPrompt = (hasRefImage: boolean, hasStyleRef: boolean): string => {
      const textBlock = songTitle ? `
TEXT (spell exactly):
- Song title: "${songTitle}"
- Artist: "${artistName || ''}"
${textStyleInstructions ? `- Style: ${textStyleInstructions}` : ''}
${hasStyleRef ? '- Match the text style from the reference image EXACTLY' : '- Use modern, premium typography (2024 style)'}
- Place text in clear space for readability, 15% margin from edges` : '';

      const base = `Create album cover art. CRITICAL: Output must be EXACTLY 1:1 square aspect ratio (1024x1024). The artwork MUST fill the entire canvas edge-to-edge with NO borders, NO letterboxing, NO grey/black bars on any side.

SCENE: ${description}
GENRE: ${genre} | STYLE: ${style} | MOOD: ${mood}
${textBlock}

Requirements:
- SQUARE 1:1 aspect ratio, artwork fills 100% of canvas
- NO empty space, NO padding, NO borders, NO letterboxing
- Photorealistic, gallery-quality
- Artwork extends to all four edges with no margins
- Text integrated naturally into the scene`;

      if (hasRefImage) {
        return `Edit this photo into album cover art. Keep the subject's likeness.

${base}`;
      }
      
      return base;
    };

    // Build request body based on inputs
    let requestBody: any;
    const promptText = buildPrompt(!!referenceImage, !!textStyleReferenceImage);
    
    logStep("Built prompt", { length: promptText.length, preview: promptText.slice(0, 200) });

    if (referenceImage && textStyleReferenceImage) {
      // Both reference image and text style reference
      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: referenceImage } },
            { type: "image_url", image_url: { url: textStyleReferenceImage } }
          ]
        }],
        modalities: ["image", "text"]
      };
    } else if (referenceImage) {
      // Only reference image (photo to edit)
      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: referenceImage } }
          ]
        }],
        modalities: ["image", "text"]
      };
    } else if (textStyleReferenceImage) {
      // Only text style reference
      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: textStyleReferenceImage } }
          ]
        }],
        modalities: ["image", "text"]
      };
    } else {
      // Text-only generation
      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{
          role: "user",
          content: [{ type: "text", text: promptText }]
        }],
        modalities: ["image", "text"]
      };
    }

    // Make the generation request with retry logic
    const makeImageRequest = async (body: any, maxRetries = 2): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Generation attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);

        let response: Response;
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
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
          logStep("AI gateway error", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402) throw new Error("CREDITS_EXHAUSTED");
          if (attempt === maxRetries) throw new Error(`AI gateway error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        logStep("Full response structure", {
          topLevelKeys: Object.keys(data ?? {}),
          hasChoices: !!data?.choices,
          choicesLength: data?.choices?.length,
        });
        
        const msg = data.choices?.[0]?.message;
        
        // Log message structure for debugging
        if (msg) {
          logStep("Message structure", {
            messageKeys: Object.keys(msg),
            hasImages: !!msg.images,
            imagesLength: msg.images?.length,
            contentType: typeof msg.content,
            contentPreview: typeof msg.content === "string" ? msg.content.slice(0, 500) : JSON.stringify(msg.content)?.slice(0, 500),
          });
        }
        
        // Try multiple locations for the image
        let imageUrl = msg?.images?.[0]?.image_url?.url;
        
        // Fallback: check top-level data.images
        if (!imageUrl && data.images?.[0]?.image_url?.url) {
          imageUrl = data.images[0].image_url.url;
          logStep("Found image in top-level data.images");
        }
        
        // Fallback: check if content contains base64 image data
        if (!imageUrl && typeof msg?.content === "string" && msg.content.startsWith("data:image")) {
          imageUrl = msg.content;
          logStep("Found base64 image in message.content");
        }
        
        if (!imageUrl) {
          // Check for content moderation / refusal
          const contentText = typeof msg?.content === "string" ? msg.content : "";
          const isModerated = contentText.toLowerCase().includes("cannot") || 
                              contentText.toLowerCase().includes("unable to generate") ||
                              contentText.toLowerCase().includes("policy") ||
                              contentText.toLowerCase().includes("harmful") ||
                              contentText.toLowerCase().includes("inappropriate");
          
          logStep("No image found", {
            attempt,
            isModerated,
            messageContent: contentText.slice(0, 500),
            fullDataPreview: JSON.stringify(data).slice(0, 1000),
          });
          
          if (isModerated) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error("Failed to generate image. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        logStep("Image generated successfully", { urlPrefix: imageUrl.slice(0, 50) });
        return imageUrl;
      }
      throw new Error("Failed to generate image after retries");
    };

    // Generate the image (and enforce text style when a reference is provided)
    let imageUrl: string;
    let finalImageUrl: string;

    const maxStyleRetries = textStyleReferenceImage ? 3 : 1;
    let skipCreditCharge = false;

    try {
      let lastValidationResult: "MATCH" | "MISMATCH" | "UNAVAILABLE" | null = null;

      for (let attempt = 1; attempt <= maxStyleRetries; attempt++) {
        logStep("Generate flow", { attempt, maxStyleRetries, hasStyleRef: !!textStyleReferenceImage });

        imageUrl = await makeImageRequest(requestBody);

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

        // If a text style reference was selected, enforce it via vision validation.
        // If validation is temporarily unavailable, return the image but do NOT charge credits.
        if (textStyleReferenceImage) {
          const validation = await validateTextStyleMatch({
            lovableKey: LOVABLE_API_KEY,
            generatedImageUrl: finalImageUrl,
            styleReferenceUrl: textStyleReferenceImage,
          });

          lastValidationResult = validation;
          logStep("Text style validation", { attempt, validation });

          if (validation === "MISMATCH") {
            continue;
          }

          if (validation === "UNAVAILABLE") {
            skipCreditCharge = true;
            break;
          }
        }

        // Passed validation (or no style ref)
        break;
      }

      // If style validation failed after all retries, still return the image but with a warning
      // and skip credit charge so user isn't penalized
      if (textStyleReferenceImage && lastValidationResult === "MISMATCH") {
        skipCreditCharge = true;
        logStep("Style mismatch after retries - returning image with warning, no charge");
      }

      imageUrl = finalImageUrl!;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      if (errorMessage === "TEXT_STYLE_NOT_APPLIED") {
        return new Response(
          JSON.stringify({
            error:
              "The selected text style did not apply reliably. Please try again (you were not charged a credit).",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (errorMessage === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
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
    if (userId && !hasUnlimitedAccess && !skipCreditCharge) {
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

    // Include warning if style didn't match but we're still returning the image
    const responsePayload: { imageUrl: string; warning?: string } = { imageUrl };
    if (textStyleReferenceImage && skipCreditCharge) {
      responsePayload.warning = "TEXT_STYLE_MISMATCH";
    }

    return new Response(JSON.stringify(responsePayload), {
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
