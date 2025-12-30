import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Deduplicate to prevent "IS HERE" getting duplicated by the model
    .filter((it) => {
      const key = `${it.text.toLowerCase()}|${it.location ?? ""}|${it.approxSize ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { items };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, instructions, styleReferenceImageUrl, songTitle, artistName, coverAnalysis } = await req.json();
    logStep("Request received", {
      instructions: instructions?.slice(0, 100),
      hasImage: !!imageUrl,
      hasStyleRef: !!styleReferenceImageUrl,
      imageUrlPrefix: imageUrl?.slice(0, 50),
      songTitle,
      artistName,
      hasCoverAnalysis: !!coverAnalysis,
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

    logStep("Editing cover art with Lovable AI");

    const controller = new AbortController();
    const timeoutMs = 120_000; // 120 seconds for image editing
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

    const hasTextReplace =
      typeof instructions === "string" && instructions.includes("TEXT TYPOGRAPHY FULL REPLACE");

    // Determine the text to use: prefer metadata (100% accurate), fallback to extraction
    let extractedTextJson: string | null = null;
    
    if (hasTextReplace) {
      // If we have song metadata from the database, use it directly (no AI extraction needed)
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
        // Fallback: extract text from image (for older covers without metadata)
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

        const raw = await callLovableText(extractionPrompt, imageUrl);
        const extracted = tryParseExtractedText(raw);
        extractedTextJson = JSON.stringify(extracted);
        logStep("Text extraction complete (fallback)", {
          items: extracted.items.length,
          preview: extracted.items.slice(0, 4),
        });
      }
    }

    // Separate visual instructions from text instructions for multi-stage processing
    const hasVisualChanges = typeof instructions === "string" && (
      instructions.includes("Visual Style:") ||
      instructions.includes("Mood:") ||
      instructions.includes("Lighting:") ||
      instructions.includes("Texture:") ||
      instructions.includes("Colors:")
    );

    let currentImageUrl = imageUrl;

    // ===== STAGE 1A: DEDICATED TEXT ERASURE (only when text restyle is requested) =====
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

Remove ALL text now and output the cleaned, text-free image.`;

      try {
        currentImageUrl = await callLovableImageEdit(erasePrompt, currentImageUrl, null);
        logStep("Stage 1A complete: Text erased");
      } catch (e) {
        logStep("Stage 1A failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to erase text from cover");
      }
    }

    // ===== STAGE 1B: VISUAL STYLE CHANGES (only if requested, applied to text-free image) =====
    if (hasVisualChanges) {
      logStep("Stage 1B: Applying visual style changes");
      
      // Build visual-only instructions (exclude text-related parts)
      const visualPrompt = `You are an expert album cover art editor. Apply the following visual changes to this artwork.

REQUESTED VISUAL EDITS:
${instructions}

CRITICAL RULES:
- Apply the visual style, mood, lighting, texture, and color changes as requested
- Do NOT add any text or typography to the image
- Keep the image completely text-free
- Maintain the overall composition while applying the requested visual changes

Apply the visual changes now and output the edited image.`;

      try {
        currentImageUrl = await callLovableImageEdit(visualPrompt, currentImageUrl, null);
        logStep("Stage 1B complete: Visual changes applied");
      } catch (e) {
        logStep("Stage 1B failed; continuing with current image", {
          error: e instanceof Error ? e.message : String(e),
        });
        // Continue with current image if visual changes fail
      }
    }

    // ===== STAGE 2: RE-TYPESET TEXT (only when text restyle was requested) =====
    const finalImageUrl = hasTextReplace
      ? await (async () => {
          logStep("Stage 2: Re-typesetting text with selected style and color integration");

          // Build color integration rules from cover analysis
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

          // Build smart placement rules from cover analysis
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

Add the text now with the requested typography style, integrated colors, and smart placement.`;

          return await callLovableImageEdit(
            stage2Prompt,
            currentImageUrl,
            styleReferenceImageUrl ?? null
          );
        })()
      : currentImageUrl;

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
