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

TEXT TO RENDER (EXACTLY - NO DUPLICATES):
${title ? `- SONG TITLE: "${title}" - Spell as: ${title.split('').join('-')}` : ''}
${artist ? `- ARTIST NAME: "${artist}" - Spell as: ${artist.split('').join('-')}` : ''}

CRITICAL ANTI-DUPLICATE RULES:
- Render EXACTLY ONE instance of the song title (if provided)
- Render EXACTLY ONE instance of the artist name (if provided)
- Do NOT repeat or duplicate any text
- Do NOT add any extra text, labels, or words
- Do NOT add "Song Title", "Artist Name", or any other labels
- The ONLY text on the image should be the exact title and artist provided above

TYPOGRAPHY STYLE:
${stylePrompt}

${placementGuidance}

INTEGRATION & EFFECTS:
${colorGuidance}
- Add appropriate drop shadows, outer glows, or subtle gradients ON THE TEXT ITSELF
- The text effects should make it look like the text belongs on album artwork
- DO NOT add any background - the image must be 100% transparent except for the text and its effects

VERIFICATION BEFORE OUTPUT:
1. Count the instances of "${title || ''}" - must be EXACTLY 1 (or 0 if no title provided)
2. Count the instances of "${artist || ''}" - must be EXACTLY 1 (or 0 if no artist provided)  
3. Verify the text is spelled correctly letter by letter
4. Confirm the background is fully transparent (no solid colors, no artwork)

OUTPUT: A transparent PNG with only the styled text overlay.`;


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

    // ===== TEXT LAYER MODE: Design Studio Pass 3-style text integration =====
    // Instead of generating a transparent overlay, we regenerate the full image with integrated text
    // This matches how Design Studio creates covers with text "photographed in the scene"
    if (editMode === "text_layer") {
      logStep("TEXT LAYER MODE: Using Design Studio Pass 3-style text integration");
      
      const title = typography?.songTitle || songTitle || null;
      const artist = typography?.artistName || artistName || null;
      const stylePrompt = typography?.stylePrompt || "Modern, clean typography";
      const styleRefUrl = typography?.styleReferenceImageUrl || styleReferenceImageUrl || null;
      const analysis = typography?.coverAnalysis || coverAnalysis || null;
      
      if (!title && !artist) {
        logStep("TEXT LAYER MODE: No text metadata provided");
        return new Response(
          JSON.stringify({ error: "Text layer mode requires songTitle or artistName" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      logStep("TEXT LAYER MODE: Starting", { title, artist, stylePromptLength: stylePrompt?.length });
      
      // Step 1: Detect existing text locations using vision model
      let detectedTitleZone = "center";
      let detectedArtistZone = "lower";
      
      try {
        const detectPrompt = `Analyze this album cover and identify where the text is positioned.
Return ONLY valid JSON (no markdown, no code fences):
{
  "titleZone": "top|upper-left|upper-right|center|center-left|center-right|lower-left|lower-right|bottom",
  "artistZone": "top|upper-left|upper-right|center|center-left|center-right|lower-left|lower-right|bottom",
  "titleSize": "small|medium|large",
  "artistSize": "small|medium|large"
}`;
        const detectRaw = await callLovableText(detectPrompt, imageUrl);
        const detectParsed = JSON.parse(detectRaw.slice(detectRaw.indexOf("{"), detectRaw.lastIndexOf("}") + 1));
        detectedTitleZone = detectParsed.titleZone || "center";
        detectedArtistZone = detectParsed.artistZone || "lower";
        logStep("TEXT LAYER MODE: Detected text positions", { detectedTitleZone, detectedArtistZone });
      } catch (e) {
        logStep("TEXT LAYER MODE: Position detection failed, using defaults", { error: e instanceof Error ? e.message : String(e) });
      }
      
      // Step 2: Check if we have a clean base, otherwise create one
      let cleanBaseUrl: string;
      
      if (baseArtworkUrl) {
        // Validate that the provided base is actually clean (no text)
        logStep("TEXT LAYER MODE: Validating provided baseArtworkUrl");
        try {
          const validationPrompt = `Does this image contain any visible text, letters, words, or typography? Reply ONLY "yes" or "no".`;
          const hasTextResponse = await callLovableText(validationPrompt, baseArtworkUrl);
          const hasText = hasTextResponse.toLowerCase().includes("yes");
          
          if (hasText) {
            logStep("TEXT LAYER MODE: Provided base contains text, will re-erase");
            const erasePrompt = `You are an image inpainting specialist. COMPLETELY REMOVE ALL TEXT from this album cover.
ERASE every letter, word, and character. Use context-aware inpainting to fill where text was.
The result must have ZERO visible text remaining. Do NOT add any new text.
Keep the artwork style, colors, mood, and composition exactly the same - ONLY remove text.
Maintain FULL RESOLUTION and DETAIL. Output the cleaned, text-free album art.`;
            cleanBaseUrl = await callLovableImageEdit(erasePrompt, baseArtworkUrl, null);
            logStep("TEXT LAYER MODE: Re-erased text from base");
          } else {
            cleanBaseUrl = baseArtworkUrl;
            logStep("TEXT LAYER MODE: Provided base is clean, reusing");
          }
        } catch (e) {
          logStep("TEXT LAYER MODE: Validation failed, erasing text from base", { error: e instanceof Error ? e.message : String(e) });
          const erasePrompt = `You are an image inpainting specialist. COMPLETELY REMOVE ALL TEXT from this album cover.
ERASE every letter, word, and character. Use context-aware inpainting to fill where text was.
Keep the artwork style, colors, mood, and composition exactly the same - ONLY remove text.
Maintain FULL RESOLUTION and DETAIL.`;
          cleanBaseUrl = await callLovableImageEdit(erasePrompt, baseArtworkUrl, null);
        }
      } else {
        // First time: must erase text from current image
        logStep("TEXT LAYER MODE: No clean base provided, erasing text from current image");
        
        const erasePrompt = `You are an image inpainting specialist. COMPLETELY REMOVE ALL TEXT from this album cover.
ERASE every letter, word, and character. Use context-aware inpainting to fill where text was.
The result must have ZERO visible text remaining. Do NOT add any new text.
Keep the artwork style, colors, mood, and composition exactly the same - ONLY remove text.
Maintain FULL RESOLUTION and DETAIL. Output the cleaned, text-free album art.`;

        try {
          cleanBaseUrl = await callLovableImageEdit(erasePrompt, imageUrl, null);
          logStep("TEXT LAYER MODE: Base artwork cleaned (text removed)");
        } catch (e) {
          logStep("TEXT LAYER MODE: Text erasure failed", { error: e instanceof Error ? e.message : String(e) });
          throw new Error("Failed to prepare base artwork for text layer");
        }
      }
      
      // Step 3: Regenerate full image with integrated text (Design Studio Pass 3 style)
      // This uses the same contract as generate-cover Pass 3 - text is "photographed in the scene"
      const colorGuidance = analysis?.dominantColors?.length
        ? `Use colors from the cover's palette: ${analysis.dominantColors.join(', ')}.`
        : "Sample dominant colors from the artwork for text colors.";
      
      const integrationPrompt = `SYSTEM ROLE:
You are recreating professional album cover artwork. You must preserve the visual aesthetic 
and scene from the reference artwork EXACTLY while adding perfectly integrated typography.

===== REFERENCE ARTWORK (PRESERVE EXACTLY) =====
Use the provided clean artwork as the base. Recreate it EXACTLY, adding only the typography.
DO NOT modify, regenerate, or change the background artwork in ANY way.
The artwork must remain pixel-perfect identical - you are ONLY adding text.

===== MANDATORY TEXT STYLE (USER SELECTED - FOLLOW EXACTLY) =====
The user has explicitly chosen this text style. You MUST create text that matches this description:
"${stylePrompt}"

This is NON-NEGOTIABLE. The font style, weight, texture, and effects described above MUST be followed.

===== TEXT INTEGRATION CONTRACT (MANDATORY) =====
Text must be treated as a physical object inside the scene, not an overlay.

TEXT CONTENT (SPELL EXACTLY - LETTER BY LETTER):
${title ? `- SONG TITLE: "${title}" 
  - Spell as: ${title.split('').join('-')}
  - Display as PRIMARY text, large and prominent
  - Position in the ${detectedTitleZone} area (same location as original)` : ''}
${artist ? `- ARTIST NAME: "${artist}"
  - Spell as: ${artist.split('').join('-')}  
  - Display SMALLER, positioned in the ${detectedArtistZone} area (same location as original)` : ''}

CRITICAL SPELLING VERIFICATION:
${title ? `- Count letters in "${title}": ${title.length} characters - VERIFY EXACT MATCH` : ''}
${artist ? `- Count letters in "${artist}": ${artist.length} characters - VERIFY EXACT MATCH` : ''}
- Do not substitute similar-looking characters
- Do not add or remove any letters

SINGLE INSTANCE RULES:
- Each text element appears ONCE only - no duplication
- Title appears exactly 1 time
- Artist appears exactly 1 time

===== TEXT PLACEMENT CONSTRAINTS =====
- Title: position in ${detectedTitleZone} (matching original location)
- Artist: position in ${detectedArtistZone} (matching original location)  
- Title height must be <= 22% of canvas height
- Artist height must be <= 12% of canvas height
- Title must occupy <= 85% of canvas width
- Artist must occupy <= 75% of canvas width
- Do NOT place text spanning the entire cover

===== COLOR INTEGRATION =====
${colorGuidance}
Add shadows, glows, or gradients that match the artwork's lighting direction.

===== FORBIDDEN =====
- Flat overlay text (stamped on top look)
- Poster-style typography that ignores the artwork
- Text floating in empty space
- Clean, UI-like lettering without artistic effects
- Ignoring the user's selected text style
- Duplicating any text
- Giant text spanning the whole cover
- ANY modification to the background artwork

===== REQUIRED =====
- Text must match the user's selected style EXACTLY (font, weight, effects, texture)
- Text must exist as part of the environment
- Text must interact with light, shadow, depth
- Text must show wear, texture, perspective distortion appropriate to the style
- Text must feel like it was PHOTOGRAPHED in the scene, not added in post-production
- Background artwork must be IDENTICAL to the reference

OUTPUT: The album cover with the styled text integrated into the scene.`;

      try {
        logStep("TEXT LAYER MODE: Regenerating with integrated text (Pass 3 style)", {
          titleZone: detectedTitleZone,
          artistZone: detectedArtistZone
        });
        
        const finalImageUrl = await callLovableImageEdit(
          integrationPrompt,
          cleanBaseUrl,
          styleRefUrl
        );
        
        logStep("TEXT LAYER MODE: Text integration complete");
        
        clearTimeout(timeout);
        
        // Return the complete image (not text_layer mode - no client compositing needed)
        return new Response(JSON.stringify({ 
          imageUrl: finalImageUrl,
          baseArtworkUrl: cleanBaseUrl, // Return clean base for caching
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        logStep("TEXT LAYER MODE: Text integration failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error(`Failed to integrate text: ${e instanceof Error ? e.message : String(e)}`);
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

    // Stage 2: Re-typeset text using Gemini (callLovableImageEdit) - PRESERVES ARTWORK
    // This approach was working correctly for artwork preservation
    if (hasTextReplace) {
      logStep("Stage 2: Re-typesetting text with Gemini (artwork-preserving approach)");

      // Parse the text data to get song title and artist
      let titleText = "";
      let artistText = "";
      try {
        const parsed = JSON.parse(extractedTextJson || "{}");
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

      // Get the full style prompt from typography if available
      const fullStylePrompt = typography?.stylePrompt || null;
      const styleDescription = fullStylePrompt || "Modern, bold typography with artistic effects";
      
      logStep("Style description for re-typesetting", { 
        titleText,
        artistText,
        styleDescriptionLength: styleDescription.length,
        styleDescriptionPreview: styleDescription.slice(0, 200) 
      });

      // Build placement guidance from cover analysis
      const placementGuidance = coverAnalysis?.safeTextZones?.length
        ? `Position text in these areas: ${coverAnalysis.safeTextZones.join(', ')}. Avoid: ${coverAnalysis.avoidZones?.join(', ') || 'center subjects'}.`
        : "Position title prominently, artist name smaller below or near title.";

      const colorGuidance = coverAnalysis?.dominantColors?.length
        ? `Use colors that complement the cover's palette: ${coverAnalysis.dominantColors.join(', ')}. The text should feel integrated with the artwork.`
        : "Use colors sampled from the artwork for text. Make text feel designed-into the cover.";

      // CRITICAL: Use EDIT prompt that explicitly tells Gemini to preserve the artwork
      const retypesetPrompt = `EDIT THIS ALBUM COVER - ADD TEXT ONLY:

You are EDITING this existing album cover artwork by adding typography text on top.
DO NOT modify, regenerate, or change the background artwork in ANY way.
The artwork must remain EXACTLY as shown - you are ONLY adding text overlay.

===== CRITICAL TEXT TO ADD (SPELL EXACTLY) =====
${titleText ? `SONG TITLE: "${titleText}"
- Spell it EXACTLY as: ${titleText.split('').join('-')}
- This is the PRIMARY text - display it LARGE and PROMINENT` : ''}
${artistText ? `
ARTIST NAME: "${artistText}"  
- Spell it EXACTLY as: ${artistText.split('').join('-')}
- This is SECONDARY text - display it SMALLER, below or near the title` : ''}

===== SPELLING VERIFICATION =====
${titleText ? `- Title must read: "${titleText}" - EXACTLY ${titleText.length} characters` : ''}
${artistText ? `- Artist must read: "${artistText}" - EXACTLY ${artistText.length} characters` : ''}
- Double-check EVERY letter before finalizing
- Do NOT substitute similar-looking characters
- Do NOT add, remove, or change ANY letters

===== TYPOGRAPHY STYLE =====
${styleDescription}
${effectiveStyleRefUrl ? '- Match the visual style shown in the style reference image' : ''}
${effectiveStyleRefUrl ? '- Copy ONLY the typography style, NOT any text content from the reference' : ''}

===== TEXT PLACEMENT =====
${placementGuidance}

===== COLOR INTEGRATION =====
${colorGuidance}

===== CRITICAL REQUIREMENTS =====
1. PRESERVE the background artwork EXACTLY as shown - DO NOT regenerate or modify it
2. ONLY add the text overlay on top of the existing artwork
3. The text "${titleText}" must appear EXACTLY as written - verify each letter
4. The text "${artistText}" must appear EXACTLY as written - verify each letter
5. Apply the typography style with professional effects (shadows, glows, gradients)
6. Make the text feel naturally integrated with the artwork's lighting and colors

OUTPUT: The same album cover artwork with the styled text overlay added.`;

      logStep("Calling Gemini for text re-typesetting (artwork-preserving)", { 
        titleText, 
        artistText,
        promptLength: retypesetPrompt.length 
      });

      try {
        currentImageUrl = await callLovableImageEdit(
          retypesetPrompt,
          currentImageUrl,
          effectiveStyleRefUrl ?? null
        );
        logStep("Stage 2 complete: Text re-typeset with Gemini");
      } catch (e) {
        logStep("Stage 2 failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to add text to cover");
      }
    }

    const finalImageUrl = currentImageUrl;

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
