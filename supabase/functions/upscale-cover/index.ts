import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import Replicate from "https://esm.sh/replicate@0.25.2";

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
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      logStep("ERROR: REPLICATE_API_KEY not configured");
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

    logStep("Starting upscale with Replicate", { imageUrl: imageUrl.substring(0, 100) });

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Use Real-ESRGAN for 4x upscaling (1024 -> 4096, exceeds 3000x3000 requirement)
    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: imageUrl,
          scale: 4,
          face_enhance: false,
        }
      }
    );

    logStep("Replicate response received", { output: typeof output });

    if (!output) {
      logStep("ERROR: No output from Replicate");
      return new Response(
        JSON.stringify({ error: "Upscaling failed - no output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upscaledImageUrl = output as string;
    logStep("Upscale successful, uploading to storage");

    // Fetch the upscaled image and upload to Supabase Storage
    const imageResponse = await fetch(upscaledImageUrl);
    if (!imageResponse.ok) {
      logStep("ERROR: Failed to fetch upscaled image");
      return new Response(
        JSON.stringify({ error: "Failed to fetch upscaled image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const imageBlob = await imageResponse.blob();

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
      // Return the Replicate URL as fallback
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
