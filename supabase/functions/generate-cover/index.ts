import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
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
      }
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Extract song title and artist name from prompt
    const songTitleMatch = prompt.match(/Song Title:\s*([^|]+)/i);
    const artistNameMatch = prompt.match(/Artist:\s*([^|]+)/i);
    const descriptionMatch = prompt.match(/Description:\s*(.+?)(?:\s*$|\s*Song Title:)/is);
    
    const songTitle = songTitleMatch ? songTitleMatch[1].trim() : null;
    const artistName = artistNameMatch ? artistNameMatch[1].trim() : null;
    const description = descriptionMatch ? descriptionMatch[1].trim() : prompt;
    
    // Extract text styling instructions if provided
    const textStylingMatch = prompt.match(/TEXT STYLING INSTRUCTIONS:\s*([^|]+)/i);
    const textStyleInstructions = textStylingMatch ? textStylingMatch[1].trim() : null;
    
    logStep("Parsed prompt", { songTitle, artistName, hasTextStyle: !!textStyleInstructions });

    // ========== GENRE-SPECIFIC DIRECTOR LAYERS ==========
    const genreDirectors: Record<string, { visual: string; narrative: string }> = {
      "Hip-Hop": {
        visual: "gritty cinematic realism, bold presence, high contrast, dramatic lighting, grounded energy",
        narrative: "confidence, power, confrontation, movement"
      },
      "Rap": {
        visual: "gritty cinematic realism, bold presence, high contrast, dramatic lighting, grounded energy",
        narrative: "confidence, power, confrontation, movement"
      },
      "Pop": {
        visual: "polished, vibrant, modern, clean composition with strong visual punch",
        narrative: "confidence, clarity, star presence"
      },
      "EDM": {
        visual: "energetic, futuristic, neon accents, motion, light trails",
        narrative: "movement, intensity, sensory overload"
      },
      "R&B": {
        visual: "moody, sensual, cinematic softness, rich shadows",
        narrative: "intimacy, emotion, closeness"
      },
      "Rock": {
        visual: "raw, dramatic, gritty textures, bold lighting",
        narrative: "rebellion, intensity, impact"
      },
      "Alternative": {
        visual: "experimental, atmospheric, unconventional framing",
        narrative: "ambiguity, tension, individuality"
      },
      "Indie": {
        visual: "intimate, cinematic restraint, natural lighting",
        narrative: "authenticity, emotion, subtle storytelling"
      },
      "Metal": {
        visual: "dark fantasy, ominous, epic scale, heavy textures",
        narrative: "destruction, power, confrontation"
      },
      "Country": {
        visual: "grounded cinematic realism, rustic textures, warm contrast",
        narrative: "story, place, nostalgia"
      },
      "Jazz": {
        visual: "elegant, low-key lighting, cinematic noir",
        narrative: "mood, atmosphere, sophistication"
      },
      "Classical": {
        visual: "refined, timeless, painterly lighting",
        narrative: "grandeur, emotion, permanence"
      },
    };

    // ========== VISUAL STYLE MODIFIERS ==========
    const styleModifiers: Record<string, string> = {
      "Realism": "Photorealistic, cinematic realism, natural lighting.",
      "3D Render": "Ultra-detailed 3D realism, cinematic lighting, physical materials.",
      "Illustration": "Painterly textures, artistic clarity, controlled lighting.",
      "Anime": "Cinematic anime aesthetic, dramatic lighting, depth of field, expressive motion.",
      "Fine Art": "Gallery-quality composition, painterly lighting, dramatic framing.",
      "Abstract": "Symbolic imagery, expressive color and form.",
      "Minimalist": "Strong negative space, single dominant focal element.",
      "Cinematic": "Film still aesthetic, motion, atmosphere, dramatic lighting.",
      "Retro": "Vintage color grading, nostalgic texture, analog feel.",
    };

    // ========== MOOD / VIBE EMOTIONAL LAYERS ==========
    const moodLayers: Record<string, string> = {
      "Aggressive": "Sharp lighting, high contrast, forceful energy.",
      "Dark": "Low-key lighting, ominous shadows, tension.",
      "Mysterious": "Fog, restrained lighting, partial obscurity.",
      "Euphoric": "Glowing highlights, motion, energy.",
      "Uplifting": "Warm contrast, hopeful tone, openness.",
      "Melancholic": "Muted colors, soft lighting, emotional weight.",
      "Romantic": "Warm highlights, intimacy, closeness.",
      "Peaceful": "Balanced composition, gentle lighting.",
      "Intense": "High tension, dramatic contrast.",
      "Nostalgic": "Soft contrast, film-like grading.",
    };

    const genreDirection = genreDirectors[genre] || { 
      visual: "cinematic realism, dramatic lighting, professional quality",
      narrative: "emotion, story, impact"
    };
    const visualStyle = styleModifiers[style] || "Photorealistic, cinematic lighting, high detail.";
    const moodStyle = moodLayers[mood] || "Dramatic, atmospheric, emotionally evocative.";

    // Helper function to make artwork generation request (no text)
    const makeArtworkRequest = async (promptText: string, maxRetries = 2): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Artwork generation attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt: promptText,
              n: 1,
              size: "1024x1024",
              quality: "high",
            }),
            signal: controller.signal,
          });
        } catch (e) {
          clearTimeout(timeout);
          if (e instanceof DOMException && e.name === "AbortError") {
            logStep("Artwork request timed out", { attempt });
            if (attempt === maxRetries) throw new Error("Generation timed out. Please try again.");
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("OpenAI API error (artwork)", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
          
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate artwork. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const imageUrl = imageData.b64_json 
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        if (!imageUrl) {
          if (attempt === maxRetries) throw new Error("Failed to generate artwork. Please try again.");
          continue;
        }

        logStep("Artwork generated successfully");
        return imageUrl;
      }
      throw new Error("Failed to generate artwork after retries");
    };

    // Helper function to extract dominant colors from artwork using vision
    interface ExtractedColors {
      dominantColors: string[];
      textColorSuggestion: string;
      accentColor: string;
      palette: "warm" | "cool" | "neutral";
    }

    const extractDominantColors = async (artworkBase64: string): Promise<ExtractedColors> => {
      logStep("Extracting dominant colors from artwork");
      
      const defaultColors: ExtractedColors = {
        dominantColors: ["#1a1a2e", "#16213e", "#0f3460"],
        textColorSuggestion: "#ffd700",
        accentColor: "#e94560",
        palette: "cool"
      };

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this album cover artwork and pick text colors that USE colors from the artwork.

Return ONLY valid JSON (no markdown, no explanation):
{
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "textColorSuggestion": "#hex",
  "accentColor": "#hex",
  "palette": "warm" | "cool" | "neutral"
}

CRITICAL RULES:
1. dominantColors: The 3 most prominent/vibrant colors in the artwork (hex codes)
2. textColorSuggestion: Pick ONE of the dominant colors from the artwork (or a slightly brighter version of it). The text should USE the artwork's color palette, NOT introduce new colors. Examples:
   - If artwork has orange fire → use orange (#FF4500, #FF6600)
   - If artwork has gold accents → use gold (#FFD700, #D4AF37)
   - If artwork has blue tones → use that blue
   - If artwork has red/crimson → use that red
   NEVER introduce colors that don't exist in the artwork (no random neon green on a warm orange artwork!)
3. accentColor: Pick ANOTHER color from the artwork's dominantColors for glow/outline effects
4. palette: Overall temperature (warm = oranges/reds/yellows, cool = blues/purples, neutral = grays/browns)

The text color should be PULLED FROM the artwork's existing palette so it feels integrated and cohesive.
If the artwork is very dark, pick the brightest/most vibrant color present.
NEVER pick a color that isn't already in the artwork.`
                },
                {
                  type: "image_url",
                  image_url: { url: artworkBase64 }
                }
              ]
            }],
            max_tokens: 150
          }),
        });

        if (!response.ok) {
          logStep("Color extraction API error, using defaults", { status: response.status });
          return defaultColors;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response (handle potential markdown wrapping)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          logStep("Colors extracted", parsed);
          return parsed as ExtractedColors;
        }
        
        logStep("Color extraction parse failed, using defaults");
        return defaultColors;
      } catch (e) {
        logStep("Color extraction error, using defaults", { error: e instanceof Error ? e.message : String(e) });
        return defaultColors;
      }
    };

    // Helper function to generate text layer with transparent background
    const makeTextLayerRequest = async (
      songTitle: string,
      artistName: string | null,
      textStyle: string | null,
      genreHint: string,
      moodHint: string,
      colors: ExtractedColors,
      maxRetries = 2
    ): Promise<string> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Text layer generation attempt ${attempt}/${maxRetries}`, { colors });
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);

        const textLayerPrompt = `Create elegant, professional album cover typography on a completely transparent background.

TEXT CONTENT (SPELL EXACTLY - EACH LETTER MUST BE CORRECT):
- Song Title: "${songTitle}"
- Artist Name: "${artistName || ''}"

===== MANDATORY COLOR SCHEME (USE THESE EXACT COLORS FROM THE ARTWORK) =====
These colors were extracted FROM the artwork - USE THEM:
- Artwork dominant colors: ${colors.dominantColors.join(", ")}
- Artwork palette: ${colors.palette}

You MUST use these specific colors for the text:
- PRIMARY TEXT COLOR: ${colors.textColorSuggestion} - This is from the artwork, use it as main text fill
- ACCENT/GLOW COLOR: ${colors.accentColor} - This is from the artwork, use for outlines/glow

CRITICAL: These colors are PULLED FROM the artwork itself. Using these colors ensures the text feels integrated with the cover art. Do NOT introduce any new colors that aren't specified above.

===== SIZE AND POSITIONING RULES =====
- Text MUST NOT cover more than 35-40% of the total image area
- Position in the LOWER THIRD of the canvas
- Song title: medium-sized, readable but not overwhelming
- Artist name: smaller, positioned below the song title
- Leave at least 60% of canvas EMPTY (transparent)

${textStyle ? `===== MANDATORY TEXT STYLE (FOLLOW EXACTLY) =====
${textStyle}

Match this style while using the artwork colors above.` : `===== TEXT STYLE GUIDELINES =====
Create professional typography that fits a ${genreHint} ${moodHint} aesthetic.
Use stylish fonts with depth and texture.`}

===== VISUAL EFFECTS =====
- Drop shadows or outer glow in ${colors.accentColor}
- Metallic, gradient, or textured finish using ${colors.textColorSuggestion}
- Text should have depth and professional polish

REQUIREMENTS:
- TRANSPARENT BACKGROUND ONLY
- Maximum 35-40% canvas coverage
- Use ONLY the colors specified above (from the artwork)

FORBIDDEN:
- Plain white or black as main text color
- Any colors NOT listed in the artwork colors above
- Oversized text
- Any background

SPELLING: "${songTitle}" by "${artistName || ''}" - verify each letter`;

        let response: Response;
        try {
          response = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt: textLayerPrompt,
              n: 1,
              size: "1024x1024",
              quality: "high",
              background: "transparent",
              output_format: "png",
            }),
            signal: controller.signal,
          });
        } catch (e) {
          clearTimeout(timeout);
          if (e instanceof DOMException && e.name === "AbortError") {
            logStep("Text layer request timed out", { attempt });
            if (attempt === maxRetries) throw new Error("Text generation timed out. Please try again.");
            continue;
          }
          throw e;
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errorText = await response.text();
          logStep("OpenAI API error (text layer)", { status: response.status, error: errorText });
          if (response.status === 429) throw new Error("RATE_LIMIT");
          if (response.status === 402 || response.status === 401) throw new Error("CREDITS_EXHAUSTED");
          
          if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
            throw new Error("CONTENT_MODERATED");
          }
          
          if (attempt === maxRetries) throw new Error(`OpenAI API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const imageData = data.data?.[0];
        if (!imageData) {
          if (attempt === maxRetries) throw new Error("Failed to generate text layer. Please try again.");
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const imageUrl = imageData.b64_json 
          ? `data:image/png;base64,${imageData.b64_json}`
          : imageData.url;

        if (!imageUrl) {
          if (attempt === maxRetries) throw new Error("Failed to generate text layer. Please try again.");
          continue;
        }

        logStep("Text layer generated successfully with artwork colors");
        return imageUrl;
      }
      throw new Error("Failed to generate text layer after retries");
    };

    // Helper function to intelligently composite text onto artwork with color integration
    const compositeWithAI = async (
      artworkBase64: string, 
      textLayerBase64: string,
      genreHint: string,
      moodHint: string
    ): Promise<string> => {
      logStep("AI compositing artwork and text layer with color integration");
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      const compositePrompt = `You are a professional album cover designer compositing text onto artwork.

TASK: Merge these two layers into a cohesive, professionally designed album cover.

===== INTEGRATION REQUIREMENTS =====
1. The text layer should be placed over the artwork in the LOWER THIRD of the image
2. CRITICAL: Adjust the text colors to COMPLEMENT the artwork's color palette:
   - If the artwork is dark/moody, make text glow with complementary warm or cool tones
   - If the artwork is bright/vibrant, use contrasting but harmonious text colors
   - Add subtle color bleeding/interaction between text and background
3. Add integration effects:
   - Subtle ambient occlusion where text meets the background
   - Light reflection from the scene onto the text
   - Color grading that unifies both layers
4. The text should look DESIGNED INTO the cover, not just placed on top
5. Preserve the exact spelling and general positioning of the text
6. Maintain the artwork's visual focus - text should enhance, not overpower

STYLE CONTEXT: ${genreHint} music with ${moodHint} mood

OUTPUT: A perfectly integrated 1024x1024 album cover where the text feels like it was designed as part of the original artwork.`;

      try {
        // Prepare the content with both images
        const content: any[] = [
          { type: "text", text: compositePrompt },
          { 
            type: "image_url", 
            image_url: { url: artworkBase64 }
          },
          { 
            type: "image_url", 
            image_url: { url: textLayerBase64 }
          }
        ];

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            messages: [
              {
                role: "user",
                content: content
              }
            ],
            modalities: ["image", "text"],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          logStep("AI compositing error", { status: response.status, error: errorText });
          // Fall back to client-side compositing
          return JSON.stringify({
            artworkUrl: artworkBase64,
            textLayerUrl: textLayerBase64,
            needsCompositing: true,
          });
        }

        const data = await response.json();
        const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (imageData) {
          logStep("AI compositing successful");
          return imageData;
        }

        // Fall back to client-side compositing
        logStep("AI compositing returned no image, falling back to client compositing");
        return JSON.stringify({
          artworkUrl: artworkBase64,
          textLayerUrl: textLayerBase64,
          needsCompositing: true,
        });
      } catch (e) {
        clearTimeout(timeout);
        logStep("AI compositing failed, falling back", { error: e instanceof Error ? e.message : String(e) });
        // Fall back to client-side compositing
        return JSON.stringify({
          artworkUrl: artworkBase64,
          textLayerUrl: textLayerBase64,
          needsCompositing: true,
        });
      }
    };

    // ========== PARALLEL GENERATION PIPELINE ==========
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      // Build the artwork prompt (no text)
      const artworkPrompt = `SYSTEM ROLE:
You are generating professional, high-end album cover artwork intended for commercial music distribution.
IMPORTANT: DO NOT include ANY text, titles, or typography in this image. Generate ONLY the visual artwork/background.

===== GLOBAL QUALITY LAYER (ALWAYS APPLY) =====
The image must feel cinematic, dramatic, intentional, and polished — never generic, flat, amateur, or stock-like.
The result should look like a finished, high-budget album cover created by an experienced designer.

Always prioritize:
- Strong central or iconographic composition
- Clear focal hierarchy
- Cinematic lighting (backlighting, rim light, directional light, high contrast)
- Realistic materials and textures
- Atmospheric depth (fog, rain, smoke, particles, volumetric lighting)
- Mood-driven color grading
- Album-safe framing with space for text to be added later
- Strong thumbnail legibility

Avoid flat lighting, symmetrical layouts, empty scenes, or overly clean surfaces.

===== DIRECTOR PASS (CINEMATIC INTENT) =====
The image must capture ONE defining cinematic moment — as if frozen from a movie trailer or album-defining scene.

Prioritize:
- A clear story implied in a single frame
- One dominant visual event (impact, emergence, collision, motion, lightning strike)
- Asymmetry over perfect balance
- Natural imperfections (wear, erosion, grime, sparks, rain distortion)
- Environmental interaction (weather affecting surfaces, light wrapping edges, debris reacting to motion)

Focus on the exact moment of maximum intensity, not before or after.

===== EVENT INTENSITY LAYER (ALWAYS APPLY) =====
The image must depict an active, high-energy moment, not a static scene.

Force the environment to react to the subject:
- Motion causes sparks, debris, rain distortion, smoke, or crowd reaction
- Surfaces show stress, friction, wear, heat, or damage
- Lighting responds to action (flares, explosions, lightning, reflections)
- Perspective exaggerates speed, scale, or impact

The scene should feel unstable, dynamic, and alive.

===== PHYSICAL CONSEQUENCE BIAS =====
Every major action should leave visible consequences on the environment
(scratches, sparks, cracks, debris, distortion, heat, water displacement).

===== SCALE AND DENSITY RULE =====
Fill the frame with meaningful detail.
Avoid large empty areas unless required for composition.
Crowds, structures, weather, and effects should reinforce scale and intensity.
${['Hip-Hop', 'Rap', 'EDM', 'Rock', 'Metal'].includes(genre) ? `
===== FORCED PERSPECTIVE (SPEED/POWER GENRES) =====
Use aggressive perspective, low angles, motion compression, and depth exaggeration to amplify speed, power, and dominance.
` : ''}
===== NEGATIVE CONSTRAINTS =====
Avoid generic AI aesthetics, stock photography composition, flat poster layouts, plastic textures, over-smoothing, washed-out contrast.
DO NOT include any text, typography, letters, words, or titles. This is artwork only.

===== ICON BIAS =====
Compose the image so it is recognizable within one second at small thumbnail size.

===== GENRE-SPECIFIC DIRECTION: ${genre} =====
Visual intent: ${genreDirection.visual}
Narrative bias: ${genreDirection.narrative}

===== VISUAL STYLE: ${style} =====
${visualStyle}

===== MOOD/ATMOSPHERE: ${mood} =====
${moodStyle}

===== USER'S CREATIVE VISION =====
${description}

===== TECHNICAL REQUIREMENTS =====
- EXACT 1:1 square aspect ratio (1024x1024)
- Artwork fills 100% of canvas edge-to-edge with NO borders, NO letterboxing, NO grey/black bars
- Ultra high resolution, maximum detail and texture
- NO TEXT, NO TYPOGRAPHY, NO LETTERS - artwork only
- Leave compositional space for text integration (typically lower third)`;

      // If no song title, just generate artwork
      if (!songTitle) {
        logStep("No song title provided, generating artwork only");
        const artwork = await makeArtworkRequest(artworkPrompt);
        imageUrl = artwork;
      } else {
        // ===== SEQUENTIAL GENERATION: Artwork → Extract Colors → Text Layer =====
        logStep("Starting SEQUENTIAL generation: Artwork → Colors → Text");
        const startTime = Date.now();

        // Step 1: Generate artwork first
        logStep("Step 1: Generating artwork");
        const artworkResult = await makeArtworkRequest(artworkPrompt);
        const artworkTime = Date.now() - startTime;
        logStep("Artwork generated", { timeMs: artworkTime });

        // Step 2: Extract colors from artwork
        logStep("Step 2: Extracting colors from artwork");
        const colorStartTime = Date.now();
        const extractedColors = await extractDominantColors(artworkResult);
        const colorTime = Date.now() - colorStartTime;
        logStep("Colors extracted", { timeMs: colorTime, colors: extractedColors });

        // Step 3: Generate text layer with extracted colors
        logStep("Step 3: Generating text layer with artwork colors");
        const textStartTime = Date.now();
        const textLayerResult = await makeTextLayerRequest(
          songTitle, 
          artistName, 
          textStyleInstructions, 
          genre, 
          mood,
          extractedColors
        );
        const textTime = Date.now() - textStartTime;
        logStep("Text layer generated", { timeMs: textTime });

        const totalTime = Date.now() - startTime;
        logStep("SEQUENTIAL generation complete", { totalTimeMs: totalTime, artworkMs: artworkTime, colorMs: colorTime, textMs: textTime });

        // Step 4: Composite (text is already correctly colored, simpler merge)
        logStep("Step 4: Compositing layers");
        const compositeStartTime = Date.now();
        const compositedResult = await compositeWithAI(artworkResult, textLayerResult, genre, mood);
        const compositeTime = Date.now() - compositeStartTime;
        logStep("Compositing complete", { timeMs: compositeTime });

        // Check if AI compositing succeeded or fell back to client-side
        if (compositedResult.startsWith('data:image') || compositedResult.startsWith('http')) {
          // AI compositing succeeded - return the final image directly
          imageUrl = compositedResult;
        } else {
          // Fell back to client-side compositing
          imageUrl = compositedResult;
        }
      }

      // Upload to storage (background task for speed)
      finalImageUrl = imageUrl;
      
      // Check if it's a composite result or single image
      const isCompositeResult = imageUrl.startsWith("{") && imageUrl.includes("needsCompositing");
      
      if (!isCompositeResult && imageUrl.startsWith("data:image")) {
        // Single image - upload normally
        try {
          const base64Data = imageUrl.split(",")[1];
          const mimeMatch = imageUrl.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
          const extension = mimeType.split("/")[1] || "png";
          const fileName = `${userId || "anon"}/${Date.now()}.${extension}`;

          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const { error: uploadError } = await supabaseClient.storage
            .from("covers")
            .upload(fileName, bytes, { contentType: mimeType, upsert: true });

          if (uploadError) {
            logStep("Storage upload failed, returning base64", { error: uploadError.message });
          } else {
            const { data: publicUrl } = supabaseClient.storage.from("covers").getPublicUrl(fileName);
            finalImageUrl = publicUrl.publicUrl;
            logStep("Uploaded to storage", { url: finalImageUrl });
          }
        } catch (uploadErr) {
          logStep("Storage upload error, returning base64", {
            error: uploadErr instanceof Error ? uploadErr.message : String(uploadErr),
          });
        }
        imageUrl = finalImageUrl;
      } else if (isCompositeResult) {
        // Composite result - upload both images in background
        const compositeData = JSON.parse(imageUrl);
        
        // Use EdgeRuntime.waitUntil for background upload
        const uploadBothImages = async () => {
          try {
            const artworkBase64 = compositeData.artworkUrl.split(",")[1];
            const textBase64 = compositeData.textLayerUrl.split(",")[1];
            
            const timestamp = Date.now();
            const artworkFileName = `${userId || "anon"}/${timestamp}-artwork.png`;
            const textFileName = `${userId || "anon"}/${timestamp}-text.png`;

            const artworkBytes = Uint8Array.from(atob(artworkBase64), c => c.charCodeAt(0));
            const textBytes = Uint8Array.from(atob(textBase64), c => c.charCodeAt(0));

            await Promise.all([
              supabaseClient.storage.from("covers").upload(artworkFileName, artworkBytes, { contentType: "image/png", upsert: true }),
              supabaseClient.storage.from("covers").upload(textFileName, textBytes, { contentType: "image/png", upsert: true }),
            ]);

            const { data: artworkUrl } = supabaseClient.storage.from("covers").getPublicUrl(artworkFileName);
            const { data: textUrl } = supabaseClient.storage.from("covers").getPublicUrl(textFileName);

            logStep("Both images uploaded to storage", { artworkUrl: artworkUrl.publicUrl, textUrl: textUrl.publicUrl });
          } catch (e) {
            logStep("Background upload error", { error: e instanceof Error ? e.message : String(e) });
          }
        };

        // Start background upload without awaiting
        uploadBothImages().catch(e => logStep("Background upload failed", { error: e }));
      }
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
          JSON.stringify({ error: "OpenAI API credits exhausted. Please check your API key." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (errorMessage === "CONTENT_MODERATED") {
        return new Response(
          JSON.stringify({
            error:
              "This prompt was flagged by content safety filters. Please try a different description.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    logStep("Generation complete (sequential pipeline with color extraction)");

    // Deduct credit after successful generation
    if (userId && !hasUnlimitedAccess) {
      const { data: creditsData, error: creditsError } = await supabaseClient
        .from("user_credits")
        .select("credits")
        .eq("user_id", userId)
        .maybeSingle();

      if (creditsError) {
        logStep("Error fetching credits", { error: creditsError.message });
        throw new Error("Failed to check credits");
      }

      const currentCredits = creditsData?.credits ?? 0;

      if (currentCredits < 1) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Please purchase more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseClient
        .from("user_credits")
        .update({ credits: currentCredits - 1 })
        .eq("user_id", userId);

      if (updateError) {
        logStep("Error deducting credit", { error: updateError.message });
        throw new Error("Failed to deduct credit");
      }

      await supabaseClient.from("credit_transactions").insert({
        user_id: userId,
        amount: -1,
        type: "generation",
        description: `Generated ${genre} cover art`,
      });

      logStep("Credit deducted", { newBalance: currentCredits - 1 });
    }

    // Parse the result to determine response format
    const isCompositeResult = imageUrl.startsWith("{") && imageUrl.includes("needsCompositing");
    
    if (isCompositeResult) {
      const compositeData = JSON.parse(imageUrl);
      
      // Best-effort: persist generation for history
      if (userId) {
        try {
          const { error: genInsertErr } = await supabaseClient.from("generations").insert({
            user_id: userId,
            prompt: typeof prompt === "string" ? prompt : "",
            genre: typeof genre === "string" ? genre : "",
            style: typeof style === "string" ? style : "",
            mood: typeof mood === "string" ? mood : "",
            image_url: compositeData.artworkUrl.slice(0, 100) + "...", // Truncate for storage
            song_title: songTitle || null,
            artist_name: artistName || null,
            cover_analysis: null,
          });

          if (genInsertErr) {
            logStep("Generation save failed (non-blocking)", { error: genInsertErr.message });
          } else {
            logStep("Generation saved", { songTitle, artistName });
          }
        } catch (e) {
          logStep("Generation save error (non-blocking)", { error: e instanceof Error ? e.message : String(e) });
        }
      }

      return new Response(JSON.stringify({
        artworkUrl: compositeData.artworkUrl,
        textLayerUrl: compositeData.textLayerUrl,
        needsCompositing: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Single image result (no text)
      if (userId) {
        try {
          const { error: genInsertErr } = await supabaseClient.from("generations").insert({
            user_id: userId,
            prompt: typeof prompt === "string" ? prompt : "",
            genre: typeof genre === "string" ? genre : "",
            style: typeof style === "string" ? style : "",
            mood: typeof mood === "string" ? mood : "",
            image_url: imageUrl,
            song_title: songTitle || null,
            artist_name: artistName || null,
            cover_analysis: null,
          });

          if (genInsertErr) {
            logStep("Generation save failed (non-blocking)", { error: genInsertErr.message });
          } else {
            logStep("Generation saved", { songTitle, artistName });
          }
        } catch (e) {
          logStep("Generation save error (non-blocking)", { error: e instanceof Error ? e.message : String(e) });
        }
      }

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
