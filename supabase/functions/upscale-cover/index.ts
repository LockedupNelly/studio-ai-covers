import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UPSCALE-COVER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logStep("ERROR: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Upscaling service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      logStep("ERROR: Invalid user token", { error: userError?.message });
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      logStep("ERROR: No image URL provided");
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Starting upscale with Lovable AI", { imageUrl: imageUrl.substring(0, 100) });

    // Use Lovable AI gateway with Gemini image model for upscaling
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Upscale this image to 4x higher resolution. Enhance details, sharpen edges, reduce noise, and improve overall clarity while maintaining the original artistic style and composition. Output a high-quality, print-ready version."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("ERROR: Lovable AI request failed", { status: response.status, error: errorText });
      return new Response(
        JSON.stringify({ error: "Upscaling failed - AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    logStep("Lovable AI response received", { hasChoices: !!data.choices });

    const upscaledImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!upscaledImageUrl) {
      logStep("ERROR: No upscaled image in response");
      return new Response(
        JSON.stringify({ error: "Upscaling failed - no output image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Upscale successful, uploading to storage");

    // Convert base64 to blob and upload to Supabase Storage
    let imageBlob: Blob;
    if (upscaledImageUrl.startsWith("data:")) {
      const base64Data = upscaledImageUrl.split(",")[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      imageBlob = new Blob([bytes], { type: "image/png" });
    } else {
      // If it's a URL, fetch it
      const imageResponse = await fetch(upscaledImageUrl);
      if (!imageResponse.ok) {
        logStep("ERROR: Failed to fetch upscaled image");
        return new Response(
          JSON.stringify({ error: "Failed to fetch upscaled image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      imageBlob = await imageResponse.blob();
    }

    const fileName = `${userId}/upscaled-${Date.now()}.png`;

    logStep("Uploading to Supabase Storage", { fileName });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("covers")
      .upload(fileName, imageBlob, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      logStep("ERROR: Upload failed", { error: uploadError.message });
      // Return the base64 URL as fallback
      return new Response(
        JSON.stringify({ upscaledUrl: upscaledImageUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("covers")
      .getPublicUrl(fileName);

    const finalUrl = publicUrlData.publicUrl;
    logStep("Upload successful", { finalUrl });

    return new Response(
      JSON.stringify({ upscaledUrl: finalUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    logStep("ERROR: Unexpected error", { error: errorMessage, stack: errorStack });

    return new Response(
      JSON.stringify({
        error: errorMessage || "Upscaling failed",
        details: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
