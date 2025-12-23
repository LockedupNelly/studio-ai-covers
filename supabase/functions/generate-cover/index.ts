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

CRITICAL REQUIREMENTS:
1. Output resolution MUST be exactly 3000x3000 pixels
2. Preserve the likeness and key features of the person/subject in the original image
3. The text (song title and artist name) must be DEEPLY INTEGRATED into the artwork - not just placed on top
4. ALL text must be FULLY VISIBLE with at least 10% margin from all edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements

The final image should have a subtle 1-2px light grey border around the cover.` },
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

=== ABSOLUTE PRIORITY: TEXT STYLE REPLICATION ===
The SECOND reference image shows the EXACT text style you MUST replicate for the SONG TITLE. This is the #1 priority.

MANDATORY TEXT STYLE REQUIREMENTS:
1. Study the second reference image carefully - it shows a specific artistic text treatment
2. PERFECTLY REPLICATE the exact same visual effect for the song title:
   - Same smoke/glow/distortion/brush effects
   - Same color tones and gradients
   - Same texture and imperfections
   - Same letterform style and weight
   - Same artistic technique (smoke, neon, 3D, grunge, etc.)
3. The song title text should look IDENTICAL in style to the reference - as if made by the same artist
4. Create a COMPLEMENTARY but simpler style for the artist name that pairs well

CRITICAL DO NOTs:
- NEVER write "Song Title" literally - use the ACTUAL song title from the prompt above
- NEVER use generic fonts or cheap-looking text like basic grunge or distressed fonts
- NEVER ignore the reference style - it's the most important element
- NEVER make the text look overlaid or pasted on - it must be INTEGRATED

CRITICAL REQUIREMENTS:
1. Output resolution MUST be exactly 3000x3000 pixels
2. Preserve the likeness of the person/subject from the first image
3. PHOTOREALISTIC quality throughout
4. Add a subtle 1-2px light grey border around the final cover

The final result should be indistinguishable from a cover designed by a top music industry graphic designer.`
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
      
      const stylePrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

USER REQUEST:
${prompt}

MUSIC CONTEXT:
- Genre: ${genre}
- Visual Style: ${style}
- Mood/Vibe: ${mood}

=== ABSOLUTE PRIORITY: TEXT STYLE REPLICATION ===
The attached reference image shows the EXACT text style you MUST replicate for the SONG TITLE. This is the #1 priority.

MANDATORY TEXT STYLE REQUIREMENTS:
1. Study the reference image carefully - it shows a specific artistic text treatment
2. PERFECTLY REPLICATE the exact same visual effect for the song title:
   - Same smoke/glow/distortion/brush effects
   - Same color tones and gradients
   - Same texture and imperfections
   - Same letterform style and weight
   - Same artistic technique (smoke, neon, 3D, grunge, etc.)
3. The song title text should look IDENTICAL in style to the reference - as if made by the same artist
4. Create a COMPLEMENTARY but simpler style for the artist name that pairs well

CRITICAL DO NOTs:
- NEVER write "Song Title" literally - use the ACTUAL song title from the prompt above
- NEVER use generic fonts or cheap-looking text like basic grunge, distressed, or scratchy fonts
- NEVER ignore the reference style - it's the most important element
- NEVER make the text look overlaid or pasted on - it must be INTEGRATED into the artwork

QUALITY REQUIREMENTS:
1. Ultra-high resolution 3000x3000 pixels
2. PHOTOREALISTIC quality - this should look like a real professional album cover
3. Spend extra effort perfecting the REALISM and DETAIL of all elements
4. The artwork should be gallery-worthy, not AI-generated looking
5. Text must be deeply integrated into the scene, not floating on top
6. Add a subtle 1-2px light grey border around the final cover

The final result should be indistinguishable from a cover designed by a top music industry graphic designer.`;

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
      const enhancedPrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
Subject: ${prompt}

CRITICAL REQUIREMENTS:
1. Output resolution MUST be exactly 3000x3000 pixels
2. Text (song title and artist name) must be DEEPLY INTEGRATED into the artwork, not just overlaid
3. Add a subtle 1-2px light grey border around the final cover
4. ALL text must be FULLY VISIBLE with at least 10% margin from edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements
7. The image should be bold, memorable, and capture the essence of ${genre} music with a ${mood?.toLowerCase() || 'dynamic'} atmosphere

The final result should be indistinguishable from a cover designed by a top music industry graphic designer.`;

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

    logStep("Cover generated successfully");

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
      JSON.stringify({ imageUrl }),
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