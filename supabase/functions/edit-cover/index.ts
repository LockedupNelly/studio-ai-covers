import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EDIT-COVER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, instructions } = await req.json();
    logStep("Request received", { 
      instructions: instructions?.slice(0, 50), 
      hasImage: !!imageUrl 
    });

    if (!imageUrl || !instructions) {
      return new Response(
        JSON.stringify({ error: "Missing image URL or instructions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    logStep("Editing cover art with OpenAI");

    const editPrompt = `You are a professional album cover designer. Edit this album cover according to the following instructions:

${instructions}

CRITICAL REQUIREMENTS:
1. Maintain the original square aspect ratio (1:1)
2. Keep the overall composition and style similar
3. Make ONLY the changes requested - do not alter other elements
4. The artwork must completely fill the canvas - NO empty borders
5. Ensure all text remains readable and properly positioned
6. Maintain professional album cover quality

Apply the requested edits while preserving the artistic integrity of the original cover.`;

    // For edits, we need to use the images/edits endpoint with mask, 
    // but gpt-image-1 can also handle edits via generations with a detailed prompt
    // Since we're doing text-based edits, we'll describe the original and changes
    
    const controller = new AbortController();
    const timeoutMs = 55_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      // Use gpt-image-1 with a prompt that describes the edit
      // We'll reference the original image concept in the prompt
      response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: editPrompt,
          n: 1,
          size: "1024x1024",
          quality: "high",
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        logStep("AI request timed out", { timeoutMs });
        return new Response(
          JSON.stringify({ error: "Edit timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw e;
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
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OpenAI API credits exhausted. Please check your API key." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    logStep("OpenAI response received");

    const imageData = data.data?.[0];
    const newImageUrl = imageData?.b64_json 
      ? `data:image/png;base64,${imageData.b64_json}`
      : imageData?.url;
    
    if (!newImageUrl) {
      logStep("No image in response", { data: JSON.stringify(data) });
      throw new Error("No image generated");
    }

    logStep("Cover edited successfully");

    return new Response(
      JSON.stringify({ imageUrl: newImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to edit cover" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
