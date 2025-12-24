import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs for unlimited tiers
const UNLIMITED_PRODUCT_IDS = [
  "prod_TaUUCtQXelHcBD", // Pro
  "prod_TaUUG2rRmV18Nz", // Studio
];

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-COVER] ${step}${detailsStr}`);
};

// Pre-flight analysis result type
interface AnalysisResult {
  spellingCorrect: boolean;
  noDuplicates: boolean;
  textWithinBounds: boolean;
  integrationGood: boolean;
  noPlaceholderText: boolean;
  issues: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { prompt, genre, style, mood, referenceImage, textStyleReferenceImage } = await req.json();
    logStep("Request received", { 
      prompt: prompt?.slice(0, 50), 
      genre, 
      style, 
      mood, 
      hasReferenceImage: !!referenceImage,
      hasTextStyleReference: !!textStyleReferenceImage 
    });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userEmail: string | null = null;
    let hasUnlimitedAccess = false;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
        logStep("User authenticated", { userId, email: userEmail });

        // Check for Pro/Studio subscription (unlimited access)
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
                  if (UNLIMITED_PRODUCT_IDS.includes(productId)) {
                    hasUnlimitedAccess = true;
                    logStep("User has unlimited access", { productId });
                    break;
                  }
                }
              }
            } catch (stripeError) {
              logStep("Stripe check error (continuing)", { error: stripeError instanceof Error ? stripeError.message : String(stripeError) });
            }
          }
        }

        if (!hasUnlimitedAccess) {
          logStep("Credits will be deducted after generation (not upfront)");
        }
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    logStep("Generating cover art with hybrid system");

    // Extract song title and artist name from the prompt for strict enforcement
    const songTitleMatch = prompt.match(/Song Title:\s*([^|]+)/i);
    const artistNameMatch = prompt.match(/Artist:\s*([^|]+)/i);
    const actualSongTitle = songTitleMatch ? songTitleMatch[1].trim() : null;
    const actualArtistName = artistNameMatch ? artistNameMatch[1].trim() : null;
    
    logStep("Extracted text from prompt", { songTitle: actualSongTitle, artistName: actualArtistName });

    // Build letter-by-letter spelling for strict enforcement
    const songTitleSpelling = actualSongTitle ? actualSongTitle.toUpperCase().split('').join('-') : '';
    const artistNameSpelling = actualArtistName ? actualArtistName.split('').join('-') : '';
    const songTitleCharCount = actualSongTitle ? actualSongTitle.length : 0;
    const artistNameCharCount = actualArtistName ? actualArtistName.length : 0;

    // Build the critical text instruction that will be added to ALL prompts
    const textEnforcementRule = actualSongTitle 
      ? `

=== ABSOLUTE CRITICAL RULE - TEXT CONTENT & SPELLING ===
The song title MUST be EXACTLY: "${actualSongTitle}"
SPELL IT LETTER BY LETTER: ${songTitleSpelling}
EXACT CHARACTER COUNT: ${songTitleCharCount} characters

The artist name MUST be EXACTLY: "${actualArtistName || 'as specified'}"
${actualArtistName ? `SPELL IT LETTER BY LETTER: ${artistNameSpelling}` : ''}
${actualArtistName ? `EXACT CHARACTER COUNT: ${artistNameCharCount} characters` : ''}

CRITICAL SPELLING CHECK: Before finalizing, verify each letter:
- Song title "${actualSongTitle}" has these exact letters: ${songTitleSpelling}
- Every single letter must be correct - no substitutions, no corruption

FORBIDDEN: NEVER write "Song Title" as literal text. NEVER use placeholder text.
The ONLY text that should appear is the EXACT song title and artist name provided above.
If ANY letter is wrong or corrupted, the output is REJECTED.
===`
      : "";

    // Build the fill-canvas rule - CRITICAL for no borders + high quality
    const fillCanvasRule = `

=== ABSOLUTE CANVAS FILL REQUIREMENT (CRITICAL - FAILURE = REJECTION) ===
The artwork MUST completely fill the ENTIRE 3000x3000 pixel canvas with ZERO exceptions.
ZERO empty space. ZERO borders. ZERO margins. ZERO padding. ZERO letterboxing.
NO black borders. NO white borders. NO grey borders. NO empty corners.
The visual content (background, artwork, textures) MUST extend COMPLETELY edge-to-edge on ALL FOUR sides.
Every single pixel along every edge MUST contain artwork - NOT empty/black/white/grey background.
The background must BLEED FULLY OFF all four edges with NO visible boundary.
If ANY pixel along ANY edge is empty, solid black, solid white, solid grey, or any uniform padding color, the output is IMMEDIATELY REJECTED.

=== QUALITY & RESOLUTION REQUIREMENT ===
Generate at the HIGHEST possible detail and sharpness.
The output must be print-ready, ultra-crisp, with no blur, no noise, no compression artifacts.
Render all textures, lighting, and details at maximum fidelity as if for a gallery print.
===`;

    // Extract TEXT STYLING INSTRUCTIONS from user prompt (these come from the variant's promptInstructions)
    const textStylingMatch = prompt.match(/TEXT STYLING INSTRUCTIONS:\s*([^|]+)/i);
    const userTextStylingInstructions = textStylingMatch ? textStylingMatch[1].trim() : null;
    
    logStep("Extracted text styling instructions", { hasInstructions: !!userTextStylingInstructions, preview: userTextStylingInstructions?.slice(0, 100) });

    // Helper function to enhance user prompt with rich detail and text integration plan
    const enhanceUserPrompt = async (userPrompt: string): Promise<{ enhancedDescription: string; textIntegrationPlan: string }> => {
      logStep("Enhancing user prompt with gemini-2.5-flash-lite");
      
      // Extract just the description part (after "Description:")
      const descriptionMatch = userPrompt.match(/Description:\s*(.+?)(?:\s*$|\s*Song Title:)/is);
      const coreIdea = descriptionMatch ? descriptionMatch[1].trim() : userPrompt;
      
      // Build typography section - if user has specific text style instructions, preserve them!
      const typographySection = userTextStylingInstructions 
        ? `=== USER'S CHOSEN TEXT STYLE (MUST FOLLOW EXACTLY) ===
The user has selected a specific text style. You MUST respect this choice.
USER'S TEXT STYLE: "${userTextStylingInstructions}"

Your textIntegrationPlan should focus ONLY on WHERE to place the text for readability.
DO NOT suggest a different typography style - the user's choice is final.
Just plan the optimal POSITION for the text (top, bottom, clear space areas).`
        : `=== TEXT RULES (NO REFERENCE STYLE PROVIDED) ===
READABILITY IS THE #1 PRIORITY. The text must be EASY TO READ at a glance.

TYPOGRAPHY REQUIREMENTS:
- Use MODERN, PREMIUM typography that looks like 2024-2025 design (think Apple, high-end fashion, Spotify editorial)
- NEVER use dated effects like: bevels, embossing, drop shadows, reflections/mirror effects, 3D extrusion, chrome/metallic gradients, WordArt-style effects
- Clean, sophisticated fonts - elegant serifs OR bold modern sans-serifs
- The artist name should be SIMPLE and LEGIBLE - clean typography, no effects`;

      const enhancementPrompt = `You are a creative director for premium album cover art. Take this basic concept and expand it into a rich, detailed visual description.

USER'S CORE IDEA: "${coreIdea}"
GENRE: ${genre}
STYLE: ${style}
MOOD: ${mood}

=== ABSOLUTE SPATIAL PRESERVATION RULES (CRITICAL - NEVER VIOLATE) ===
You MUST preserve the EXACT spatial relationships the user described. This is NON-NEGOTIABLE.

SPATIAL TERMS ARE LITERAL:
- "on top of X" = subject is ABOVE X, resting on its surface, looking DOWN at or OUT from X
- "in front of X" = subject is positioned BEFORE X, facing the viewer
- "behind X" = subject is positioned AFTER X, partially or fully obscured
- "next to X" = subject is BESIDE X, at the same level
- "between X and Y" = subject is IN THE MIDDLE of X and Y
- "under X" = subject is BELOW X

FORBIDDEN REINTERPRETATIONS:
- NEVER change "on top of" to "between" or "bridging" or "spanning"
- NEVER add structures (bridges, platforms, tunnels) that change the spatial relationship
- NEVER reposition the subject relative to the environment differently than described
- NEVER add chasms, gaps, or voids that weren't mentioned

Your task:
1. EXPAND the visual description with specific, vivid details (lighting, textures, atmosphere, colors)
2. PRESERVE EXACTLY the user's spatial description - do NOT reinterpret positions or add new structural elements
3. Only add ATMOSPHERIC details (lighting, weather, textures, colors) - NOT new objects or structural changes
4. Write ONE detailed paragraph for the TEXT PLACEMENT plan for the song title "${actualSongTitle}" and artist name "${actualArtistName}"

${typographySection}

TEXT PLACEMENT:
- Place text in CLEAR SPACE where it's easily readable - NOT on top of busy/dark objects
- Text should COMPLEMENT the scene, not be hidden within it
- Use contrast: light text on dark areas, dark text on light areas
- Good positions: top area against sky/atmosphere, bottom area against floor/ground, or floating in negative space
- NEVER place text directly ON the main subject where it becomes illegible

Respond with ONLY this JSON format (no markdown, no explanation):
{
  "enhancedDescription": "Your expanded visual description with ONLY lighting/texture/atmosphere additions - NO changes to spatial positioning or new structural elements",
  "textIntegrationPlan": "Describe WHERE to place text for readability and HOW to make it feel cohesive with the scene through color/atmosphere",
  "spatialValidation": "Confirm: [subject] is [exact position from user's description] relative to [environment] - no structural additions"
}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12_000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "user",
                content: enhancementPrompt,
              },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          logStep("Prompt enhancement failed", { status: response.status });
          return { enhancedDescription: coreIdea, textIntegrationPlan: "" };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        logStep("Prompt enhancement raw response", { content: content.slice(0, 500) });

        // Parse JSON from response
        let jsonStr = content;
        if (content.includes("```")) {
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          jsonStr = match ? match[1].trim() : content;
        }

        try {
          const result = JSON.parse(jsonStr);
          logStep("Prompt enhanced successfully", { 
            originalLength: coreIdea.length, 
            enhancedLength: result.enhancedDescription?.length || 0,
            hasIntegrationPlan: !!result.textIntegrationPlan
          });
          return {
            enhancedDescription: result.enhancedDescription || coreIdea,
            textIntegrationPlan: result.textIntegrationPlan || "",
          };
        } catch (parseError) {
          logStep("Failed to parse enhancement JSON", { error: String(parseError) });
          return { enhancedDescription: coreIdea, textIntegrationPlan: "" };
        }
      } catch (e) {
        logStep("Prompt enhancement error", { error: e instanceof Error ? e.message : String(e) });
        return { enhancedDescription: coreIdea, textIntegrationPlan: "" };
      }
    };

    // Enhance the user's prompt before generation
    const { enhancedDescription, textIntegrationPlan } = await enhanceUserPrompt(prompt);
    
    // Build text integration instruction if we have a plan
    // Typography rules only apply when NO text style reference is provided
    const typographyRules = textStyleReferenceImage 
      ? `
TEXT STYLE: A reference image defines the EXACT text style to use. REPLICATE IT FLAWLESSLY.
The song title MUST match the reference style exactly - font, effects, colors, everything.
Artist name should COMPLEMENT the reference style.`
      : `
TYPOGRAPHY (no style reference provided):
- Use MODERN 2024-2025 premium typography (think Apple, high-end fashion, Spotify editorial)
- NEVER use dated effects: bevels, embossing, reflections/mirrors, 3D extrusion, chrome gradients, WordArt effects
- Artist name must be CLEAN and SIMPLE - elegant typography, no fancy effects
- Song title can be more stylized but must remain LEGIBLE`;

    const textIntegrationInstruction = textIntegrationPlan 
      ? `

=== CRITICAL TEXT PLACEMENT & STYLING (FOLLOW EXACTLY) ===
${textIntegrationPlan}

MANDATORY RULES:
- READABILITY IS #1 PRIORITY - text must be instantly readable at a glance
- Place text in CLEAR SPACE with good contrast - NOT on top of busy/dark objects
${typographyRules}
===`
      : "";

    let requestBody: any;

    if (referenceImage) {
      // Image editing mode - use the reference image (user uploaded photo)
      logStep("Using reference image for editing");
      
      const contentParts: any[] = [
        { type: "text", text: `You are a world-class album cover designer. Edit this image to create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

Keep the main subject/person from the original image but transform it according to these instructions:
${enhancedDescription}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
${textEnforcementRule}
${textIntegrationInstruction}
${fillCanvasRule}

CRITICAL REQUIREMENTS:
1. Output resolution MUST be exactly 3000x3000 pixels - PERFECTLY SQUARE
2. Preserve the likeness and key features of the person/subject in the original image
3. The text (song title and artist name) must be DEEPLY INTEGRATED into the artwork - not just placed on top
4. ALL text must be FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF AT ANY EDGE - maintain at least 15% margin from all edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements
7. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.` },
        { type: "image_url", image_url: { url: referenceImage } }
      ];

      // If there's a text style reference, include it for the AI to match
      if (textStyleReferenceImage) {
        // Build user's text style description if provided
        const userStyleDesc = userTextStylingInstructions 
          ? `\n\n=== USER'S SELECTED TEXT STYLE DESCRIPTION ===
The user selected this specific style: "${userTextStylingInstructions}"
This description tells you what the second reference image shows. Use BOTH the description AND the reference image to ensure accurate replication.
===\n`
          : "";

        contentParts[0] = { 
          type: "text", 
          text: `You are a world-class album cover designer. Edit this image to create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (square 1:1 aspect ratio).

Keep the main subject/person from the original image but transform it.

${enhancedDescription}

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
${textEnforcementRule}
${textIntegrationInstruction}
${fillCanvasRule}
${userStyleDesc}
=== TEXT STYLE REPLICATION - THIS IS YOUR #1 PRIORITY ===
LOOK AT THE SECOND REFERENCE IMAGE. This shows the EXACT text style you MUST use for the song title.

STEP-BY-STEP REPLICATION PROCESS:
1. ANALYZE the reference image: What is the EXACT font style? (serif, sans-serif, script, italic, bold, etc.)
2. IDENTIFY the specific characteristics: Is it italic? Bold? Condensed? Extended? What is the letter spacing?
3. NOTE the exact color: White? Black? Colored? Gradient?
4. CHECK for effects: Does it have glow? Shadow? Texture? Or is it CLEAN with NO effects?
5. REPLICATE these EXACT characteristics - do NOT add anything the reference doesn't show

WHAT THE REFERENCE SHOWS, YOU COPY:
- If reference shows BOLD ITALIC WHITE TEXT → use bold italic white text
- If reference shows CLEAN SANS-SERIF → use clean sans-serif, NO added effects
- If reference shows GLOWING NEON → use glowing neon effect
- If reference has NO EFFECTS → your text has NO EFFECTS

FORBIDDEN ACTIONS:
- DO NOT add glow if reference has no glow
- DO NOT add texture if reference is clean
- DO NOT use thin font if reference is bold
- DO NOT use script if reference is sans-serif
- DO NOT change the color scheme
- DO NOT "enhance" or "improve" the style - MATCH IT EXACTLY
- DO NOT add cracks, distressed textures, grunge, chips, or "broken" lettering unless clearly in reference

ADDITIONAL REQUIREMENTS:
1. Output resolution MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE - not landscape, not portrait)
2. Preserve the likeness of the person/subject from the first image
3. PHOTOREALISTIC quality throughout
4. Create a COMPLEMENTARY but simpler style for the artist name
5. NO BORDERS - artwork must extend to every edge
6. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
7. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`
        };
        contentParts.push({ type: "image_url", image_url: { url: textStyleReferenceImage } });
        logStep("Added text style reference image");
      }

      requestBody = {
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        modalities: ["image", "text"],
      };
    } else if (textStyleReferenceImage) {
      // Text generation with style reference - AI sees the style to match
      logStep("Using text style reference image for generation");
      
      // Build user's text style description if provided
      const userStyleDescription = userTextStylingInstructions 
        ? `\n\n=== USER'S SELECTED TEXT STYLE DESCRIPTION ===
The user selected this specific style: "${userTextStylingInstructions}"
This description tells you what the reference image shows. Use BOTH the description AND the reference image to ensure accurate replication.
===\n`
        : "";

      const stylePrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (MUST BE PERFECTLY SQUARE - 1:1 aspect ratio).

USER REQUEST:
${enhancedDescription}

MUSIC CONTEXT:
- Genre: ${genre}
- Visual Style: ${style}
- Mood/Vibe: ${mood}
${textEnforcementRule}
${textIntegrationInstruction}
${fillCanvasRule}
${userStyleDescription}
=== TEXT STYLE REPLICATION - THIS IS YOUR #1 PRIORITY ===
LOOK AT THE ATTACHED REFERENCE IMAGE. This shows the EXACT text style you MUST use for the song title.

STEP-BY-STEP REPLICATION PROCESS:
1. ANALYZE the reference image: What is the EXACT font style? (serif, sans-serif, script, italic, bold, etc.)
2. IDENTIFY the specific characteristics: Is it italic? Bold? Condensed? Extended? What is the letter spacing?
3. NOTE the exact color: White? Black? Colored? Gradient?
4. CHECK for effects: Does it have glow? Shadow? Texture? Or is it CLEAN with NO effects?
5. REPLICATE these EXACT characteristics - do NOT add anything the reference doesn't show

WHAT THE REFERENCE SHOWS, YOU COPY:
- If reference shows BOLD ITALIC WHITE TEXT → use bold italic white text
- If reference shows CLEAN SANS-SERIF → use clean sans-serif, NO added effects
- If reference shows GLOWING NEON → use glowing neon effect
- If reference has NO EFFECTS → your text has NO EFFECTS

CRITICAL: The reference image typography IS the design. 
- Same font weight (thin/regular/bold/heavy)
- Same font style (upright/italic/oblique)
- Same font family type (serif/sans-serif/script/display)
- Same color treatment
- Same effects (or LACK of effects)

FORBIDDEN ACTIONS:
- DO NOT add glow if reference has no glow
- DO NOT add texture if reference is clean
- DO NOT use thin font if reference is bold
- DO NOT use script if reference is sans-serif
- DO NOT change the color scheme
- DO NOT "enhance" or "improve" the style - MATCH IT EXACTLY

QUALITY REQUIREMENTS:
1. Output MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE)
2. PHOTOREALISTIC quality - this should look like a real professional album cover
3. Spend extra effort perfecting the REALISM and DETAIL of all elements
4. The artwork should be gallery-worthy, not AI-generated looking
5. Text must be deeply integrated into the scene
6. Create a COMPLEMENTARY but simpler style for the artist name
7. NO BORDERS - artwork must extend to every edge
8. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
9. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`;

      requestBody = {
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: stylePrompt },
              { type: "image_url", image_url: { url: textStyleReferenceImage } }
            ],
          },
        ],
        modalities: ["image", "text"],
      };
    } else {
      // Text-only generation mode (no reference images)
      const generationPrompt = `You are a world-class album cover designer. Create ULTRA PHOTOREALISTIC, PROFESSIONAL album cover art at EXACTLY 3000x3000 pixels resolution (MUST BE PERFECTLY SQUARE - 1:1 aspect ratio).

Genre: ${genre}
Visual Style: ${style}
Mood/Vibe: ${mood}
Subject: ${enhancedDescription}
${textEnforcementRule}
${textIntegrationInstruction}
${fillCanvasRule}

CRITICAL REQUIREMENTS:
1. Output MUST be EXACTLY 3000x3000 pixels (PERFECTLY SQUARE - not landscape, not portrait)
2. Text (song title and artist name) must be DEEPLY INTEGRATED into the artwork, not just overlaid
3. NO BORDERS - artwork must extend to every edge
4. ALL TEXT MUST BE FULLY VISIBLE - TEXT MUST NEVER BE CUT OFF - keep at least 15% margin from all edges
5. PHOTOREALISTIC quality - this should look like a real professional album cover
6. Spend extra effort perfecting the REALISM and DETAIL of all elements
7. The image should be bold, memorable, and capture the essence of ${genre} music with a ${mood?.toLowerCase() || 'dynamic'} atmosphere
8. The design MUST FILL THE ENTIRE 3000x3000 canvas - NO empty space, NO borders or margins around the artwork

IMPORTANT: After generating, review the output and ensure artwork extends to every edge with NO visible borders.`;

      requestBody = {
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: generationPrompt,
          },
        ],
        modalities: ["image", "text"],
      };
    }

    // Helper function to make AI image request with retry logic
    const makeImageRequest = async (body: any, maxRetries = 2): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Image request attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeoutMs = 55_000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        let response: Response;
        try {
          response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } catch (e) {
          clearTimeout(timeout);
          if (e instanceof DOMException && e.name === "AbortError") {
            logStep("Image request timed out", { attempt, timeoutMs });
            if (attempt === maxRetries) {
              throw new Error("Generation timed out. Please try again.");
            }
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("AI gateway error", { status: response.status, error: errorText });

          if (response.status === 429) {
            throw new Error("RATE_LIMIT");
          }
          if (response.status === 402) {
            throw new Error("CREDITS_EXHAUSTED");
          }
          
          if (attempt === maxRetries) {
            throw new Error(`AI gateway error: ${response.status}`);
          }
          continue;
        }

        const data = await response.json();
        logStep("AI response received", { attempt });

        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (!imageUrl) {
          const textContent = data.choices?.[0]?.message?.content;
          logStep("No image in response", { attempt, hasText: !!textContent, textPreview: textContent?.slice(0, 100) });
          
          if (attempt === maxRetries) {
            throw new Error("The AI could not generate an image. Please try again with a different prompt.");
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        return imageUrl;
      }
      throw new Error("Failed to generate image after retries");
    };

    // Helper function for pre-flight analysis using cheap text model
    const runPreflightAnalysis = async (imageUrl: string): Promise<AnalysisResult> => {
      logStep("Running pre-flight analysis with gemini-2.5-flash-lite");
      
       const analysisPrompt = `You are a quality control inspector for album covers. Analyze this image and check for issues.

Expected text on the cover:
- Song title: "${actualSongTitle || 'N/A'}" (spelled: ${songTitleSpelling || 'N/A'}, ${songTitleCharCount} characters)
- Artist name: "${actualArtistName || 'N/A'}" (spelled: ${artistNameSpelling || 'N/A'}, ${artistNameCharCount} characters)

Check these 5 things carefully and respond with ONLY a JSON object (no markdown, no explanation):

1. spellingCorrect: Is the song title spelled EXACTLY as "${actualSongTitle}"? Check each letter. Is the artist name spelled correctly?
2. noDuplicates: Does the song title appear only ONCE? Does the artist name appear only ONCE? (No duplicate text anywhere)
3. textWithinBounds: Is ALL text fully visible? Are any letters cut off at the edges?
4. integrationGood: Does the text look naturally integrated with the artwork (not pasted on top)?
5. noPlaceholderText: Ensure NONE of these appear anywhere: "SONG TITLE", "Song Title", "ARTIST NAME", "Artist Name", "TITLE", "TRACK".

Respond with ONLY this JSON format:
{"spellingCorrect": true/false, "noDuplicates": true/false, "textWithinBounds": true/false, "integrationGood": true/false, "noPlaceholderText": true/false, "issues": ["list of specific issues found"]}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: analysisPrompt },
                  { type: "image_url", image_url: { url: imageUrl } }
                ],
              },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          logStep("Pre-flight analysis request failed", { status: response.status });
           // Return pessimistic result to trigger fixes
           return { spellingCorrect: false, noDuplicates: false, textWithinBounds: false, integrationGood: false, noPlaceholderText: false, issues: ["Analysis failed"] };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        logStep("Pre-flight raw response", { content: content.slice(0, 500) });

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = content;
        if (content.includes("```")) {
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          jsonStr = match ? match[1].trim() : content;
        }

        try {
          const result = JSON.parse(jsonStr);
          logStep("Pre-flight analysis result", result);
           return {
             spellingCorrect: result.spellingCorrect ?? false,
             noDuplicates: result.noDuplicates ?? false,
             textWithinBounds: result.textWithinBounds ?? false,
             integrationGood: result.integrationGood ?? false,
             noPlaceholderText: result.noPlaceholderText ?? false,
             issues: result.issues || [],
           };
        } catch (parseError) {
           logStep("Failed to parse analysis JSON, using pessimistic defaults", { error: String(parseError) });
           return { spellingCorrect: false, noDuplicates: false, textWithinBounds: false, integrationGood: false, noPlaceholderText: false, issues: ["Parse error"] };
        }
      } catch (e) {
         logStep("Pre-flight analysis error", { error: e instanceof Error ? e.message : String(e) });
         // Return pessimistic result to trigger fixes
         return { spellingCorrect: false, noDuplicates: false, textWithinBounds: false, integrationGood: false, noPlaceholderText: false, issues: ["Analysis error"] };
      }
    };

    // Helper function for Fix Pass A: Text Issues (spelling, duplicates, boundaries)
    const runTextFixPass = async (imageUrl: string): Promise<string> => {
      logStep("Running Fix Pass A - Text issues (spelling, duplicates, boundaries)");
      
      const textStyleInstruction = textStyleReferenceImage 
        ? `\n\n=== CRITICAL: PRESERVE TEXT STYLE FROM REFERENCE ===
A reference image showing the EXACT text style is included. When making ANY changes to text:
- MAINTAIN the exact font style, weight, and letterforms from the reference
- MAINTAIN the exact effects (glow, blur, texture, shadow, etc.) from the reference
- MAINTAIN the exact color palette from the reference
- DO NOT substitute with a different style - the reference is ABSOLUTE
`
        : '';
      
      const fixPrompt = `You are a precision text specialist. Fix ALL text issues on this album cover while PRESERVING the exact visual style.

Song title MUST be EXACTLY: "${actualSongTitle || 'as shown'}" (spelled: ${songTitleSpelling || 'as shown'}, ${songTitleCharCount} chars)
Artist name MUST be EXACTLY: "${actualArtistName || 'as shown'}" (spelled: ${artistNameSpelling || 'as shown'}, ${artistNameCharCount} chars)
${textStyleInstruction}

=== HARD BAN: PLACEHOLDER / TEMPLATE TEXT ===
If you see ANY of these anywhere on the artwork, REMOVE them completely and replace with the correct real text:
- "SONG TITLE" / "Song Title" / "SONG TITTLE"
- "ARTIST" / "ARTIST NAME" / "Artist Name"
- Any generic placeholders like "TITLE", "TRACK", "NAME"

=== FIX THESE ISSUES ===
1. SPELLING: If ANY letter is wrong, ERASE the entire word and rewrite it correctly. Verify EVERY letter.
2. DUPLICATES: If text appears more than once, KEEP ONLY ONE instance and REMOVE all others completely.
3. BOUNDARIES: ALL text must be FULLY visible with 100px+ margin from edges. Scale down or reposition if needed.

=== STRICT RULES ===
- DO NOT change the background artwork or composition
- ${textStyleReferenceImage ? 'TEXT STYLE IS SACRED - Match the exact style from the reference image' : 'Keep the artistic style of the text intact'}
- Keep 3000x3000 pixel dimensions
- Output must extend edge-to-edge with NO borders (but text must have margins)

Output at maximum quality.`;

      const content: any[] = [
        { type: "text", text: fixPrompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
      if (textStyleReferenceImage) {
        content.push({ type: "image_url", image_url: { url: textStyleReferenceImage } });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const fixedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (fixedUrl) {
            logStep("Fix Pass A complete - text issues fixed");
            return fixedUrl;
          }
        }
        logStep("Fix Pass A failed, using original");
        return imageUrl;
      } catch (e) {
        logStep("Fix Pass A error", { error: e instanceof Error ? e.message : String(e) });
        return imageUrl;
      }
    };

    // Helper function for Fix Pass B: Integration Polish
    const runIntegrationFixPass = async (imageUrl: string): Promise<string> => {
      logStep("Running Fix Pass B - Integration polish");
      
      // Genre-specific integration styles
      const genreIntegrationStyles: Record<string, string> = {
        "Hip-Hop / Rap": "SPRAY PAINTED on concrete, STENCILED graffiti, worn street art texture, urban grit and weathering",
        "Pop": "GLOSSY reflective surface, HOLOGRAPHIC sheen, modern gradient glass, polished and vibrant",
        "EDM": "NEON GLOW tubes, HOLOGRAPHIC digital artifacts, laser-etched light, electric plasma",
        "R&B": "EMBOSSED on velvet, GOLD FOIL luxury, soft ambient glow, intimate candlelit warmth",
        "Rock": "FORGED IN FIRE, CHISELED stone, battle-worn metal, dramatic lightning scars",
        "Alternative": "GROWN from organic matter, DISSOLVED into mist, surreal melting, dreamlike distortion",
        "Indie": "HAND-PAINTED on weathered wood, POLAROID fade, vintage film grain, authentic imperfection",
        "Metal": "FORGED IN HELLFIRE, CARVED in obsidian, molten lava cracks, demonic energy",
        "Country": "BURNED INTO weathered barn wood, RUSTIC rope texture, golden hour dust, Americana patina",
        "Jazz": "SMOKY CLUB atmosphere, ART DECO gold leaf, sophisticated noir shadow, timeless elegance",
        "Classical": "EMBOSSED on aged parchment, GILDED ornamental, baroque flourish, refined marble"
      };
      
      const integrationStyle = genreIntegrationStyles[genre] || "naturally integrated with scene textures and lighting";
      
      const textStylePreserveInstruction = textStyleReferenceImage 
        ? `\n\n=== ABSOLUTE PRIORITY: PRESERVE TEXT STYLE FROM REFERENCE ===
A reference image showing the EXACT text style is included as the SECOND image.
This style is NON-NEGOTIABLE. When integrating:
- The font, letterforms, effects (blur, glow, texture) MUST match the reference EXACTLY
- DO NOT substitute the style with genre-typical integration
- Apply environmental effects (dust, weathering, lighting) ON TOP of the reference style, not instead of it
`
        : '';
      
      const polishPrompt = `You are a legendary album cover artist. Make the text look INSEPARABLE from the artwork - as if created together.

Song title: "${actualSongTitle || 'as shown'}"
Artist name: "${actualArtistName || 'as shown'}"
Genre: ${genre}
${textStylePreserveInstruction}
=== INTEGRATION APPROACH FOR ${genre.toUpperCase()} ===
${textStyleReferenceImage 
  ? `PRESERVE the exact text style from the reference image, then ENHANCE integration with: ${integrationStyle}`
  : `The text should appear ${integrationStyle}.`
}

=== ENVIRONMENTAL FUSION ===
- SUBSURFACE SCATTERING if there's backlighting
- SAME WEAR AND WEATHERING as the environment
- Edges that DISSOLVE INTO THE ATMOSPHERE
- React to FOG, SMOKE, or ATMOSPHERIC HAZE
- Catch the SAME LIGHT SOURCE as other objects
- Cast REALISTIC SHADOWS

=== STRICT RULES ===
- DO NOT change the background artwork
- SPELLING IS SACRED - DO NOT alter ANY letters
- ${textStyleReferenceImage ? 'TEXT STYLE IS SACRED - Must match the reference image exactly' : 'Keep the established text style'}
- Keep 3000x3000 pixel dimensions
- Output must extend edge-to-edge with NO borders

Make this gallery-worthy, Grammy-worthy.`;

      const content: any[] = [
        { type: "text", text: polishPrompt },
        { type: "image_url", image_url: { url: imageUrl } }
      ];
      if (textStyleReferenceImage) {
        content.push({ type: "image_url", image_url: { url: textStyleReferenceImage } });
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const polishedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (polishedUrl) {
            logStep("Fix Pass B complete - integration polished");
            return polishedUrl;
          }
        }
        logStep("Fix Pass B failed, using original");
        return imageUrl;
      } catch (e) {
        logStep("Fix Pass B error", { error: e instanceof Error ? e.message : String(e) });
        return imageUrl;
      }
    };

    // Helper function for Style Enforcement Pass (runs when text style reference is provided)
    const runStyleEnforcementPass = async (imageUrl: string): Promise<string> => {
      if (!textStyleReferenceImage) {
        logStep("Skipping Style Enforcement - no text style reference provided");
        return imageUrl;
      }
      
      logStep("Running Style Enforcement Pass - guaranteeing text style match");
      
      const styleEnforcementPrompt = `You are a typography specialist. Your ONLY job is to make the text on this album cover EXACTLY match the reference text style.

Song title: "${actualSongTitle || 'as shown'}"
Artist name: "${actualArtistName || 'as shown'}"

=== ABSOLUTE REQUIREMENT ===
The SECOND image shows the EXACT text style that MUST be used for the song title.
Look at the reference carefully and note:
- The EXACT font/typeface (script, sans-serif, serif, etc.)
- The EXACT effects (glow, blur, shadow, texture, gradient)
- The EXACT color palette
- The EXACT stroke weight and letterform style

=== YOUR TASK ===
Compare the text on the cover to the reference style.
If the text does NOT match the reference style:
1. COMPLETELY REGENERATE the song title text to match the reference EXACTLY
2. Keep the same text positioning
3. Keep the background artwork UNCHANGED
4. The artist name should complement the song title style

=== STYLE MATCHING CHECKLIST ===
- Is it the same typeface family? (script vs sans-serif vs serif)
- Does it have the same glow/blur effect?
- Is the color the same?
- Are the letterforms the same style?
- Does it have the same weight/thickness?

If ANY of these don't match, regenerate the text to match.

=== STRICT RULES ===
- DO NOT change the background artwork
- DO NOT change spelling (it has been verified)
- ONLY change the text STYLING to match the reference
- Keep 3000x3000 pixel dimensions
- Output must extend edge-to-edge with NO borders

The text style MUST be a FLAWLESS match to the reference.`;

      const content: any[] = [
        { type: "text", text: styleEnforcementPrompt },
        { type: "image_url", image_url: { url: imageUrl } },
        { type: "image_url", image_url: { url: textStyleReferenceImage } }
      ];

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content }],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          const styledUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (styledUrl) {
            logStep("Style Enforcement Pass complete - text style matched");
            return styledUrl;
          }
        }
        logStep("Style Enforcement Pass failed, using original");
        return imageUrl;
      } catch (e) {
        logStep("Style Enforcement Pass error", { error: e instanceof Error ? e.message : String(e) });
        return imageUrl;
      }
    };

    // ========== MAIN GENERATION FLOW ==========
    
    let imageUrl: string;
    try {
      imageUrl = await makeImageRequest(requestBody);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      if (errorMessage === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "CREDITS_EXHAUSTED") {
        return new Response(
          JSON.stringify({ error: "AI service credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage.includes("timed out")) {
        return new Response(
          JSON.stringify({ error: "Generation timed out. Please try again." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      logStep("ERROR", { message: errorMessage });
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Pass 1 complete - initial cover generated");

    // ========== STYLE ENFORCEMENT (runs first if text style reference provided) ==========
    let finalImageUrl = imageUrl;
    let passesRun = 1; // Initial generation counts as 1

    if (textStyleReferenceImage) {
      finalImageUrl = await runStyleEnforcementPass(finalImageUrl);
      passesRun++;
    }

    // ========== PRE-FLIGHT ANALYSIS ==========
    let analysis = await runPreflightAnalysis(finalImageUrl);

    let hasTextIssues = !analysis.spellingCorrect || !analysis.noDuplicates || !analysis.textWithinBounds || !analysis.noPlaceholderText;
    const hasIntegrationIssues = !analysis.integrationGood;

    logStep("Pre-flight analysis summary", {
      hasTextIssues,
      hasIntegrationIssues,
      spellingCorrect: analysis.spellingCorrect,
      noDuplicates: analysis.noDuplicates,
      textWithinBounds: analysis.textWithinBounds,
      integrationGood: analysis.integrationGood,
      issues: analysis.issues,
    });

    // ========== CONDITIONAL FIX PASSES ==========

    // Fix Pass A: Text Issues (spelling, duplicates, boundaries)
    if (hasTextIssues) {
      // Try up to 2 times, with a re-check after each attempt.
      for (let i = 0; i < 2 && hasTextIssues; i++) {
        finalImageUrl = await runTextFixPass(finalImageUrl);
        passesRun++;

        analysis = await runPreflightAnalysis(finalImageUrl);
        hasTextIssues = !analysis.spellingCorrect || !analysis.noDuplicates || !analysis.textWithinBounds || !analysis.noPlaceholderText;

        logStep("Post Text-Fix analysis", {
          attempt: i + 1,
          hasTextIssues,
          spellingCorrect: analysis.spellingCorrect,
          noDuplicates: analysis.noDuplicates,
          textWithinBounds: analysis.textWithinBounds,
          issues: analysis.issues,
        });
      }
    } else {
      logStep("Skipping Fix Pass A - no text issues detected");
    }

    // Fix Pass B: Integration Polish (skip if we already ran style enforcement)
    if (hasIntegrationIssues && !textStyleReferenceImage) {
      finalImageUrl = await runIntegrationFixPass(finalImageUrl);
      passesRun++;
    } else {
      logStep("Skipping Fix Pass B - integration looks good or style enforcement already ran");
    }

    logStep("Hybrid generation complete", { 
      totalPasses: passesRun,
      skippedTextFix: !hasTextIssues,
      skippedIntegrationFix: !hasIntegrationIssues,
      estimatedCost: `~$${(0.001 + (passesRun * 0.039)).toFixed(3)}`,
    });

    // Deduct 1 credit only after we have a generated image
    if (userId && !hasUnlimitedAccess) {
      const { data: creditsData, error: creditsError } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching credits (post-generation)", { error: creditsError.message });
        throw new Error("Failed to check credits");
      }

      const currentCredits = creditsData?.credits ?? 0;
      logStep("Current credits (post-generation)", { credits: currentCredits });

      if (currentCredits < 1) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({ credits: currentCredits - 1 })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error deducting credit (post-generation)", { error: updateError.message });
        throw new Error("Failed to deduct credit");
      }

      await supabaseClient.from("credit_transactions").insert({
        user_id: userId,
        amount: -1,
        type: "generation",
        description: `Generated ${genre} cover art (${passesRun} passes)`,
      });

      logStep("Credit deducted (post-generation)", { newBalance: currentCredits - 1 });
    }

    return new Response(
      JSON.stringify({ imageUrl: finalImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
