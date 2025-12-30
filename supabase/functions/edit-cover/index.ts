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
    const { imageUrl, instructions, styleReferenceImageUrl, songTitle, artistName } = await req.json();
    logStep("Request received", {
      instructions: instructions?.slice(0, 100),
      hasImage: !!imageUrl,
      hasStyleRef: !!styleReferenceImageUrl,
      imageUrlPrefix: imageUrl?.slice(0, 50),
      songTitle,
      artistName,
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

    // Stage 1: Apply ALL requested edits, but ALWAYS remove existing typography completely when text restyle is requested.
    const stage1Prompt = `You are an expert album cover art editor. Follow instructions EXACTLY.

REQUESTED EDITS:
${instructions}

=== UNIVERSAL TYPOGRAPHY RULE (MANDATORY) ===
If any text style change is requested, you MUST:
1) COMPLETELY ERASE/INPAINT ALL existing text so none of the old typography, shine, embossing, glow, or effects remain.
2) Leave the cover with NO TEXT at all after this stage.

=== GENERAL ===
- Apply non-text edits (visual style, mood, lighting, textures, etc.) to the whole artwork as requested.
- Keep overall composition.

Output the edited image.`;

    let stage1ImageUrl: string;
    try {
      stage1ImageUrl = await callLovableImageEdit(stage1Prompt, imageUrl, null);
    } catch (e) {
      // If stage1 fails, fall back to one-pass edit to avoid breaking the flow.
      logStep("Stage1 failed; falling back to single-pass", {
        error: e instanceof Error ? e.message : String(e),
      });
      stage1ImageUrl = await callLovableImageEdit(
        `You are an expert album cover art editor. Follow these instructions EXACTLY.\n\nREQUESTED EDITS:\n${instructions}\n\nCRITICAL: Never add new words. If restyling text, fully replace it (erase then redraw).\n\nOutput the edited image.`,
        imageUrl,
        styleReferenceImageUrl ?? null
      );
    }

    // Stage 2: If text restyle requested, re-typeset ONLY the extracted words in the selected style.
    const finalImageUrl = hasTextReplace
      ? await (async () => {
          logStep("Stage2: re-typesetting text with exact extracted words");

          const stage2Prompt = `You are an expert typography compositor for album covers.

INPUT IMAGE:
- This image should currently have NO TEXT (text was erased in Stage 1).

STYLE REFERENCE (if provided):
- The style reference image shows ONLY the VISUAL TYPOGRAPHY STYLE.
- IGNORE any words in the style reference (e.g., \"SONG TITLE\"). Never copy that text.

EXACT TEXT TO PLACE (USE ONLY THIS JSON):
${extractedTextJson}

RULES (ABSOLUTE):
- Place ONLY the text contained in the JSON above, exactly once per item.
- Preserve exact spelling.
- Use the requested typography style (from reference / instruction context).
- Position text to match the original cover layout as closely as possible based on the location hints.
- DO NOT change the background artwork, lighting, subject, or composition at all — ONLY add the text.

Now add the text onto the cover with the requested style.`;

          return await callLovableImageEdit(
            stage2Prompt,
            stage1ImageUrl,
            styleReferenceImageUrl ?? null
          );
        })()
      : stage1ImageUrl;

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
