import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Subscription tier limits (monthly generation counts)
const SUBSCRIPTION_TIERS = {
  "prod_TaUTWhd9yIEw4B": { name: "starter", limit: 50 },
  "prod_TaUUCtQXelHcBD": { name: "pro", limit: 150 },
  "prod_TaUUG2rRmV18Nz": { name: "studio", limit: 500 },
};

// Get current month in YYYY-MM format
const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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
    .filter((it) => {
      const key = `${it.text.toLowerCase()}|${it.location ?? ""}|${it.approxSize ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return { items };
};

// Convert image URL to base64 for Google AI API
async function urlToBase64(url: string): Promise<string> {
  if (url.startsWith("data:")) {
    // Already base64, extract the data part
    const base64Part = url.split(",")[1];
    return base64Part;
  }
  
  // Fetch the image and convert to base64
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Declare outside try block so catch can access for rollback
  let userId: string | null = null;
  let creditDeducted = false;
  let previousCredits = 0;

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

    const effectiveImageUrl = baseArtworkUrl || imageUrl;
    
    if (!effectiveImageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing image URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHENTICATION & CREDIT CHECK ==========
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | null = null;
    let hasUnlimitedAccess = false;
    let subscriptionTier: string | null = null;
    let subscriptionLimit: number | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });

        // Check for subscription and determine tier/limits
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
                  const tierInfo = SUBSCRIPTION_TIERS[productId as keyof typeof SUBSCRIPTION_TIERS];
                  
                  if (tierInfo) {
                    subscriptionTier = tierInfo.name;
                    subscriptionLimit = tierInfo.limit;
                    hasUnlimitedAccess = true; // All subscription tiers skip credit check
                    logStep("User has subscription", { tier: subscriptionTier, limit: subscriptionLimit });
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

    // If user has subscription, check and enforce monthly limits
    if (subscriptionTier && subscriptionLimit && userId) {
      const currentMonth = getCurrentMonthYear();
      
      // Get current usage
      const { data: usageData, error: usageError } = await supabaseClient
        .from("subscription_usage")
        .select("generation_count")
        .eq("user_id", userId)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (usageError) {
        logStep("Error fetching usage (non-blocking)", { error: usageError.message });
      }

      const currentUsage = usageData?.generation_count || 0;
      logStep("Current monthly usage", { month: currentMonth, usage: currentUsage, limit: subscriptionLimit });

      // Check if limit exceeded
      if (currentUsage >= subscriptionLimit) {
        logStep("Monthly limit exceeded", { usage: currentUsage, limit: subscriptionLimit });
        return new Response(
          JSON.stringify({ 
            error: `Monthly generation limit reached (${currentUsage}/${subscriptionLimit}). Your limit resets at the start of next month.` 
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ========== CREDIT DEDUCTION (BEFORE EDIT) ==========
    if (userId && !hasUnlimitedAccess) {
      // Fetch current credits
      const { data: creditsData, error: creditsError } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching credits", { error: creditsError.message });
        return new Response(
          JSON.stringify({ error: "Failed to check credits. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      previousCredits = creditsData?.credits ?? 0;

      if (previousCredits < 1) {
        logStep("No credits remaining", { userId, credits: previousCredits });
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct credit BEFORE edit starts
      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({ credits: previousCredits - 1 })
        .eq("user_id", userId)
        .eq("credits", previousCredits); // Optimistic lock

      if (updateError) {
        logStep("Error deducting credit (race condition?)", { error: updateError.message });
        return new Response(
          JSON.stringify({ error: "Failed to reserve credit. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      creditDeducted = true;
      logStep("Credit reserved upfront", { previousCredits, newBalance: previousCredits - 1 });
    }

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!GOOGLE_AI_API_KEY) {
      // Rollback credit if we already deducted
      if (creditDeducted && userId) {
        await supabaseClient
          .from("user_credits")
          .update({ credits: previousCredits })
          .eq("user_id", userId);
        logStep("Credit rolled back due to missing API key");
      }
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const controller = new AbortController();
    const timeoutMs = 180_000; // 180 seconds for complex operations
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    // Helper function to call Google AI for text analysis
    const callGoogleText = async (prompt: string, imageBase64: string) => {
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured for text analysis");
      }
      
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
                { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
              ],
            },
          ],
          modalities: ["text"],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Text analysis error: ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      const text = json.choices?.[0]?.message?.content;
      if (!text) throw new Error("No text returned from analysis");
      return text;
    };

    // Helper function to call Google AI Studio directly for image editing (2K output)
    const callGoogleImageEdit = async (
      prompt: string,
      baseImageBase64: string,
      styleRefBase64?: string | null
    ): Promise<string> => {
      const parts: any[] = [];
      
      // Add style reference first if provided
      if (styleRefBase64) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: styleRefBase64
          }
        });
      }
      
      // Add the base image
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: baseImageBase64
        }
      });
      
      // Add the text prompt
      parts.push({ text: prompt });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "USER",
              parts: parts
            }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: {
                aspectRatio: "1:1",
                imageSize: "2K"  // Guaranteed 2048x2048 output
              }
            }
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Google AI image error: ${res.status} - ${errorText}`);
      }

      const json = await res.json();
      const imagePart = json.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      const outputBase64 = imagePart?.inlineData?.data;
      
      if (!outputBase64) {
        const textContent = json.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
        throw new Error(
          textContent
            ? `No edited image returned. Model said: ${String(textContent).slice(0, 180)}`
            : "No edited image returned"
        );
      }
      
      return `data:image/png;base64,${outputBase64}`;
    };

    // Mutable versions of key variables for legacy mode
    let effectiveSongTitle = songTitle;
    let effectiveArtistName = artistName;
    let effectiveInstructions = instructions;
    let effectiveStyleRefUrl = styleReferenceImageUrl;

    // Convert image URL to base64 for API calls
    const imageBase64 = await urlToBase64(effectiveImageUrl);

    // ===== TEXT LAYER MODE: Design Studio Pass 3-style text integration =====
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
        const detectRaw = await callGoogleText(detectPrompt, imageBase64);
        const detectParsed = JSON.parse(detectRaw.slice(detectRaw.indexOf("{"), detectRaw.lastIndexOf("}") + 1));
        detectedTitleZone = detectParsed.titleZone || "center";
        detectedArtistZone = detectParsed.artistZone || "lower";
        logStep("TEXT LAYER MODE: Detected text positions", { detectedTitleZone, detectedArtistZone });
      } catch (e) {
        logStep("TEXT LAYER MODE: Position detection failed, using defaults", { error: e instanceof Error ? e.message : String(e) });
      }
      
      // Step 2: Erase text from image
      let cleanBaseUrl: string;
      const erasePrompt = `You are an image inpainting specialist. COMPLETELY REMOVE ALL TEXT from this album cover.
ERASE every letter, word, and character. Use context-aware inpainting to fill where text was.
The result must have ZERO visible text remaining. Do NOT add any new text.
Keep the artwork style, colors, mood, and composition exactly the same - ONLY remove text.
Maintain FULL RESOLUTION and DETAIL. Output the cleaned, text-free album art.`;

      try {
        cleanBaseUrl = await callGoogleImageEdit(erasePrompt, imageBase64, null);
        logStep("TEXT LAYER MODE: Base artwork cleaned (text removed)");
      } catch (e) {
        logStep("TEXT LAYER MODE: Text erasure failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to prepare base artwork for text layer");
      }
      
      // Step 3: Regenerate full image with integrated text
      const cleanBase64 = await urlToBase64(cleanBaseUrl);
      const styleRefBase64 = styleRefUrl ? await urlToBase64(styleRefUrl) : null;
      
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

===== COLOR INTEGRATION =====
${colorGuidance}
Add shadows, glows, or gradients that match the artwork's lighting direction.

===== REQUIRED =====
- Text must match the user's selected style EXACTLY (font, weight, effects, texture)
- Text must exist as part of the environment
- Text must interact with light, shadow, depth
- Background artwork must be IDENTICAL to the reference

OUTPUT: The album cover with the styled text integrated into the scene.`;

      try {
        logStep("TEXT LAYER MODE: Regenerating with integrated text");
        
        const finalImageUrl = await callGoogleImageEdit(
          integrationPrompt,
          cleanBase64,
          styleRefBase64
        );
        
        logStep("TEXT LAYER MODE: Text integration complete");
        
        clearTimeout(timeout);
        
        // ========== INCREMENT SUBSCRIPTION USAGE (ON SUCCESS) ==========
        if (userId && hasUnlimitedAccess && subscriptionTier) {
          const currentMonth = getCurrentMonthYear();
          try {
            const { data: existingUsage } = await supabaseClient
              .from("subscription_usage")
              .select("generation_count")
              .eq("user_id", userId)
              .eq("month_year", currentMonth)
              .maybeSingle();

            if (existingUsage) {
              await supabaseClient
                .from("subscription_usage")
                .update({ generation_count: existingUsage.generation_count + 1 })
                .eq("user_id", userId)
                .eq("month_year", currentMonth);
            } else {
              await supabaseClient
                .from("subscription_usage")
                .insert({ user_id: userId, month_year: currentMonth, generation_count: 1 });
            }
            logStep("Subscription usage incremented", { month: currentMonth });
          } catch (usageError) {
            logStep("Error incrementing usage (non-blocking)", { error: usageError instanceof Error ? usageError.message : String(usageError) });
          }
        }
        
        return new Response(JSON.stringify({ 
          imageUrl: finalImageUrl,
          baseArtworkUrl: cleanBaseUrl,
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

        const raw = await callGoogleText(extractionPrompt, imageBase64);
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

    let currentImageBase64 = imageBase64;
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
        currentImageUrl = await callGoogleImageEdit(simpleEditPrompt, currentImageBase64, null);
        currentImageBase64 = await urlToBase64(currentImageUrl);
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
- Use context-aware inpainting to seamlessly fill where text was
- The result MUST have ZERO visible text, typography, lettering, or characters remaining
- Do NOT add any new text whatsoever
- Do NOT change the artwork style, colors, mood, or composition - ONLY remove text

QUALITY PRESERVATION (MANDATORY):
- Maintain the FULL RESOLUTION and DETAIL of the original image
- The output must be as CRISP and HIGH-QUALITY as the input

Remove ALL text now and output the cleaned, text-free image.`;

      try {
        currentImageUrl = await callGoogleImageEdit(erasePrompt, currentImageBase64, null);
        currentImageBase64 = await urlToBase64(currentImageUrl);
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

Apply the visual changes now and output the edited image.`;

      try {
        currentImageUrl = await callGoogleImageEdit(visualPrompt, currentImageBase64, null);
        currentImageBase64 = await urlToBase64(currentImageUrl);
        logStep("Stage 1B complete: Visual changes applied");
      } catch (e) {
        logStep("Stage 1B failed; continuing with current image", {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Stage 2: Re-typeset text
    if (hasTextReplace) {
      logStep("Stage 2: Re-typesetting text");

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
          if (!titleText && parsed.items[0]) titleText = parsed.items[0].text;
          if (!artistText && parsed.items[1]) artistText = parsed.items[1].text;
        }
      } catch (e) {
        logStep("Failed to parse text data", { error: e instanceof Error ? e.message : String(e) });
      }

      const fullStylePrompt = typography?.stylePrompt || null;
      const styleDescription = fullStylePrompt || "Modern, bold typography with artistic effects";
      
      const placementGuidance = coverAnalysis?.safeTextZones?.length
        ? `Position text in these areas: ${coverAnalysis.safeTextZones.join(', ')}.`
        : "Position title prominently, artist name smaller below or near title.";

      const colorGuidance = coverAnalysis?.dominantColors?.length
        ? `Use colors that complement the cover's palette: ${coverAnalysis.dominantColors.join(', ')}.`
        : "Use colors sampled from the artwork for text.";

      // Get style reference image if available
      let styleRefBase64: string | null = null;
      if (effectiveStyleRefUrl) {
        try {
          styleRefBase64 = await urlToBase64(effectiveStyleRefUrl);
        } catch (e) {
          logStep("Failed to load style reference", { error: e instanceof Error ? e.message : String(e) });
        }
      }

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

===== TYPOGRAPHY STYLE =====
${styleDescription}
${styleRefBase64 ? '- Match the visual style shown in the style reference image' : ''}

===== TEXT PLACEMENT =====
${placementGuidance}

===== COLOR INTEGRATION =====
${colorGuidance}

===== CRITICAL REQUIREMENTS =====
1. PRESERVE the background artwork EXACTLY as shown
2. ONLY add the text overlay on top of the existing artwork
3. Spell all text EXACTLY as provided
4. Apply the typography style with professional effects

OUTPUT: The same album cover artwork with the styled text overlay added.`;

      logStep("Calling Google AI for text re-typesetting", { 
        titleText, 
        artistText,
        promptLength: retypesetPrompt.length 
      });

      try {
        currentImageUrl = await callGoogleImageEdit(
          retypesetPrompt,
          currentImageBase64,
          styleRefBase64
        );
        logStep("Stage 2 complete: Text re-typeset");
      } catch (e) {
        logStep("Stage 2 failed", { error: e instanceof Error ? e.message : String(e) });
        throw new Error("Failed to add text to cover");
      }
    }

    const finalImageUrl = currentImageUrl;

    clearTimeout(timeout);
    
    // ========== INCREMENT SUBSCRIPTION USAGE (ON SUCCESS) ==========
    if (userId && hasUnlimitedAccess && subscriptionTier) {
      const currentMonth = getCurrentMonthYear();
      try {
        // Try to upsert the usage record
        const { data: existingUsage } = await supabaseClient
          .from("subscription_usage")
          .select("generation_count")
          .eq("user_id", userId)
          .eq("month_year", currentMonth)
          .maybeSingle();

        if (existingUsage) {
          await supabaseClient
            .from("subscription_usage")
            .update({ generation_count: existingUsage.generation_count + 1 })
            .eq("user_id", userId)
            .eq("month_year", currentMonth);
        } else {
          await supabaseClient
            .from("subscription_usage")
            .insert({ user_id: userId, month_year: currentMonth, generation_count: 1 });
        }
        logStep("Subscription usage incremented", { month: currentMonth });
      } catch (usageError) {
        logStep("Error incrementing usage (non-blocking)", { error: usageError instanceof Error ? usageError.message : String(usageError) });
      }
    }
    
    logStep("Cover edited successfully");

    return new Response(JSON.stringify({ imageUrl: finalImageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // ========== ROLLBACK CREDIT ON FAILURE ==========
    if (creditDeducted && userId) {
      try {
        await supabaseClient
          .from("user_credits")
          .update({ credits: previousCredits })
          .eq("user_id", userId);
        logStep("Credit rolled back due to error", { previousCredits });
      } catch (rollbackError) {
        logStep("Failed to rollback credit", { error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError) });
      }
    }
    
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to edit cover" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
