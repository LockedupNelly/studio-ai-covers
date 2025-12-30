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

    // Mutable versions of key variables for legacy mode
    let effectiveSongTitle = songTitle;
    let effectiveArtistName = artistName;
    let effectiveInstructions = instructions;
    let effectiveStyleRefUrl = styleReferenceImageUrl;

    // ===== TEXT LAYER MODE: Convert to legacy mode with proper instructions =====
    if (editMode === "text_layer") {
      logStep("TEXT LAYER MODE: Converting to legacy inpaint mode");
      
      const title = typography?.songTitle || songTitle || null;
      const artist = typography?.artistName || artistName || null;
      const stylePrompt = typography?.stylePrompt || "Modern, clean typography";
      const styleRefUrl = typography?.styleReferenceImageUrl || styleReferenceImageUrl || null;
      
      // Convert text_layer request to legacy instructions format
      // This ensures the legacy mode has the proper text replacement instructions
      if (title || artist) {
        logStep("Converting text_layer to legacy with text metadata", { title, artist });
        
        // Override variables for legacy mode
        effectiveSongTitle = title;
        effectiveArtistName = artist;
        effectiveInstructions = `TEXT TYPOGRAPHY FULL REPLACE: Re-style all text on this album cover.

TYPOGRAPHY STYLE: ${stylePrompt}

The song title is "${title || 'unknown'}" and artist is "${artist || 'unknown'}".

CRITICAL RULES:
- Keep the EXACT same text content - do not change any words
- Only change the visual style/typography of the text
- Preserve the artwork/background as much as possible
- Apply the new typography style to all text elements`;
        
        // Also use the style reference if provided
        if (styleRefUrl) {
          effectiveStyleRefUrl = styleRefUrl;
        }
      } else {
        logStep("Text layer mode has no text metadata, will extract from image");
      }
    }

    // ===== LEGACY MODE: Original inpainting approach =====
    logStep("Using legacy inpaint mode");

    const hasTextReplace =
      typeof effectiveInstructions === "string" && effectiveInstructions.includes("TEXT TYPOGRAPHY FULL REPLACE");

    let extractedTextJson: string | null = null;
    
    if (hasTextReplace) {
      if (effectiveSongTitle || effectiveArtistName) {
        logStep("Using metadata for text (skipping AI extraction)", { songTitle: effectiveSongTitle, artistName: effectiveArtistName });
        const items: Array<{ text: string; location: string; approxSize: string }> = [];
        
        if (effectiveSongTitle) {
          items.push({
            text: effectiveSongTitle,
            location: "center",
            approxSize: "large",
          });
        }
        if (effectiveArtistName) {
          items.push({
            text: effectiveArtistName,
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

    const hasVisualChanges = typeof effectiveInstructions === "string" && (
      effectiveInstructions.toLowerCase().includes("visual style") ||
      effectiveInstructions.toLowerCase().includes("mood") ||
      effectiveInstructions.toLowerCase().includes("lighting") ||
      effectiveInstructions.toLowerCase().includes("texture") ||
      effectiveInstructions.toLowerCase().includes("color") ||
      effectiveInstructions.toLowerCase().includes("accent") ||
      effectiveInstructions.toLowerCase().includes("change") ||
      effectiveInstructions.toLowerCase().includes("add") ||
      effectiveInstructions.toLowerCase().includes("make")
    );
    
    const isSimpleEdit = !hasTextReplace && hasVisualChanges;

    let currentImageUrl = effectiveImageUrl;

    if (isSimpleEdit) {
      logStep("Simple edit: Applying visual changes directly");
      
      const simpleEditPrompt = `You are an expert album cover art editor. Apply the following changes to this artwork:

${effectiveInstructions}

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
${effectiveInstructions}

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

    // Function to re-typeset text using OpenAI gpt-image-1 (same model as generate-cover)
    const retypesetTextWithOpenAI = async (
      cleanImageUrl: string,
      textData: string,
      styleRefUrl: string | null,
      analysis: any,
      fullStylePrompt: string | null // Pass the FULL detailed style prompt directly
    ): Promise<string> => {
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured for text re-typesetting");
      }

      logStep("Using OpenAI gpt-image-1 for text re-typesetting (same as generate-cover)");

      // Parse the text data to get song title and artist
      let titleText = "";
      let artistText = "";
      try {
        const parsed = JSON.parse(textData);
        if (parsed.items && Array.isArray(parsed.items)) {
          for (const item of parsed.items) {
            if (item.approxSize === "large" || item.location === "center") {
              titleText = item.text;
            } else if (item.approxSize === "medium" || item.location === "lower") {
              artistText = item.text;
            }
          }
          // Fallback: first item is title, second is artist
          if (!titleText && parsed.items[0]) titleText = parsed.items[0].text;
          if (!artistText && parsed.items[1]) artistText = parsed.items[1].text;
        }
      } catch (e) {
        logStep("Failed to parse text data", { error: e instanceof Error ? e.message : String(e) });
      }

      // Use the FULL detailed style prompt passed in, not a truncated version
      const styleDescription = fullStylePrompt || "Modern, bold typography with artistic effects";
      
      logStep("Style description for re-typesetting", { 
        styleDescriptionLength: styleDescription.length,
        styleDescriptionPreview: styleDescription.slice(0, 200) 
      });

      // Build placement guidance from cover analysis
      const placementGuidance = analysis?.safeTextZones?.length
        ? `Position text in these areas: ${analysis.safeTextZones.join(', ')}. Avoid: ${analysis.avoidZones?.join(', ') || 'center subjects'}.`
        : "Position title prominently, artist name smaller below or near title.";

      const colorGuidance = analysis?.dominantColors?.length
        ? `Use colors that complement the cover's palette: ${analysis.dominantColors.join(', ')}. The text should feel integrated with the artwork.`
        : "Use colors sampled from the artwork for text. Make text feel designed-into the cover.";

      // Use the SAME strict prompt structure as generate-cover
      const retypesetPrompt = `You are adding typography to an album cover artwork. The base artwork is text-free.

CRITICAL TEXT CONTENT (SPELL EXACTLY AS SHOWN - EACH LETTER MUST BE CORRECT):
${titleText ? `- Song Title: "${titleText}" - This is the PRIMARY text, display it LARGE and PROMINENT` : ''}
${artistText ? `- Artist Name: "${artistText}" - This is SECONDARY text, display it SMALLER, below or near the title` : ''}

CRITICAL SPELLING RULES (FROM GENERATE-COVER - PROVEN TO WORK):
${titleText ? `- The song title is "${titleText}" - spell each letter EXACTLY as shown above` : ''}
${artistText ? `- The artist name is "${artistText}" - spell each letter EXACTLY as shown above` : ''}
- Double-check EVERY letter before finalizing
- Do NOT substitute similar-looking characters
- Do NOT add, remove, or change ANY letters
- If the title is "${titleText}", it must appear EXACTLY as "${titleText}" - not "${titleText?.split('').reverse().join('')}" or any variation

TYPOGRAPHY STYLE:
${styleDescription}
${styleRefUrl ? '- Match the visual style shown in the style reference image (font effects, textures, treatments)' : ''}
${styleRefUrl ? '- IGNORE any placeholder text in the style reference - only copy the VISUAL STYLE' : ''}

TEXT PLACEMENT:
${placementGuidance}

COLOR INTEGRATION:
${colorGuidance}

FINAL REQUIREMENTS:
1. The text "${titleText}" must be spelled EXACTLY as "${titleText}" - character for character
2. The text "${artistText}" must be spelled EXACTLY as "${artistText}" - character for character
3. Apply the typography style with professional effects (shadows, glows, gradients as appropriate)
4. Integrate the text naturally into the artwork
5. Do NOT modify the background artwork - ONLY add the text overlay
6. Output a high-quality 1024x1024 album cover`;

      logStep("Calling OpenAI gpt-image-1 with strict spelling rules", { 
        titleText, 
        artistText,
        promptLength: retypesetPrompt.length 
      });

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: await (async () => {
          // Fetch the clean image and convert to blob
          const imageResponse = await fetch(cleanImageUrl);
          const imageBlob = await imageResponse.blob();
          
          const formData = new FormData();
          formData.append("model", "gpt-image-1");
          formData.append("image", imageBlob, "cover.png");
          formData.append("prompt", retypesetPrompt);
          formData.append("size", "1024x1024");
          formData.append("quality", "high");
          
          return formData;
        })(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStep("OpenAI gpt-image-1 edit failed", { status: response.status, error: errorText });
        throw new Error(`OpenAI image edit failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const resultB64 = data.data?.[0]?.b64_json;
      
      if (!resultB64) {
        throw new Error("No image returned from OpenAI gpt-image-1");
      }

      // Upload to Supabase storage
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const fileName = `edited-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      const imageBuffer = Uint8Array.from(atob(resultB64), c => c.charCodeAt(0));
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("covers")
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        logStep("Upload failed", { error: uploadError.message });
        throw new Error(`Failed to upload edited cover: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from("covers")
        .getPublicUrl(fileName);

      logStep("Text re-typeset with OpenAI gpt-image-1 complete", { url: publicUrlData.publicUrl });
      return publicUrlData.publicUrl;
    };

    // Get the full style prompt from typography if available
    const fullStylePrompt = typography?.stylePrompt || null;
    
    const finalImageUrl = hasTextReplace
      ? await retypesetTextWithOpenAI(
          currentImageUrl,
          extractedTextJson || "{}",
          effectiveStyleRefUrl ?? null,
          coverAnalysis,
          fullStylePrompt
        )
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
