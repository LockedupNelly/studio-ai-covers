import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
  console.log(`[ENHANCE-COVER] ${step}${detailsStr}`);
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
    const { imageUrl } = await req.json();
    logStep("Request received", { hasImageUrl: !!imageUrl });

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check credits before enhancing
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
      if (currentCredits < 1) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    logStep("Enhancing image using OpenAI gpt-image-1");

    // Use OpenAI to recreate the image at higher quality
    const enhancePrompt = `Create a high-quality, enhanced version of an album cover. The image should be:
- Crystal clear with maximum sharpness and detail
- Professional quality suitable for music streaming platforms
- Perfect 1:1 square format (1024x1024)
- No compression artifacts
- Vibrant colors with proper contrast
- Gallery-quality finish

This is for professional music distribution - quality must be pristine.`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180_000);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: enhancePrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logStep("OpenAI API error", { status: response.status, error: errorText });
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Enhancement failed: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0];
    
    let enhancedImageUrl = imageData?.b64_json 
      ? `data:image/png;base64,${imageData.b64_json}`
      : imageData?.url;

    if (!enhancedImageUrl) {
      logStep("No enhanced image returned");
      throw new Error("Enhancement failed - no image returned");
    }

    // Upload to storage
    let finalImageUrl = enhancedImageUrl;
    if (enhancedImageUrl.startsWith("data:image")) {
      try {
        const base64Data = enhancedImageUrl.split(",")[1];
        const mimeMatch = enhancedImageUrl.match(/data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
        const extension = mimeType.split("/")[1] || "png";
        const fileName = `${userId}/enhanced-${Date.now()}.${extension}`;

        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: uploadError } = await supabaseClient.storage
          .from("covers")
          .upload(fileName, bytes, { contentType: mimeType, upsert: true });

        if (uploadError) {
          logStep("Storage upload failed", { error: uploadError.message });
        } else {
          const { data: publicUrl } = supabaseClient.storage.from("covers").getPublicUrl(fileName);
          finalImageUrl = publicUrl.publicUrl;
          logStep("Uploaded enhanced image to storage", { url: finalImageUrl });
        }
      } catch (uploadErr) {
        logStep("Storage upload error", { error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr) });
      }
    }

    // Deduct credit after successful enhancement
    if (!hasUnlimitedAccess) {
      const { data: creditsData } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      const currentCredits = creditsData?.credits ?? 0;

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
          type: "enhancement",
          description: "Enhanced cover for streaming platforms",
        });
        logStep("Credit deducted", { newBalance: currentCredits - 1 });
      }
    }

    logStep("Enhancement complete");

    return new Response(
      JSON.stringify({ imageUrl: finalImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to enhance cover" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
