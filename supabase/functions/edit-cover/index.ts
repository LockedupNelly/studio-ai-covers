import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[EDIT-COVER] ${step}${detailsStr}`);
};

type ExtractedText = {
  items: Array<{
    text: string;
    location?: "top" | "upper" | "center" | "lower" | "bottom";
    approxSize?: "small" | "medium" | "large";
    notes?: string;
  }>;
};

type TextPlacement = {
  titleBox?: { x: number; y: number; w: number; h: number; alignment: string };
  artistBox?: { x: number; y: number; w: number; h: number; alignment: string };
  notes?: string;
};

const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim();

const tryParseExtractedText = (raw: string): ExtractedText => {
  const trimmed = String(raw ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Text extraction did not return JSON");
  }
  const jsonCandidate = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(jsonCandidate) as ExtractedText;
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error("Text extraction JSON missing items[]");
  }

  const seen = new Set<string>();
  const items = parsed.items
    .map((it) => ({
      ...it,
      text: normalizeText(String((it as any)?.text ?? "")),
      location: (it as any)?.location,
      approxSize: (it as any)?.approxSize,
      notes: typeof (it as any)?.notes === "string" ? String((it as any).notes).slice(0, 120) : undefined,
    }))
    .filter((it) => it.text.length > 0)
    .filter((it) => {
      const key = `${it.text.toLowerCase()}|${it.location ?? ""}|${it.approxSize ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { items };
};

const tryParsePlacement = (raw: string): TextPlacement => {
  const trimmed = String(raw ?? "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Placement detection did not return JSON");
  }
  const jsonCandidate = trimmed.slice(start, end + 1);
  return JSON.parse(jsonCandidate) as TextPlacement;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      imageUrl, 
      instructions, 
      styleReferenceImageUrl, 
      songTitle, 
      artistName, 
      coverAnalysis,
      editMode,
      baseArtworkUrl,
      typography
    } = body;
    
    logStep("Request received", {
      editMode: editMode || "legacy",
      instructions: instructions?.slice?.(0, 100),
      hasImage: !!imageUrl,
      hasBaseArtwork: !!baseArtworkUrl,
      hasStyleRef: !!styleReferenceImageUrl,
      songTitle,
      artistName,
      hasCoverAnalysis: !!coverAnalysis,
      hasTypography: !!typography,
    });

    // For text_layer mode, we need baseArtworkUrl
    const effectiveImageUrl = baseArtworkUrl || imageUrl;
    
    if (!effectiveImageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing image URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timeoutMs = 180_000; // 180 seconds for complex operations
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const callLovableText = async (prompt: string, image: string) => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          modalities: ["text"],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Lovable AI text error: ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error("No text returned from Lovable AI");
      return text;
    };

    const callLovableImageEdit = async (
      prompt: string,
      baseImageUrl: string,
      styleRefUrl?: string | null
    ) => {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                { type: "text", text: prompt },
                ...(styleRefUrl
                  ? [{ type: "image_url", image_url: { url: styleRefUrl } }]
                  : []),
                { type: "image_url", image_url: { url: baseImageUrl } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Lovable AI image error: ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      const outUrl = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!outUrl) {
        const msg = json.choices?.[0]?.message?.content;
        throw new Error(
          msg
            ? `No edited image returned. Model said: ${String(msg).slice(0, 180)}`
            : "No edited image returned"
        );
      }
      return outUrl;
    };

    // Generate transparent text layer using OpenAI gpt-image-1
    const generateTransparentTextLayer = async (
      baseImageUrl: string,
      title: string | null,
      artist: string | null,
      stylePrompt: string,
      styleRefUrl: string | null,
      analysis: any
    ): Promise<string> => {
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured for text layer generation");
      }

      logStep("Generating transparent text layer", { title, artist, stylePrompt });

      // First, detect optimal text placement using vision model
      const placementPrompt = `Analyze this album cover artwork and determine the optimal placement for text overlay.
      
The cover should have:
- Title text: "${title || 'TITLE'}"  
- Artist text: "${artist || 'ARTIST'}"

${analysis?.subjectPosition ? `The main subject is positioned: ${analysis.subjectPosition}` : ''}
${analysis?.safeTextZones?.length ? `Safe zones for text: ${analysis.safeTextZones.join(', ')}` : ''}
${analysis?.avoidZones?.length ? `Avoid placing text over: ${analysis.avoidZones.join(', ')}` : ''}

Return ONLY valid JSON (no markdown, no code fences) with this exact schema:
{
  "titleBox": { "x": 0.1, "y": 0.3, "w": 0.8, "h": 0.25, "alignment": "center" },
  "artistBox": { "x": 0.15, "y": 0.75, "w": 0.7, "h": 0.12, "alignment": "center" },
  "notes": "Brief explanation of placement choices"
}

Values are normalized 0-1 (x=0 is left edge, y=0 is top edge).
Choose placements that don't obscure the main subject and look balanced.`;

      let placement: TextPlacement;
      try {
        const placementRaw = await callLovableText(placementPrompt, baseImageUrl);
        placement = tryParsePlacement(placementRaw);
        logStep("Text placement detected", placement);
      } catch (e) {
        logStep("Placement detection failed, using defaults", { error: e instanceof Error ? e.message : String(e) });
        // Default placement: title in center, artist below
        placement = {
          titleBox: { x: 0.1, y: 0.35, w: 0.8, h: 0.2, alignment: "center" },
          artistBox: { x: 0.15, y: 0.72, w: 0.7, h: 0.1, alignment: "center" },
        };
      }

      // Build color guidance from cover analysis
      const colorGuidance = analysis?.dominantColors?.length
        ? `Use colors that complement the cover's palette: ${analysis.dominantColors.join(', ')}. Add shadows, glows, or gradients that make the text feel integrated with the artwork's lighting.`
        : `Sample the dominant colors from the reference artwork and use harmonious tones. Add shadows or glows that match the lighting direction.`;

      const placementGuidance = `
PLACEMENT CONSTRAINTS (normalized 0-1 coordinates relative to a 1024x1024 canvas):
- Title box: ${placement?.titleBox ? JSON.stringify(placement.titleBox) : '{"x":0.1,"y":0.35,"w":0.8,"h":0.2,"alignment":"center"}'}
- Artist box: ${placement?.artistBox ? JSON.stringify(placement.artistBox) : '{"x":0.15,"y":0.72,"w":0.7,"h":0.1,"alignment":"center"}'}
Rules:
- Render the title fully INSIDE the title box; render the artist fully INSIDE the artist box.
- Do not exceed each box bounds; keep ~4% inner padding inside each box.
- Size the typography to FIT the box (do not overflow / do not crop).
- Respect the alignment field when centering/left/right aligning.
- Do NOT make the text so large it spans the whole cover.
`.trim();

      // Generate transparent text layer with OpenAI
      const textLayerPrompt = `Generate a TRANSPARENT PNG image (1024x1024) containing ONLY typography text - NO background, NO artwork.

TEXT TO RENDER:
${title ? `- Main title: "${title}"` : ''}
${artist ? `- Artist name: "${artist}"` : ''}

TYPOGRAPHY STYLE:
${stylePrompt}

${placementGuidance}

INTEGRATION & EFFECTS:
${colorGuidance}
- Add appropriate drop shadows, outer glows, or subtle gradients ON THE TEXT ITSELF
- The text effects should make it look like the text belongs on this artwork
- DO NOT add any background - the image must be 100% transparent except for the text and its effects

CRITICAL REQUIREMENTS:
1. Output a PNG with TRANSPARENT background (alpha channel)
2. ONLY render the text and its effects - nothing else
3. Text must be readable and professional, but constrained to the specified boxes`;


      const openAIResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: textLayerPrompt,
          n: 1,
          size: "1024x1024",
          background: "transparent",
          output_format: "png",
          quality: "high",
        }),
        signal: controller.signal,
      });

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        logStep("OpenAI gpt-image-1 error", { status: openAIResponse.status, error: errorText });
        throw new Error(`OpenAI image generation failed: ${openAIResponse.status}`);
      }

      const openAIData = await openAIResponse.json();
      const textLayerB64 = openAIData.data?.[0]?.b64_json;
      
      if (!textLayerB64) {
        throw new Error("No text layer image returned from OpenAI");
      }

      logStep("Transparent text layer generated successfully");
      return `data:image/png;base64,${textLayerB64}`;
    };

    // ===== TEXT LAYER MODE: Non-destructive text editing =====
    if (editMode === "text_layer") {
      logStep("TEXT LAYER MODE: Generating transparent text overlay");
      
      let title = typography?.songTitle || songTitle || null;
      let artist = typography?.artistName || artistName || null;
      const stylePrompt = typography?.stylePrompt || "Modern, clean typography";
      const styleRefUrl = typography?.styleReferenceImageUrl || styleReferenceImageUrl || null;
      const analysis = typography?.coverAnalysis || coverAnalysis || null;

      // If no title/artist provided, try to extract from the image
      if (!title && !artist) {
        logStep("No metadata, extracting text from image for text layer mode");
        try {
          const extractionPrompt = `Return ONLY valid JSON (no markdown, no code fences) describing ALL text visible on this album cover.

Schema:
{
  "items": [
    {
      "text": "EXACT TEXT (verbatim, preserve spelling)",
      "location": "top|upper|center|lower|bottom",
      "approxSize": "small|medium|large"
    }
  ]
}

Rules:
- Include EVERY text element (title, artist, labels).
- Do NOT invent new words.
- If a word is unclear, make your best guess.

Now extract the text. Output JSON ONLY.`;

          const raw = await callLovableText(extractionPrompt, effectiveImageUrl);
          const extracted = tryParseExtractedText(raw);
          
          // Use the extracted text
          const largeText = extracted.items.find(i => i.approxSize === "large");
          const mediumText = extracted.items.find(i => i.approxSize === "medium" && i.text !== largeText?.text);
          
          title = largeText?.text || extracted.items[0]?.text || null;
          artist = mediumText?.text || (extracted.items.length > 1 ? extracted.items[1]?.text : null);
          
          logStep("Text extracted for text layer", { title, artist });
        } catch (e) {
          logStep("Text extraction failed", { error: e instanceof Error ? e.message : String(e) });
          // Fall through to legacy mode
        }
      }

      // Still no text? Fall back to legacy mode
      if (!title && !artist) {
        logStep("No text found, falling back to legacy mode");
        // Fall through to legacy mode by not returning here
      } else {
        try {
          const textLayerDataUrl = await generateTransparentTextLayer(
            effectiveImageUrl,
            title,
            artist,
            stylePrompt,
            styleRefUrl,
            analysis
          );

          logStep("Text layer mode complete - returning for frontend compositing");
          
          clearTimeout(timeout);
          return new Response(
            JSON.stringify({ 
              textLayerUrl: textLayerDataUrl,
              baseArtworkUrl: effectiveImageUrl,
              mode: "text_layer"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (e) {
          logStep("Text layer generation failed, falling back to legacy mode", { 
            error: e instanceof Error ? e.message : String(e) 
          });
          // Fall through to legacy mode
        }
      }
    }

    // ===== LEGACY MODE: Original inpainting approach =====
    logStep("Using legacy inpaint mode");

    const hasTextReplace =
      typeof instructions === "string" && instructions.includes("TEXT TYPOGRAPHY FULL REPLACE");

    let extractedTextJson: string | null = null;
    
    if (hasTextReplace) {
      if (songTitle || artistName) {
        logStep("Using metadata for text (skipping AI extraction)", { songTitle, artistName });
        const items: Array<{ text: string; location: string; approxSize: string }> = [];
        
        if (songTitle) {
          items.push({
            text: songTitle,
            location: "center",
            approxSize: "large",
          });
        }
        if (artistName) {
          items.push({
            text: artistName,
            location: "lower",
            approxSize: "medium",
          });
        }
        
        extractedTextJson = JSON.stringify({ items });
        logStep("Text metadata prepared", { items });
      } else {
        logStep("No metadata available, extracting text from image");
        const extractionPrompt = `Return ONLY valid JSON (no markdown, no code fences) describing ALL text visible on this album cover.

Schema:
{
  "items": [
    {
      "text": "EXACT TEXT (verbatim, preserve spelling)",
      "location": "top|upper|center|lower|bottom",
      "approxSize": "small|medium|large",
      "notes": "optional: e.g. all-caps, condensed, wide tracking"
    }
  ]
}

Rules:
- Include EVERY text element (title, artist, labels).
- Do NOT invent new words.
- Do NOT repeat the same phrase twice.
- If a word is unclear, make your best guess but DO NOT add extra words.

Now extract the text. Output JSON ONLY.`;

        const raw = await callLovableText(extractionPrompt, effectiveImageUrl);
        const extracted = tryParseExtractedText(raw);
        extractedTextJson = JSON.stringify(extracted);
        logStep("Text extraction complete (fallback)", {
          items: extracted.items.length,
          preview: extracted.items.slice(0, 4),
        });
      }
    }

    const hasVisualChanges = typeof instructions === "string" && (
      instructions.toLowerCase().includes("visual style") ||
      instructions.toLowerCase().includes("mood") ||
      instructions.toLowerCase().includes("lighting") ||
      instructions.toLowerCase().includes("texture") ||
      instructions.toLowerCase().includes("color") ||
      instructions.toLowerCase().includes("accent") ||
      instructions.toLowerCase().includes("change") ||
      instructions.toLowerCase().includes("add") ||
      instructions.toLowerCase().includes("make")
    );
    
    const isSimpleEdit = !hasTextReplace && hasVisualChanges;

    let currentImageUrl = effectiveImageUrl;

    if (isSimpleEdit) {
      logStep("Simple edit: Applying visual changes directly");
      
      const simpleEditPrompt = `You are an expert album cover art editor. Apply the following changes to this artwork:

${instructions}

CRITICAL RULES:
- Apply the requested changes accurately and visibly
- Maintain the overall composition and mood unless explicitly asked to change it
- Keep all existing text EXACTLY as it appears (same position, same words)
- Make the changes impactful and noticeable

QUALITY PRESERVATION (MANDATORY):
- Maintain the FULL RESOLUTION and DETAIL of the original image
- Do NOT reduce image quality, add blur, artifacts, or lose fine details
- The output must be as CRISP and HIGH-QUALITY as the input
- Preserve sharp edges, textures, and micro-details from the original

Apply the edits now and output the modified image.`;

      try {
        currentImageUrl = await callLovableImageEdit(simpleEditPrompt, currentImageUrl, null);
        logStep("Simple edit complete");
      } catch (e) {
        logStep("Simple edit failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to apply edits to cover");
      }
    }

    if (hasTextReplace) {
      logStep("Stage 1A: Dedicated text erasure");
      
      const erasePrompt = `You are an image inpainting specialist. Your ONLY task is to COMPLETELY REMOVE ALL TEXT from this album cover.

CRITICAL INSTRUCTIONS:
- ERASE every single letter, word, number, and character from the image
- Use context-aware inpainting to seamlessly fill where text was with appropriate background content (extend the sky, texture, artwork, etc.)
- The result MUST have ZERO visible text, typography, lettering, or characters remaining
- Do NOT add any new text whatsoever
- Do NOT change the artwork style, colors, mood, or composition - ONLY remove text
- The output should look like a completely textless version of the original album art

QUALITY PRESERVATION (MANDATORY):
- Maintain the FULL RESOLUTION and DETAIL of the original image
- Do NOT reduce image quality, add blur, artifacts, or lose fine details
- The output must be as CRISP and HIGH-QUALITY as the input
- Preserve sharp edges, textures, and micro-details from the original

Remove ALL text now and output the cleaned, text-free image.`;

      try {
        currentImageUrl = await callLovableImageEdit(erasePrompt, currentImageUrl, null);
        logStep("Stage 1A complete: Text erased");
      } catch (e) {
        logStep("Stage 1A failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to erase text from cover");
      }
    }

    if (hasTextReplace && hasVisualChanges) {
      logStep("Stage 1B: Applying visual style changes");
      
      const visualPrompt = `You are an expert album cover art editor. Apply the following visual changes to this artwork.

REQUESTED VISUAL EDITS:
${instructions}

CRITICAL RULES:
- Apply the visual style, mood, lighting, texture, and color changes as requested
- Do NOT add any text or typography to the image
- Keep the image completely text-free
- Maintain the overall composition while applying the requested visual changes

QUALITY PRESERVATION (MANDATORY):
- Maintain the FULL RESOLUTION and DETAIL of the original image
- Do NOT reduce image quality, add blur, artifacts, or lose fine details
- The output must be as CRISP and HIGH-QUALITY as the input
- Preserve sharp edges, textures, and micro-details from the original

Apply the visual changes now and output the edited image.`;

      try {
        currentImageUrl = await callLovableImageEdit(visualPrompt, currentImageUrl, null);
        logStep("Stage 1B complete: Visual changes applied");
      } catch (e) {
        logStep("Stage 1B failed; continuing with current image", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    const finalImageUrl = hasTextReplace
      ? await (async () => {
          logStep("Stage 2: Re-typesetting text with selected style and color integration");

          const colorIntegrationRules = coverAnalysis?.dominantColors?.length
            ? `COLOR INTEGRATION (MANDATORY - USE COVER'S COLOR PALETTE):
The cover's dominant colors are: ${coverAnalysis.dominantColors.join(', ')}
You MUST use these colors (or harmonious tones derived from them) for the text.
The text should feel like it BELONGS in this artwork - use the cover's own colors.
DO NOT use plain white, silver, grey, or colors that don't exist in the cover.
Choose the most impactful color from the palette for the main text.`
            : `COLOR INTEGRATION:
Sample the dominant colors from the cover image and use them for the text.
Avoid plain white or generic colors - use colors that exist in the artwork.`;

          const placementRules = coverAnalysis?.safeTextZones?.length || coverAnalysis?.avoidZones?.length
            ? `SMART TEXT PLACEMENT (MANDATORY):
Subject is located: ${coverAnalysis?.subjectPosition || 'center'}
SAFE zones for text: ${coverAnalysis?.safeTextZones?.join(', ') || 'lower-third'}
AVOID placing text over: ${coverAnalysis?.avoidZones?.join(', ') || 'center subjects'}

Position the song title in a SAFE zone. Do NOT obscure the main subject or important visual elements.`
            : `TEXT PLACEMENT:
Position text in the lower-third or edges of the image.
Avoid covering faces or the main focal point of the artwork.`;

          const stage2Prompt = `You are an expert typography compositor for album covers.

INPUT IMAGE:
- This image is now TEXT-FREE (all text was erased in Stage 1).
- You need to ADD fresh typography onto it.

STYLE REFERENCE (if provided):
- The style reference image shows the VISUAL TYPOGRAPHY STYLE you should use.
- IMPORTANT: IGNORE any placeholder words in the style reference (like "SONG TITLE" or "ARTIST"). 
- Copy ONLY the visual style (font, effects, texture) NOT the words.

${colorIntegrationRules}

${placementRules}

EXACT TEXT TO PLACE (from the original cover):
${extractedTextJson}

RULES (ABSOLUTE - FOLLOW EXACTLY):
1. Place ONLY the text from the JSON above - no other words
2. Preserve exact spelling from the JSON
3. Apply the typography style from the style reference
4. Use colors from the cover's palette (see COLOR INTEGRATION above)
5. Position text in SAFE zones only (see SMART TEXT PLACEMENT above)
6. Do NOT modify the background artwork at all - ONLY add the text overlay
7. The text must feel designed-into the cover, not overlaid

QUALITY PRESERVATION (MANDATORY):
- Maintain the FULL RESOLUTION and DETAIL of the original image
- Do NOT reduce image quality, add blur, artifacts, or lose fine details
- The output must be as CRISP and HIGH-QUALITY as the input
- Preserve sharp edges, textures, and micro-details from the original

Add the text now with the requested typography style, integrated colors, and smart placement.`;

          return await callLovableImageEdit(
            stage2Prompt,
            currentImageUrl,
            styleReferenceImageUrl ?? null
          );
        })()
      : currentImageUrl;

    clearTimeout(timeout);
    logStep("Cover edited successfully");

    return new Response(JSON.stringify({ imageUrl: finalImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to edit cover" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
