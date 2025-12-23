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

        // Check and deduct credits if not unlimited
        if (!hasUnlimitedAccess) {
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
          logStep("Current credits", { credits: currentCredits });

          if (currentCredits < 1) {
            return new Response(
              JSON.stringify({ error: "No credits remaining. Please purchase more credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Deduct 1 credit
          if (creditsData) {
            const { error: updateError } = await supabaseClient
              .from("user_credits")
              .update({ credits: currentCredits - 1 })
              .eq("user_id", userId);

            if (updateError) {
              logStep("Error deducting credit", { error: updateError.message });
              throw new Error("Failed to deduct credit");
            }
          } else {
            // User has no credits record, create one with -1 (shouldn't happen normally)
            return new Response(
              JSON.stringify({ error: "No credits available. Please purchase credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Log the transaction
          await supabaseClient.from("credit_transactions").insert({
            user_id: userId,
            amount: -1,
            type: "generation",
            description: `Generated ${genre} cover art`,
          });

          logStep("Credit deducted", { newBalance: currentCredits - 1 });
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
        { type: "text", text: `Edit this image to create professional album cover art in a square 1:1 aspect ratio.
Keep the main subject/person from the original image but transform it according to these instructions:
${prompt}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}

IMPORTANT: Preserve the likeness and key features of the person/subject in the original image while applying the creative transformation. Make it visually striking, high quality, and suitable for music streaming platforms like Spotify and Apple Music.` },
        { type: "image_url", image_url: { url: referenceImage } }
      ];

      // If there's a text style reference, include it for the AI to match
      if (textStyleReferenceImage) {
        contentParts[0] = { 
          type: "text", 
          text: `Edit this image to create professional album cover art in a square 1:1 aspect ratio.
Keep the main subject/person from the original image but transform it.

${prompt}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}

TEXT STYLING: The second reference image shows the EXACT text style to replicate for any text/title in the cover. Match the letterform style, glow effects, colors, and brushstroke characteristics precisely. The text should look like it was created by the same artist as the reference.

IMPORTANT: Preserve the likeness and key features of the person/subject in the first image while applying the creative transformation and text styling from the second reference.`
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
      
      const stylePrompt = `Create professional album cover art in a square 1:1 aspect ratio.

${prompt}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}

CRITICAL TEXT STYLING INSTRUCTION: The attached reference image shows the EXACT text style you MUST replicate for any text/title in this cover art. Study the reference image carefully and match:
- The letterform style (brush strokes, edges, distortion)
- The glow/bloom effects around the text
- The color palette (pink/magenta core, cyan outer glow if shown)
- The texture and imperfections in the strokes
- The overall aggressive/scratched aesthetic if present

Generate the cover art with text that looks like it was created by the SAME artist who made the reference. The text style must be nearly identical to the reference.

Make the overall image visually striking, high quality, and suitable for music streaming platforms like Spotify and Apple Music.`;

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
      const enhancedPrompt = `Create a professional album cover art in a square 1:1 aspect ratio. 
Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
Subject: ${prompt}

Make it visually striking, high quality, and suitable for music streaming platforms like Spotify and Apple Music. 
The image should be bold, memorable, and capture the essence of ${genre} music with a ${mood.toLowerCase()} atmosphere.`;

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("AI gateway error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        // Refund the credit on rate limit
        if (userId && !hasUnlimitedAccess) {
          await supabaseClient
            .from("user_credits")
            .update({ credits: supabaseClient.rpc("increment_credits", { user_id: userId }) })
            .eq("user_id", userId);
        }
        
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
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
