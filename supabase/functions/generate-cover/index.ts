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

  // ========== VISUAL STYLE MODIFIERS (HIGHLY DETAILED) ==========
  const styleModifiers: Record<string, string> = {
    "Realism": `PHOTOREALISTIC PHOTOGRAPHY - This MUST look like a real photograph taken with a professional camera.
- Shot on RED V-RAPTOR or ARRI ALEXA 65 digital cinema camera
- Real human skin with visible pores, fine hairs, imperfections, subsurface scattering
- Real-world physics: accurate shadows, reflections, light falloff, lens distortion
- Shallow depth of field with bokeh (f/1.4 - f/2.8 aperture)
- Natural available light or professional studio lighting with visible light sources
- Photographic grain and sensor noise at high ISO
- Real fabric textures, real metal, real glass with accurate refraction
- NO illustration, NO painting, NO digital art, NO CGI look
- Must be indistinguishable from a photograph taken in the real world
- Reference: Annie Leibovitz, Peter Lindbergh, Tim Walker photography`,

    "3D Render": `OCTANE RENDER / CINEMA 4D / BLENDER CGI AESTHETIC - This MUST look like a professional 3D software render, NOT a photograph or illustration.
- DISTINCTLY DIGITAL 3D AESTHETIC: smooth, clean, impossibly perfect surfaces that scream "CGI"
- Octane Render / Redshift / Arnold / Cycles render engine look
- Ultra-smooth geometry with visible subsurface scattering glow on skin
- Hyper-clean plastic, rubber, or silicone-like material quality
- Dramatic rim lighting with neon accent lights (cyan, magenta, orange glows)
- Volumetric fog, god rays, atmospheric depth with visible light beams
- Perfect edge bevels and impossibly smooth curves on all geometry
- HDRI studio lighting with gradient backgrounds or abstract 3D environments
- Reflective floors, floating geometric shapes, abstract platforms
- That "Cinema 4D Instagram aesthetic": clean, stylized, almost toy-like perfection
- Subjects should look like high-end 3D character models, NOT real people
- Reference: Beeple, Peter Tarka, Nikita Diakur, modern C4D/Octane artists
- NO photorealism, NO film grain, NO imperfections - this is DIGITAL PERFECTION`,

    "Illustration": `TRADITIONAL ILLUSTRATION - Hand-painted artistic quality.
- Visible brushstrokes, paint texture, artistic mark-making
- Oil painting, gouache, or watercolor aesthetic
- Loose, expressive linework with intentional imperfection
- Rich color layering with visible underpainting
- Artistic color choices: non-photographic, stylized palette
- Traditional illustration composition with strong graphic shapes
- NO photorealism, NO 3D render look, NO digital perfection
- Painterly blending and color mixing visible in the work
- Reference: Drew Struzan, James Jean, Sachin Teng, Jon Foster
- Must look like it was painted by a human artist with physical media`,

    "Anime": `INTENSE JAPANESE ANIME AESTHETIC - Dramatic, exaggerated, high-impact anime style with MAXIMUM INTENSITY.
- EXAGGERATED DRAMATIC EXPRESSIONS: intense eyes with multiple highlight reflections, tears streaming, veins visible when angry
- DYNAMIC ACTION POSES: extreme foreshortening, impossible camera angles, characters bursting out of frame
- INTENSE LIGHTING: dramatic backlighting silhouettes, lens flares, glowing auras around characters
- SPEED AND MOTION: speed lines radiating from subject, motion blur streaks, impact frames with white flash
- OVERSIZED DRAMATIC FEATURES: huge expressive eyes with detailed iris patterns, sharp angular features, exaggerated hair physics
- HIGH CONTRAST cel-shading with deep blacks and bright highlights, rim lighting on hair and clothes
- ATMOSPHERIC INTENSITY: wind-blown hair and clothes, debris floating, energy particles, sakura petals or snow
- EPIC SCALE: characters against massive backdrops, dramatic sky gradients (orange/purple sunsets, stormy clouds)
- Reference: Attack on Titan intensity, Demon Slayer visual effects, Jujutsu Kaisen action, Chainsaw Man rawness
- NOT cute/soft anime - this is DRAMATIC, INTENSE, CINEMATIC anime with IMPACT
- Bold black outlines with aggressive line weight variation, hatching for shadows
- Color palette: deep saturated colors with neon accent highlights, dramatic color grading`,

    "Fine Art": `MUSEUM-QUALITY FINE ART - Classical painting techniques.
- Chiaroscuro lighting with dramatic light/shadow contrast
- Rich, deep blacks and luminous highlights
- Classical composition: rule of thirds, golden ratio, triangular composition
- Oil painting texture with visible canvas weave
- Renaissance/Baroque color palette: deep reds, golds, earth tones
- Masterful handling of fabric folds, skin tones, atmospheric perspective
- Rembrandt lighting, Caravaggio shadows
- Gallery-worthy gravitas and emotional depth
- Reference: Rembrandt, Caravaggio, John Singer Sargent, Bouguereau
- Must look like a painting from a museum collection`,

    "Abstract": `ABSTRACT EXPRESSIONISM - Non-representational artistic expression.
- Bold geometric shapes, organic forms, or pure color fields
- Emphasis on color, texture, and composition over representation
- Gestural brushwork, drips, splatters, or precise hard-edge geometry
- Emotional and psychological impact through pure visual elements
- Color theory: complementary tensions, harmonious gradients
- NO recognizable faces or objects rendered realistically
- Shapes, lines, and colors as the primary subject matter
- Reference: Kandinsky, Rothko, Pollock, Basquiat, Mondrian
- Symbolic, evocative imagery that suggests rather than depicts
- Strong emphasis on texture and surface quality`,

    "Minimalist": `ULTRA-MINIMALIST DESIGN - Maximum impact with minimum elements.
- Vast negative space (60-80% of the image should be empty)
- Single dominant focal element, perfectly positioned
- Extremely limited color palette: 1-3 colors maximum
- Clean, geometric shapes with precise edges
- No texture, no noise, no gradients (unless central to the concept)
- Swiss design principles: grid-based, functional beauty
- Typography-forward if text is present
- Reference: Massimo Vignelli, Dieter Rams, Japanese minimalism
- Whitespace is intentional and meaningful
- Every element must be essential - remove everything else`,

    "Cinematic": `HOLLYWOOD MOVIE POSTER / FILM STILL - Blockbuster production value.
- Anamorphic lens characteristics: horizontal lens flares, oval bokeh
- Cinematic aspect ratio composition (even in square format)
- Film-grade color grading: teal and orange, or distinctive color palette
- Dramatic three-point lighting with strong key, fill, and rim lights
- Depth layers: foreground, midground, background with atmospheric haze
- Motion blur suggesting action or movement
- Lens artifacts: flares, chromatic aberration, subtle vignetting
- Reference: Roger Deakins, Emmanuel Lubezki, Janusz Kamiński cinematography
- Epic scale with tiny figures against vast environments OR intimate close-ups
- Must feel like a frame from a $200M film production`,

    "Retro": `VINTAGE/RETRO AESTHETIC - Nostalgic analog era feeling.
- Film grain: heavy, visible, authentic to 1970s-1990s film stocks
- Color palette: faded, warm, with lifted blacks and crushed highlights
- Kodachrome, Ektachrome, or Polaroid color science
- Light leaks, lens flares, dust and scratches
- Halftone printing dots, CMYK registration errors
- VHS tracking lines, analog video artifacts
- Vintage typography and graphic design sensibilities
- Reference: 1970s album covers, 1980s movie posters, 1990s music videos
- Warm amber tones, magenta shifts, cyan shadows
- Must feel authentically from a past era, not modern retro-filtered`,
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

    // ========== TWO-PASS HYBRID GENERATION ==========
    // Pass 1: Generate artwork only (no text)
    // Pass 2: Add text using image input so AI can "see" the artwork
    let imageUrl: string;
    let finalImageUrl: string;

    try {
      const startTime = Date.now();

      // ===== PASS 0: PROMPT EXPANSION (Transform simple description into cinema-quality prompt) =====
      logStep("PASS 0: Starting prompt expansion with AI");
      
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let expandedDescription = description; // Fallback to original if expansion fails
      
      if (LOVABLE_API_KEY) {
        try {
          const expansionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are generating professional album cover artwork for musicians. Your job is to take a simple image description and transform it into a hyper-detailed, cinema-quality prompt.

CORE PRINCIPLES:
- Always prioritize cinematic composition, dramatic lighting, atmosphere, depth, and visual storytelling
- If the prompt is simple, you MUST expand it with appropriate environmental detail, lighting, textures, mood, and framing
- Add fog, shadows, volumetric lighting, particles, and depth when appropriate
- Assume the cover must stand out at thumbnail size
- Use center-weighted hero compositions unless otherwise specified
- Never generate flat, minimal, or under-detailed scenes unless explicitly requested
- Creative interpretation is encouraged and required

TRANSFORMATION RULES:
1. EXPAND the subject with specific visual details (textures, materials, lighting effects, poses, expressions)
2. ADD atmospheric environment details (sky conditions, weather, fog/mist, particles, time of day)
3. SPECIFY lighting with technical terms (volumetric fog, rim lighting, god rays, subsurface scattering, dramatic shadows)
4. INCLUDE environmental framing elements (foreground objects, background details, depth layers)
5. ADD motion/energy effects where appropriate (flowing cloth, smoke, particles, ethereal glow)
6. USE technical rendering terms that boost quality (Unreal Engine quality, Octane render style, high contrast, ultra-detailed, depth of field)
7. END with composition notes (perfect square composition, album cover framing, center-weighted hero placement)

CRITICAL RULES:
- Keep the core subject and concept from the original prompt
- Do NOT add any text elements - this is for visual artwork only
- Output ONLY the enhanced prompt, no explanations
- Make it 150-250 words of rich, specific visual detail
- Match the visual style: ${style}
- Match the mood: ${mood}
- Match the genre aesthetic: ${genre}`
                },
                {
                  role: "user",
                  content: `Transform this simple description into a hyper-detailed, cinema-quality image prompt:

"${description}"

Visual Style: ${style}
Mood: ${mood}
Genre: ${genre}

Output only the enhanced prompt:`
                }
              ],
            }),
          });

          if (expansionResponse.ok) {
            const expansionData = await expansionResponse.json();
            const expandedContent = expansionData.choices?.[0]?.message?.content;
            if (expandedContent && expandedContent.length > 50) {
              expandedDescription = expandedContent.trim();
              logStep("PASS 0 complete: Prompt expanded", { 
                originalLength: description.length, 
                expandedLength: expandedDescription.length,
                preview: expandedDescription.slice(0, 100) + "..."
              });
            }
          } else {
            logStep("PASS 0 warning: Expansion API failed, using original", { status: expansionResponse.status });
          }
        } catch (expansionError) {
          logStep("PASS 0 warning: Expansion failed, using original", { error: expansionError instanceof Error ? expansionError.message : String(expansionError) });
        }
      } else {
        logStep("PASS 0 skipped: No LOVABLE_API_KEY available");
      }

      // ===== PASS 1: ARTWORK ONLY (No Text) =====
      const artworkPrompt = `Create an EXCEPTIONALLY DETAILED, PROFESSIONAL album cover artwork for a ${genre} song. This MUST be AAA-quality, hyper-detailed, visually stunning artwork.

===== VISION (AI-ENHANCED) =====
${expandedDescription}

===== VISUAL STYLE: ${style} =====
${visualStyle}

===== MOOD: ${mood} =====
${moodStyle}

===== GENRE: ${genre} =====
Visual Direction: ${genreDirection.visual}
Emotional Narrative: ${genreDirection.narrative}

===== TECHNICAL REQUIREMENTS =====
- Volumetric fog and atmospheric depth
- Cinematic lighting with high contrast
- Ultra-detailed textures and materials
- Realistic depth of field
- Unreal Engine 5 / Octane render quality
- Perfect square composition (1024x1024)
- Album cover framing
- Edge-to-edge artwork, NO borders
- NO TEXT, NO LETTERS, NO WORDS - artwork only`;

      logStep("PASS 1: Starting artwork-only generation");

      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 90_000);

      let artworkResponse: Response;
      try {
        artworkResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: artworkPrompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
          }),
          signal: controller1.signal,
        });
      } catch (e) {
        clearTimeout(timeout1);
        if (e instanceof DOMException && e.name === "AbortError") {
          throw new Error("Generation timed out. Please try again.");
        }
        throw e;
      } finally {
        clearTimeout(timeout1);
      }

      if (!artworkResponse.ok) {
        const errorText = await artworkResponse.text();
        logStep("PASS 1 API error", { status: artworkResponse.status, error: errorText });
        if (artworkResponse.status === 429) throw new Error("RATE_LIMIT");
        if (artworkResponse.status === 402 || artworkResponse.status === 401) throw new Error("CREDITS_EXHAUSTED");
        if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
          throw new Error("CONTENT_MODERATED");
        }
        throw new Error(`OpenAI API error: ${artworkResponse.status}`);
      }

      const artworkData = await artworkResponse.json();
      const artworkImageData = artworkData.data?.[0];
      
      if (!artworkImageData) {
        throw new Error("Failed to generate artwork. Please try again.");
      }

      // Get base64 from artwork
      let artworkBase64 = artworkImageData.b64_json;
      if (!artworkBase64 && artworkImageData.url) {
        // Fetch the image and convert to base64
        const imgResponse = await fetch(artworkImageData.url);
        const imgBuffer = await imgResponse.arrayBuffer();
        artworkBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      }

      if (!artworkBase64) {
        throw new Error("Failed to process artwork. Please try again.");
      }

      const pass1Time = Date.now() - startTime;
      logStep("PASS 1 complete (artwork only)", { timeMs: pass1Time });

      // ===== PASS 1.5: PALETTE ANALYSIS (so text color doesn't default to generic off-white) =====
      // gpt-image-1 often chooses a safe high-contrast "bone/ivory" on dark scenes unless we provide explicit palette-locked colors.
      let paletteGuidance:
        | {
            titleColorHex: string;
            artistColorHex: string;
            shadowRgba: string;
            accentHex?: string;
          }
        | null = null;

      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const paletteRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a senior album-cover typography art director. Your job is to pick text colors that FEEL LIT BY the artwork and belong in the scene while remaining readable at thumbnail size.",
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text:
                          "Analyze the artwork. Return STRICT JSON only (no markdown) with keys: titleColorHex, artistColorHex, shadowRgba, accentHex.\n\nRules:\n- Colors must be derived from the artwork palette (dominant light / glow / key color).\n- Avoid generic beige/ivory defaults unless the scene lighting is actually warm-white.\n- Ensure readable contrast with subtle shadow (shadowRgba).\n- If the scene has a strong colored light (e.g., green glow), tint the text toward that hue.\n- Hex must be #RRGGBB. shadowRgba must be rgba(r,g,b,a).",
                      },
                      {
                        type: "image_url",
                        image_url: {
                          url: `data:image/png;base64,${artworkBase64}`,
                        },
                      },
                    ],
                  },
                ],
                modalities: ["image", "text"],
              }),
            }
          );

          if (paletteRes.ok) {
            const paletteJson = await paletteRes.json();
            const content = paletteJson?.choices?.[0]?.message?.content;
            logStep("Pass 1.5 raw Gemini response", { content: content?.substring?.(0, 500) || content });
            
            if (typeof content === "string") {
              // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
              let cleanedContent = content.trim();
              if (cleanedContent.startsWith("```")) {
                cleanedContent = cleanedContent
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/```\s*$/, "")
                  .trim();
                logStep("Stripped markdown from Gemini response", { cleanedContent: cleanedContent.substring(0, 300) });
              }
              
              try {
                const parsed = JSON.parse(cleanedContent);
                if (
                  parsed?.titleColorHex &&
                  parsed?.artistColorHex &&
                  parsed?.shadowRgba
                ) {
                  // Validate hex format
                  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
                  const isValidTitle = hexRegex.test(parsed.titleColorHex);
                  const isValidArtist = hexRegex.test(parsed.artistColorHex);
                  
                  if (isValidTitle && isValidArtist) {
                    paletteGuidance = {
                      titleColorHex: String(parsed.titleColorHex),
                      artistColorHex: String(parsed.artistColorHex),
                      shadowRgba: String(parsed.shadowRgba),
                      accentHex: parsed.accentHex ? String(parsed.accentHex) : undefined,
                    };
                    logStep("Palette guidance extracted successfully", paletteGuidance);
                  } else {
                    logStep("Invalid hex format in parsed colors", { titleColorHex: parsed.titleColorHex, artistColorHex: parsed.artistColorHex });
                  }
                } else {
                  logStep("Missing required palette fields", { parsed });
                }
              } catch (parseError) {
                logStep("JSON parse failed, attempting regex fallback", { 
                  error: parseError instanceof Error ? parseError.message : String(parseError),
                  content: cleanedContent.substring(0, 200)
                });
                
                // Fallback: Extract colors using regex
                const hexMatch = (key: string) => {
                  const regex = new RegExp(`"${key}"\\s*:\\s*"(#[0-9A-Fa-f]{6})"`, "i");
                  const match = cleanedContent.match(regex);
                  return match ? match[1] : null;
                };
                const rgbaMatch = () => {
                  const regex = /"shadowRgba"\s*:\s*"(rgba?\([^)]+\))"/i;
                  const match = cleanedContent.match(regex);
                  return match ? match[1] : null;
                };
                
                const titleHex = hexMatch("titleColorHex");
                const artistHex = hexMatch("artistColorHex");
                const shadow = rgbaMatch();
                const accentHex = hexMatch("accentHex");
                
                if (titleHex && artistHex && shadow) {
                  paletteGuidance = {
                    titleColorHex: titleHex,
                    artistColorHex: artistHex,
                    shadowRgba: shadow,
                    accentHex: accentHex || undefined,
                  };
                  logStep("Palette guidance extracted via regex fallback", paletteGuidance);
                } else {
                  logStep("Regex fallback also failed", { titleHex, artistHex, shadow });
                }
              }
            } else {
              logStep("Gemini content was not a string", { contentType: typeof content });
            }
          } else {
            const errorText = await paletteRes.text();
            logStep("Palette API request failed", { status: paletteRes.status, error: errorText.substring(0, 300) });
          }
        }
      } catch (e) {
        logStep("Palette analysis exception (continuing)", {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack?.substring(0, 300) : undefined,
        });
      }

      // ===== PASS 2: ADD TEXT WITH VISION =====
      // Use gpt-image-1 with image input to add styled text with DEEP integration
      const paletteLockedColorBlock = paletteGuidance
        ? `===== PALETTE-LOCKED COLOR (NON-NEGOTIABLE) =====
TITLE_COLOR_HEX: ${paletteGuidance.titleColorHex}
ARTIST_COLOR_HEX: ${paletteGuidance.artistColorHex}
SHADOW_RGBA: ${paletteGuidance.shadowRgba}
${paletteGuidance.accentHex ? `ACCENT_HEX: ${paletteGuidance.accentHex}` : ""}

COLOR RULES:
- Apply these exact colors (or their material-equivalent tint if metallic/chrome) so the type matches the artwork lighting.
- Do NOT default to generic beige/ivory unless TITLE_COLOR_HEX is beige/ivory.
`
        : "";

      const textPrompt = `You are generating professional album cover typography for musicians.

The goal is for the text to feel PAINTED INTO the artwork, not overlaid on top.

===== TEXT CONTENT (SPELL EXACTLY AS SHOWN) =====
Song Title: "${songTitle || "Untitled"}"
Artist Name: "${artistName || ""}"

${paletteLockedColorBlock}

===== MANDATORY RENDER ORDER (CRITICAL – DO NOT IGNORE) =====
1. Analyze the background artwork and identify:
   - Primary light source direction
   - Secondary ambient light color
   - Atmospheric density (fog, haze, smoke, particles)

2. Conceptually place the text INTO the scene as if it exists physically in that environment

3. Apply lighting, atmosphere, grain, and depth effects AFTER the text is placed

4. Finalize edge treatment last so the text appears affected by the environment

${textStyleInstructions ? `===== CRITICAL: TYPOGRAPHY IDENTITY (NON-NEGOTIABLE) =====
${textStyleInstructions}

TYPOGRAPHY IDENTITY RULES:
- Letterform identity must remain recognizable
- Stroke structure, shapes, and proportions must match the style exactly
- Overall typography style must match the reference with high fidelity

ENVIRONMENTAL INTERACTION IS REQUIRED:
- Minor edge erosion, lighting bleed, atmospheric softness is allowed
- Text may slightly warp, fade, or soften where it meets fog, light, or shadow
- These effects must look intentional, cinematic, and professional
` : `===== TYPOGRAPHY STYLING =====
Design professional, album-ready typography that fits the ${genre} aesthetic.
The text should have depth, dimension, effects, and feel integrated with the scene.
`}

===== DEEP VISUAL INTEGRATION (REQUIRED) =====

**1. LIGHTING INTEGRATION**
- Match the exact light direction of the scene
- Apply consistent highlights and shadows on the text
- If the scene has rim lighting, the text must also receive rim lighting
- Text must reflect the same ambient color temperature as the environment

**2. ATMOSPHERIC INTEGRATION**
- If fog, haze, or smoke exists, it must subtly affect the text
- Atmospheric depth may slightly reduce contrast in distant text areas
- Text must feel like it exists inside the air, not above it

**3. DEPTH & OCCLUSION (MANDATORY)**
- At least one environmental element (fog wisp, shadow, light ray, grain) MUST partially overlap the text
- This overlap must be subtle and preserve readability
- This step anchors the text into the scene and is required

**4. SURFACE & TEXTURE MATCHING**
- Text surface must match the artwork's material quality
- Gritty artwork = textured or distressed text
- Clean artwork = smooth but still scene-affected text
- Apply the same grain, noise, or film texture as the artwork

**5. COLOR HARMONY**
- If PALETTE-LOCKED COLOR is provided above, it OVERRIDES all other color ideas
- Otherwise, text color must be derived from the artwork's existing palette
- Cool scenes = cool text tones
- Warm scenes = warm text tones
- No unrelated or artificial color choices

**6. EDGE TREATMENT**
- Text edges must NOT be perfectly sharp
- Slight softness, glow, or atmospheric blending is required
- Edges should breathe with the scene

===== TEXT PLACEMENT =====
- Place text in the lower third unless composition demands otherwise
- Text size: 25-35% of composition width for visibility at thumbnail size
- Text should feel intentionally composed, not mathematically centered
- Prioritize visual impact and balance over strict size rules

===== ARTWORK PRESERVATION =====
- Do NOT alter the main subjects or composition
- You MAY allow fog, light, grain, or atmosphere to interact with the text area
- The final result must look like one unified artwork

===== TECHNICAL =====
- 1:1 square (1024x1024)
- Song title: "${songTitle || "Untitled"}" (spell each letter correctly)
- Artist name: "${artistName || ""}" (spell each letter correctly)
- Professional album cover quality`;

      logStep("PASS 2: Adding text with vision input");

      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), 90_000);

      let textResponse: Response;
      try {
        // Use the edits endpoint to add text to the artwork
        textResponse = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: (() => {
            const formData = new FormData();
            // Convert base64 to blob for the form data
            const binaryString = atob(artworkBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "image/png" });
            formData.append("image", blob, "artwork.png");
            formData.append("prompt", textPrompt);
            formData.append("model", "gpt-image-1");
            formData.append("size", "1024x1024");
            return formData;
          })(),
          signal: controller2.signal,
        });
      } catch (e) {
        clearTimeout(timeout2);
        if (e instanceof DOMException && e.name === "AbortError") {
          throw new Error("Text generation timed out. Please try again.");
        }
        throw e;
      } finally {
        clearTimeout(timeout2);
      }

      if (!textResponse.ok) {
        const errorText = await textResponse.text();
        logStep("PASS 2 API error", { status: textResponse.status, error: errorText });
        if (textResponse.status === 429) throw new Error("RATE_LIMIT");
        if (textResponse.status === 402 || textResponse.status === 401) throw new Error("CREDITS_EXHAUSTED");
        if (errorText.includes("content_policy_violation") || errorText.includes("safety")) {
          throw new Error("CONTENT_MODERATED");
        }
        throw new Error(`OpenAI API error: ${textResponse.status}`);
      }

      const textData = await textResponse.json();
      const finalImageData = textData.data?.[0];
      
      if (!finalImageData) {
        throw new Error("Failed to add text. Please try again.");
      }

      imageUrl = finalImageData.b64_json 
        ? `data:image/png;base64,${finalImageData.b64_json}`
        : finalImageData.url;

      if (!imageUrl) {
        throw new Error("Failed to generate cover. Please try again.");
      }

      const totalTime = Date.now() - startTime;
      logStep("TWO-PASS generation complete", { pass1Ms: pass1Time, totalMs: totalTime });

      // Upload to storage
      finalImageUrl = imageUrl;
      
      if (imageUrl.startsWith("data:image")) {
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

    logStep("Generation complete (two-pass hybrid: artwork + text)");

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

    // Save generation to history
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
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to generate cover art" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
