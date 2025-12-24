import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        // Credits are deducted AFTER a successful generation.
        // This prevents users from losing credits when the AI request fails or times out.
        if (!hasUnlimitedAccess) {
          logStep("Credits will be deducted after generation (not upfront)");
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    logStep("Generating cover art");

    let requestBody: any;

    // Extract song title and artist name from the prompt for strict enforcement
    const songTitleMatch = prompt.match(/Song Title:\s*([^|]+)/i);
    const artistNameMatch = prompt.match(/Artist:\s*([^|]+)/i);
    const actualSongTitle = songTitleMatch ? songTitleMatch[1].trim() : null;
    const actualArtistName = artistNameMatch ? artistNameMatch[1].trim() : null;
    
    logStep("Extracted text from prompt", { songTitle: actualSongTitle, artistName: actualArtistName });

    // Build the critical text instruction that will be added to ALL prompts
    const textEnforcementRule = actualSongTitle 
      ? `

=== ABSOLUTE CRITICAL RULE - TEXT CONTENT ===
The song title on the cover MUST be EXACTLY: "${actualSongTitle}"
The artist name on the cover MUST be EXACTLY: "${actualArtistName || 'as specified'}"

FORBIDDEN: NEVER write "Song Title" as literal text. NEVER use placeholder text.
The ONLY text that should appear is the EXACT song title and artist name provided above.
If you write "Song Title" literally instead of "${actualSongTitle}", the output is REJECTED.
===`
      : "";

    // Build the fill-canvas rule - CRITICAL for no borders + high quality
    const fillCanvasRule = `

=== ABSOLUTE CANVAS FILL REQUIREMENT (CRITICAL - FAILURE = REJECTION) ===
The artwork MUST completely fill the ENTIRE 3000x3000 pixel canvas with ZERO exceptions.
ZERO empty space. ZERO borders. ZERO margins. ZERO padding. ZERO letterboxing.
NO black borders. NO white borders. NO grey borders. NO empty corners.
The visual content (background, artwork, textures) MUST extend COMPLETELY edge-to-edge on ALL FOUR sides.
Every single pixel along every edge MUST contain artwork - NOT empty/black/white/grey background.
The background must BLEED FULLY OFF all four edges with NO visible boundary.
If ANY pixel along ANY edge is empty, solid black, solid white, solid grey, or any uniform padding color, the output is IMMEDIATELY REJECTED.

=== QUALITY & RESOLUTION REQUIREMENT ===
Generate at the HIGHEST possible detail and sharpness.
The output must be print-ready, ultra-crisp, with no blur, no noise, no compression artifacts.
Render all textures, lighting, and details at maximum fidelity as if for a gallery print.
===`;

    if (referenceImage) {
      // Image editing mode - use the reference image (user uploaded photo)
      logStep("Using reference image for editing");
      
      const contentParts: any[] = [
        { type: "text", text: `You are a world-class album cover designer. Edit this image to create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

Keep the main subject/person from the original image but transform it according to these instructions:
${prompt}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
${textEnforcementRule}
${fillCanvasRule}

CRITICAL REQUIREMENTS:
1. Output resolution MUST be exactly 3000x3000 pixels - PERFECTLY SQUARE
2. Preserve the likeness and key features of the person/subject in the original image
3. The text (song title and artist name) must be DEEPLY INTEGRATED into the artwork - not just placed on top
4. ALL text must be FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF AT ANY EDGE - maintain at least 15% margin from all edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements
7. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.` },
        { type: "image_url", image_url: { url: referenceImage } }
      ];

      // If there's a text style reference, include it for the AI to match
      if (textStyleReferenceImage) {
        contentParts[0] = { 
          type: "text", 
          text: `You are a world-class album cover designer. Edit this image to create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

Keep the main subject/person from the original image but transform it.

${prompt}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
${textEnforcementRule}
${fillCanvasRule}

=== CRITICAL: TEXT STYLE REPLICATION (ABSOLUTE PRIORITY) ===
The SECOND reference image shows the EXACT and ONLY text style you MUST replicate for the SONG TITLE.

MANDATORY RULES - READ CAREFULLY:
1. ONLY use the text style shown in the provided reference image - NO OTHER STYLES
2. DO NOT mix, blend, or incorporate elements from any other text styles
3. DO NOT add smoke effects unless the reference specifically shows smoke
4. DO NOT add glow effects unless the reference specifically shows glow
5. DO NOT add distortion unless the reference specifically shows distortion
6. MATCH THE EXACT VISUAL TREATMENT: letterforms, colors, textures, effects - EXACTLY as shown

WHAT TO REPLICATE FROM THE REFERENCE:
- The exact font style/weight
- The exact color palette
- The exact effects (only if present in reference)
- The exact texture treatment
- The exact artistic technique

STRICT PROHIBITIONS:
- NEVER add effects not present in the reference image
- NEVER write "Song Title" literally - use the ACTUAL song title from the prompt
- NEVER use generic or cheap fonts
- NEVER make the text look overlaid - it must be INTEGRATED
- NEVER add cracks, distressed textures, grunge, chips, or "broken" lettering unless the reference text style clearly contains them

ADDITIONAL REQUIREMENTS:
1. Output resolution MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE - not landscape, not portrait)
2. Preserve the likeness of the person/subject from the first image
3. PHOTOREALISTIC quality throughout
4. Create a COMPLEMENTARY but simpler style for the artist name
5. NO BORDERS - artwork must extend to every edge
6. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
7. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`
        };
        contentParts.push({ type: "image_url", image_url: { url: textStyleReferenceImage } });
        logStep("Added text style reference image");
      }

      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        modalities: ["image", "text"],
      };
    } else if (textStyleReferenceImage) {
      // Text generation with style reference - AI sees the style to match
      logStep("Using text style reference image for generation");
      
      const stylePrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (MUST BE PERFECTLY SQUARE - 1:1 aspect ratio).

USER REQUEST:
${prompt}

MUSIC CONTEXT:
- Genre: ${genre}
- Visual Style: ${style}
- Mood/Vibe: ${mood}
${textEnforcementRule}
${fillCanvasRule}

=== CRITICAL: TEXT STYLE REPLICATION (ABSOLUTE PRIORITY) ===
The attached reference image shows the EXACT and ONLY text style you MUST replicate for the SONG TITLE.

MANDATORY RULES - READ CAREFULLY:
1. ONLY use the text style shown in the provided reference image - NO OTHER STYLES
2. DO NOT mix, blend, or incorporate elements from any other text styles
3. DO NOT add smoke effects unless the reference SPECIFICALLY shows smoke
4. DO NOT add glow effects unless the reference SPECIFICALLY shows glow
5. DO NOT add distortion unless the reference SPECIFICALLY shows distortion
6. DO NOT add any visual effects not clearly present in the reference
7. MATCH THE EXACT VISUAL TREATMENT: letterforms, colors, textures, effects - EXACTLY as shown

WHAT TO REPLICATE FROM THE REFERENCE:
- The exact font style and weight
- The exact color palette used
- The exact effects (ONLY if present in reference)
- The exact texture treatment
- The exact artistic technique shown

STRICT PROHIBITIONS:
- NEVER add effects not present in the reference image
- NEVER write "Song Title" literally - use the ACTUAL song title from the prompt
- NEVER use generic, cheap, or basic grunge/distressed fonts
- NEVER make the text look overlaid or pasted - it must be INTEGRATED into the artwork
- NEVER interpret the style - COPY it exactly
- NEVER add cracks, distressed textures, grunge, chips, or "broken" lettering unless the reference text style clearly contains them

QUALITY REQUIREMENTS:
1. Output MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE)
2. PHOTOREALISTIC quality - this should look like a real professional album cover
3. Spend extra effort perfecting the REALISM and DETAIL of all elements
4. The artwork should be gallery-worthy, not AI-generated looking
5. Text must be deeply integrated into the scene
6. Create a COMPLEMENTARY but simpler style for the artist name
7. NO BORDERS - artwork must extend to every edge
8. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
9. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`;

      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: stylePrompt },
              { type: "image_url", image_url: { url: textStyleReferenceImage } }
            ],
          },
        ],
        modalities: ["image", "text"],
      };
    } else {
      // Text-only generation mode (no reference images)
      const enhancedPrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (MUST BE PERFECTLY SQUARE - 1:1 aspect ratio).

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
Subject: ${prompt}
${textEnforcementRule}
${fillCanvasRule}

CRITICAL REQUIREMENTS:
1. Output MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE - not landscape, not portrait)
2. Text (song title and artist name) must be DEEPLY INTEGRATED into the artwork, not just overlaid
3. NO BORDERS - artwork must extend to every edge
4. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements
7. The image should be bold, memorable, and capture the essence of ${genre} music with a ${mood?.toLowerCase() || 'dynamic'} atmosphere
8. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`;

      requestBody = {
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        modalities: ["image", "text"],
      };
    }

    const controller = new AbortController();
    const timeoutMs = 55_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        logStep("AI request timed out", { timeoutMs });
        return new Response(
          JSON.stringify({ error: "Generation timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logStep("AI gateway error", { status: response.status, error: errorText });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    logStep("AI response received");

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      logStep("No image in response", { data: JSON.stringify(data) });
      throw new Error("No image generated");
    }

    logStep("Pass 1 complete - initial cover generated");

    // === PASS 2: TEXT INTEGRATION POLISH ===
    // Run a second AI call to improve how the text integrates with the artwork
    logStep("Starting Pass 2 - Text integration polish");
    
    const textPolishPrompt = `You are a professional graphic designer reviewing an album cover. Your ONLY task is to improve how the text integrates with the artwork.

The song title is: "${actualSongTitle || 'as shown'}"
The artist name is: "${actualArtistName || 'as shown'}"

=== YOUR MISSION ===
Make the text look like it was DESIGNED WITH the artwork, not placed ON TOP.

=== IMPROVEMENTS TO MAKE ===
1. Add subtle shadows behind text that match the scene's lighting direction
2. Blend text edges naturally into the background where appropriate
3. Ensure text colors complement and integrate with the artwork's palette
4. Add subtle texture or environmental effects to the text (matching the scene - like slight dust, light leaks, atmospheric haze)
5. Make sure text has proper depth - it should feel part of the scene, not floating above it
6. If the scene has light sources, ensure text reacts to them subtly

=== STRICT RULES ===
- DO NOT change the background artwork or composition AT ALL
- DO NOT change the position of the text
- DO NOT change what the text says - keep the EXACT same text content
- DO NOT add new text elements
- DO NOT crop or resize the image
- Keep the EXACT same 3000x3000 pixel dimensions
- The text must remain fully legible and visible
- Output must extend edge-to-edge with NO borders

=== QUALITY ===
Output at maximum quality, 3000x3000 pixels, ultra-crisp, print-ready.`;

    const polishRequestBody = {
      model: "google/gemini-2.5-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPolishPrompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ],
        },
      ],
      modalities: ["image", "text"],
    };

    const polishController = new AbortController();
    const polishTimeoutMs = 45_000;
    const polishTimeout = setTimeout(() => polishController.abort(), polishTimeoutMs);

    let polishedImageUrl = imageUrl; // Fallback to original if polish fails

    try {
      const polishResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(polishRequestBody),
        signal: polishController.signal,
      });

      clearTimeout(polishTimeout);

      if (polishResponse.ok) {
        const polishData = await polishResponse.json();
        const polishedUrl = polishData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (polishedUrl) {
          polishedImageUrl = polishedUrl;
          logStep("Pass 2 complete - text integration polished successfully");
        } else {
          logStep("Pass 2 - No polished image returned, using original");
        }
      } else {
        const polishError = await polishResponse.text();
        logStep("Pass 2 failed, using original image", { status: polishResponse.status, error: polishError });
      }
    } catch (polishError) {
      clearTimeout(polishTimeout);
      if (polishError instanceof DOMException && polishError.name === "AbortError") {
        logStep("Pass 2 timed out, using original image");
      } else {
        logStep("Pass 2 error, using original image", { error: polishError instanceof Error ? polishError.message : String(polishError) });
      }
    }

    logStep("Cover generation complete", { usedPolishedVersion: polishedImageUrl !== imageUrl });

    // Deduct 1 credit only after we have a generated image (prevents accidental credit loss).
    if (userId && !hasUnlimitedAccess) {
      const { data: creditsData, error: creditsError } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching credits (post-generation)", { error: creditsError.message });
        throw new Error("Failed to check credits");
      }

      const currentCredits = creditsData?.credits ?? 0;
      logStep("Current credits (post-generation)", { credits: currentCredits });

      if (currentCredits < 1) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({ credits: currentCredits - 1 })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error deducting credit (post-generation)", { error: updateError.message });
        throw new Error("Failed to deduct credit");
      }

      await supabaseClient.from("credit_transactions").insert({
        user_id: userId,
        amount: -1,
        type: "generation",
        description: `Generated ${genre} cover art`,
      });

      logStep("Credit deducted (post-generation)", { newBalance: currentCredits - 1 });
    }

    return new Response(
      JSON.stringify({ imageUrl: polishedImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});