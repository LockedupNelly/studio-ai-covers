import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { imageUrl, instructions, styleReferenceImageUrl } = await req.json();
    logStep("Request received", {
      instructions: instructions?.slice(0, 100),
      hasImage: !!imageUrl,
      hasStyleRef: !!styleReferenceImageUrl,
      imageUrlPrefix: imageUrl?.slice(0, 50),
    });

    if (!imageUrl || !instructions) {
      return new Response(
        JSON.stringify({ error: "Missing image URL or instructions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    logStep("Editing cover art with Lovable AI (image edit mode)");

    // Build a comprehensive prompt for accurate album cover editing
    const editPrompt = `You are an expert album cover art editor specializing in typography and visual effects.

Edit this album cover image with the following changes:

${instructions}

ABSOLUTELY CRITICAL - TEXT CONTENT RULES:
1. NEVER ADD ANY NEW WORDS OR TEXT that is not already on the cover
2. NEVER interpret style descriptions (like "chrome", "neon", "fire", etc.) as text to add - these are STYLE DESCRIPTORS ONLY
3. The ONLY text on the final cover must be the EXACT words that were already on the original cover
4. If the original says "HALF TIME SHOW" and "GRREGORY", the result MUST say ONLY "HALF TIME SHOW" and "GRREGORY" - nothing else

TYPOGRAPHY WORKFLOW (if text styling is requested):
- STEP 1: READ and identify ALL text currently visible on the cover (artist name, song title, any labels)
- STEP 2: COMPLETELY ERASE/REMOVE the existing text (clean inpaint the background)
- STEP 3: RE-CREATE the EXACT SAME WORDS in the new typography style
- STEP 4: The style reference image shows the VISUAL STYLE to apply - NOT text content to copy
- Keep text in the same general position/scale as the original

GENERAL GUIDELINES:
- Keep the same overall composition and layout
- Make the requested visual changes naturally
- Maintain the professional quality of album artwork
- Apply color changes, textures, and effects as requested
- The result should look like a polished, professional album cover

Generate the edited version of this image now.`;

    const controller = new AbortController();
    const timeoutMs = 120_000; // 120 seconds for image editing
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      // Use Lovable AI gateway with Gemini for actual image editing
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  text: editPrompt,
                },
                ...(styleReferenceImageUrl
                  ? [
                      {
                        type: "image_url",
                        image_url: { url: styleReferenceImageUrl },
                      },
                    ]
                  : []),
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        logStep("AI request timed out", { timeoutMs });
        return new Response(
          JSON.stringify({ error: "Edit timed out. Please try again with simpler edits." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Lovable AI error", { status: response.status, error: errorText });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402 || response.status === 401) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please check your configuration." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    logStep("Lovable AI response received", { hasChoices: !!data.choices });

    // Extract the edited image from the response
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      // Log the text response if any
      const textResponse = data.choices?.[0]?.message?.content;
      logStep("No image in response", { 
        textResponse: textResponse?.slice(0, 200),
        fullData: JSON.stringify(data).slice(0, 500) 
      });
      
      // Check if the model refused or couldn't complete
      if (textResponse && (textResponse.includes("can't") || textResponse.includes("cannot") || textResponse.includes("unable"))) {
        return new Response(
          JSON.stringify({ error: "The AI couldn't apply those specific edits. Try simpler changes or fewer options at once." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("No edited image generated. Try applying fewer edits at once.");
    }

    logStep("Cover edited successfully");

    return new Response(
      JSON.stringify({ imageUrl: editedImageUrl }),
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
