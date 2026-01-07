import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

// Subscription tier limits (monthly generation counts)
const SUBSCRIPTION_TIERS = {
  "prod_TaUTWhd9yIEw4B": { name: "starter", limit: 50 },
  "prod_TaUUCtQXelHcBD": { name: "pro", limit: 150 },
  "prod_TaUUG2rRmV18Nz": { name: "studio", limit: 500 },
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-COVER] ${step}${detailsStr}`);
};

// Get current month in YYYY-MM format
const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  // ========== STYLE PRIORITY FLAGS ==========
  // High-priority styles completely override genre defaults
  const stylePriority: Record<string, "high" | "normal"> = {
    "Retro": "high",
    "Anime": "high",
    "Abstract": "high",
    "Minimalist": "high",
    "3D Render": "high",
    "Fine Art": "normal",
    "Illustration": "normal",
    "Cinematic": "normal",
    "Realism": "normal",
  };

  // ========== STYLE TECHNICAL OVERRIDES ==========
  const styleTechnicalOverrides: Record<string, string> = {
    "Minimalist": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Vector-clean edges with mathematically precise geometry
- Flat color rendering - NO gradients, NO noise, NO grain
- Maximum negative space (60-90% empty)
- NO atmospheric effects, NO fog, NO particles, NO textures
- NO photorealistic depth of field
- Swiss design grid precision`,

    "Abstract": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Non-representational forms only
- Emotional color expression over literal depiction
- NO realistic depth of field
- NO recognizable objects, faces, or scenes
- Pure artistic abstraction
- Bold texture and surface quality`,

    "Anime": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Japanese animation cel-shading technique
- Bold black outlines with aggressive line weight variation
- Speed lines, impact frames, motion blur streaks
- Dramatic lens flares and glowing auras
- Exaggerated expressions and dynamic poses
- NOT cute/soft - this is INTENSE, CINEMATIC anime`,

    "3D Render": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Octane/Redshift/Arnold render engine aesthetic
- Studio HDRI lighting with visible light sources
- Impossibly smooth geometry and perfect surfaces
- Neon rim lights (cyan, magenta, orange glows)
- Reflective floors, gradient backgrounds
- NO film grain, NO organic imperfections
- That "Cinema 4D Instagram" aesthetic`,

    "Retro": `
TECHNICAL REQUIREMENTS (MANDATORY):
- Heavy analog film grain (ISO 400-1600)
- Faded color science: Kodachrome, Ektachrome, or Polaroid
- Visible aging: scratches, dust, wear, light leaks
- Period-accurate color shifts: warm ambers, magenta casts
- VHS artifacts OR halftone printing dots where appropriate
- Must feel authentically vintage, not digitally filtered`,
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

    "3D Render": `HYPER-STYLIZED CGI / CINEMA 4D AESTHETIC - This MUST look like a 3D SOFTWARE RENDER, absolutely NOT a photograph or illustration.

MANDATORY CGI CHARACTERISTICS (NON-NEGOTIABLE):
- IMPOSSIBLY SMOOTH SURFACES: plastic, silicone, or rubber-like materials that scream "CGI"
- Subjects look like HIGH-END 3D MODELS, collectible figures, or Pixar-quality characters - NOT real humans
- VISIBLE SUBSURFACE SCATTERING GLOW on all organic materials
- GLOWING NEON RIM LIGHTS: cyan, magenta, orange accents around every edge
- Reflective floor/platform with gradient studio background or abstract 3D environment
- Perfect edge bevels, impossibly smooth curves, no organic imperfections
- Volumetric god rays, visible light beams, atmospheric fog with glow

STYLE REFERENCES:
- Beeple, Peter Tarka, Nikita Diakur, trending Behance/Dribbble 3D
- That "Instagram C4D aesthetic": clean, stylized, toy-like perfection
- Octane Render / Redshift / Arnold render engine look

FORBIDDEN (WILL FAIL THE BRIEF):
- NO photorealism, NO real human skin texture
- NO film grain, NO analog imperfections
- NO natural/outdoor photography look
- If this could be mistaken for a photograph, you have FAILED`,

    "Illustration": `TRADITIONAL ILLUSTRATION - Hand-painted artistic quality with visible human craft.
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

    "Anime": `MAXIMUM INTENSITY JAPANESE ANIME - Dramatic, exaggerated, high-impact anime style with OVERWHELMING visual power.

MANDATORY ANIME CHARACTERISTICS (NON-NEGOTIABLE):
- EXAGGERATED DRAMATIC EXPRESSIONS: intense eyes with multiple highlight reflections, tears streaming, visible veins when intense
- DYNAMIC ACTION POSES: extreme foreshortening, impossible camera angles, characters bursting out of frame
- INTENSE BACKLIGHTING: dramatic silhouettes, lens flares, glowing auras radiating from characters
- SPEED AND MOTION: speed lines radiating from subject, motion blur streaks, impact frames with white flash
- OVERSIZED DRAMATIC FEATURES: huge expressive eyes with detailed iris patterns, sharp angular jawlines, gravity-defying hair physics
- HIGH CONTRAST CEL-SHADING: deep blacks, bright highlights, aggressive rim lighting on hair and clothes
- ATMOSPHERIC INTENSITY: wind-blown hair and clothes, debris floating, energy particles, sakura petals or dramatic weather

STYLE REFERENCES:
- Attack on Titan intensity, Demon Slayer visual effects, Jujutsu Kaisen action, Chainsaw Man rawness
- Bold black outlines with aggressive line weight variation
- Deep saturated colors with neon accent highlights

FORBIDDEN (WILL FAIL THE BRIEF):
- NO photorealism, NO 3D render aesthetic
- NOT cute/soft/kawaii anime - this is DRAMATIC, INTENSE, CINEMATIC
- If this looks like a photograph or Western cartoon, you have FAILED`,

    "Fine Art": `MUSEUM-QUALITY FINE ART - Classical painting techniques worthy of gallery exhibition.
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

    "Abstract": `PURE ABSTRACT EXPRESSIONISM - Non-representational artistic expression. The subject IS the color, shape, and texture.

MANDATORY ABSTRACT CHARACTERISTICS (NON-NEGOTIABLE):
- Subject MUST be SHAPES, COLORS, TEXTURES - NOT realistic objects or scenes
- NO recognizable faces, NO realistic hands, NO literal depictions
- If the description mentions a "rose" - render it as RED ORGANIC FORMS and color fields
- If the description mentions a "moon" - render it as CIRCULAR LIGHT MASSES and gradients
- If the description mentions a "person" - render it as HUMAN-SUGGESTIVE SHAPES, not a realistic figure

ARTISTIC APPROACH:
- Bold color fields, gestural brushstrokes, drips, splatters, hard-edge geometry
- Emotional and psychological impact through PURE VISUAL ELEMENTS
- Color theory: complementary tensions, harmonious gradients, vibrating color relationships
- Strong emphasis on texture and surface quality

STYLE REFERENCES:
- Rothko color fields, Pollock action painting, Kandinsky geometry, Basquiat raw expression, Mondrian grids
- Symbolic, evocative imagery that SUGGESTS rather than DEPICTS

FORBIDDEN (WILL FAIL THE BRIEF):
- NO photorealism, NO recognizable objects rendered realistically
- NO faces, NO literal scenes, NO representational imagery
- If you can identify "what" is in the image, you have FAILED the abstract brief`,

    "Minimalist": `RADICAL MINIMALIST DESIGN - Maximum impact through extreme reduction. Less is EVERYTHING.

MANDATORY MINIMALIST CHARACTERISTICS (NON-NEGOTIABLE):
- 70-90% of the image MUST be empty negative space
- Maximum 2-3 visual elements in the ENTIRE composition
- FLAT colors only - absolutely NO gradients, NO textures, NO grain, NO noise
- Clean vector-like shapes with mathematically sharp geometric edges
- Single dominant color with ONE accent maximum (2-3 color palette TOTAL)

APPROACH:
- This is GRAPHIC DESIGN, not photography or illustration
- Swiss design principles: grid-based, functional beauty, precision
- Think: single object floating in vast emptiness
- Every element must be ESSENTIAL - remove everything else

STYLE REFERENCES:
- Saul Bass poster design, Japanese minimalism, Muji aesthetic
- Massimo Vignelli, Dieter Rams, Apple product photography

FORBIDDEN (WILL FAIL THE BRIEF):
- NO realistic textures, NO detailed backgrounds, NO landscapes, NO cityscapes
- NO atmospheric effects (fog, particles, grain)
- NO photorealistic rendering
- NO complex scenes with multiple subjects
- If there are more than 3 elements, you have FAILED the minimalist brief`,

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

    "Retro": `AUTHENTIC VINTAGE AESTHETIC - Genuine analog era feeling, NOT modern retro-filtered.
- Film grain: HEAVY, visible, authentic to 1970s-1990s film stocks (ISO 400-1600)
- Color palette: FADED, warm, with lifted blacks and crushed highlights
- Kodachrome warmth, Ektachrome saturation, or Polaroid softness
- Light leaks, lens flares, dust and scratches, age wear
- Halftone printing dots, CMYK registration errors where appropriate
- VHS tracking lines, analog video artifacts for 80s/90s vibe
- Vintage typography and graphic design sensibilities
- Reference: 1970s album covers, 1980s movie posters, 1990s music videos
- Warm amber tones, magenta shifts, cyan shadows
- Must feel authentically FROM a past era, not modern with a filter applied`,
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
    const isHighPriorityStyle = stylePriority[style] === "high";
    const technicalOverride = styleTechnicalOverrides[style] || "";

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
                  content: `You are a world-class concept artist creating album cover artwork. Your task: transform simple descriptions into VIVID, IMMERSIVE scene descriptions.

${isHighPriorityStyle ? `
===== CRITICAL STYLE CONSTRAINT: ${style} =====
This is a HIGH-PRIORITY STYLE that OVERRIDES normal cinematic/photorealistic language.

${style === "Minimalist" ? `For MINIMALIST: Describe vast emptiness, single geometric shapes, flat colors, negative space. Do NOT add fog, particles, textures, or atmospheric effects. Think Saul Bass, Japanese minimalism.` : ""}
${style === "Abstract" ? `For ABSTRACT: Describe color fields, shapes, textures, emotional color relationships - NOT literal objects. If the user mentions "a rose", describe "organic red forms bleeding into warm gradients". NO recognizable objects or faces.` : ""}
${style === "3D Render" ? `For 3D RENDER: Describe impossibly smooth CGI surfaces, neon rim lights, reflective floors, gradient backgrounds, toy-like perfection. This is Cinema 4D/Octane aesthetic, NOT photography.` : ""}
${style === "Anime" ? `For ANIME: Describe intense expressions, speed lines, dramatic backlighting, wind-blown elements, impact frames. This is Attack on Titan intensity, NOT soft/cute anime.` : ""}
${style === "Retro" ? `For RETRO: Describe faded film colors, heavy grain, light leaks, vintage warmth. The scene should feel like it's FROM the 70s/80s/90s.` : ""}

Your expanded description MUST be written specifically for ${style} rendering. Do NOT add cinematic/realistic language that contradicts this style.
` : `
THINK LIKE A DIRECTOR:
- What is the STORY of this scene? What just happened? What's about to happen?
- What EMOTION should viewers feel instantly?
- Where is the CAMERA positioned? What's in foreground, midground, background?
- What TIME OF DAY/NIGHT? What's the WEATHER? What's in the AIR (fog, smoke, particles, rain)?

SCENE-BUILDING REQUIREMENTS:
1. ENVIRONMENT - Build a complete world: ground textures, sky conditions, distant elements, ambient life
2. LIGHTING - Be SPECIFIC: "warm golden hour light streaming from camera-left, casting long purple shadows" not just "dramatic lighting"
3. ATMOSPHERE - Layer the air: volumetric fog, dust motes, smoke wisps, falling leaves, snow, embers, rain droplets
4. SUBJECT DETAIL - Describe materials, textures, wear patterns, reflections, how light interacts with surfaces
5. DEPTH - Include foreground elements (blurred plants, particles), midground (subject), background (environment fading into atmosphere)
6. MOTION/ENERGY - Flowing cloaks, rising smoke, swirling particles, wind-swept elements, ethereal glows pulsing

QUALITY KEYWORDS TO WEAVE IN:
- Cinematic depth of field, bokeh
- Subsurface scattering, rim lighting, god rays
- Photorealistic textures, weathered details
- Unreal Engine 5 quality, Octane render
- 8K resolution, hyperdetailed
`}

OUTPUT RULES:
- 200-350 words of pure visual poetry
- NO text/typography references
- Paint a scene so vivid the reader can FEEL the atmosphere
- Match ${style} aesthetic, ${mood} emotion, ${genre} genre context`
                },
                {
                  role: "user",
                  content: `Transform this into a breathtaking scene description${isHighPriorityStyle ? ` optimized for ${style} style` : ""}:

"${description}"

Style: ${style} | Mood: ${mood} | Genre: ${genre}

Write ONLY the expanded scene description - no explanations:`
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
      // Build genre section - suppress for high-priority styles that conflict
      const genreSection = isHighPriorityStyle 
        ? `===== GENRE CONTEXT: ${genre} =====
Adapt the ${style} aesthetic to feel appropriate for ${genre} music.
(Note: The visual STYLE takes priority over genre-typical visuals)`
        : `===== GENRE: ${genre} =====
Visual Direction: ${genreDirection.visual}
Emotional Narrative: ${genreDirection.narrative}`;

      // Build technical requirements - different for high-priority styles
      const technicalSection = isHighPriorityStyle && technicalOverride
        ? `===== STYLE-SPECIFIC TECHNICAL REQUIREMENTS =====
${technicalOverride}

===== COMPOSITION =====
- Perfect square composition (1024x1024)
- Album cover framing
- Edge-to-edge artwork, NO borders
- NO TEXT, NO LETTERS, NO WORDS - artwork only`
        : `===== TECHNICAL REQUIREMENTS =====
- Volumetric fog and atmospheric depth
- Cinematic lighting with high contrast
- Ultra-detailed textures and materials
- Realistic depth of field
- Unreal Engine 5 / Octane render quality
- Perfect square composition (1024x1024)
- Album cover framing
- Edge-to-edge artwork, NO borders
- NO TEXT, NO LETTERS, NO WORDS - artwork only`;

      const artworkPrompt = `Create ${isHighPriorityStyle ? `a ${style.toUpperCase()} style` : "an EXCEPTIONALLY DETAILED, PROFESSIONAL"} album cover artwork for a ${genre} song.${isHighPriorityStyle ? ` The ${style} aesthetic is NON-NEGOTIABLE and takes priority over all other considerations.` : " This MUST be AAA-quality, hyper-detailed, visually stunning artwork."}

===== VISION${isHighPriorityStyle ? ` (${style.toUpperCase()} INTERPRETATION)` : " (AI-ENHANCED)"} =====
${expandedDescription}

===== VISUAL STYLE: ${style} (${isHighPriorityStyle ? "HIGH PRIORITY - MUST DOMINATE" : "STANDARD"}) =====
${visualStyle}

===== MOOD: ${mood} =====
${moodStyle}

${genreSection}

${technicalSection}`;

      logStep("PASS 1: Starting artwork-only generation", { 
        style, 
        isHighPriorityStyle, 
        hasTechnicalOverride: !!technicalOverride,
        genreSuppressed: isHighPriorityStyle 
      });

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
          logStep("Pass 1.5 starting palette analysis with GPT-5 vision");
          
          const paletteRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "openai/gpt-5",
                max_completion_tokens: 400,
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a senior album-cover typography art director. Analyze images and return ONLY valid JSON with no markdown formatting.",
                  },
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text:
                          `Analyze this album artwork and determine the best text colors that match the scene's lighting and atmosphere.

Return STRICT JSON only (no markdown, no code blocks) with these keys:
- titleColorHex: The hex color for the song title (must feel LIT by the scene)
- artistColorHex: The hex color for the artist name (must harmonize with scene)
- shadowRgba: Text shadow in rgba format for depth
- accentHex: Optional accent/glow color from the scene

RULES:
1. Extract colors from the ACTUAL lighting in the image (glows, highlights, dominant light sources)
2. If there's colored lighting (neon, sunset, etc.), the text colors MUST reflect that
3. NEVER default to generic beige/ivory/#F5F5DC unless the scene is actually warm-white lit
4. Ensure the colors would be readable with good contrast
5. Hex format: #RRGGBB, shadow format: rgba(r,g,b,a)

Example response (no markdown):
{"titleColorHex":"#FF6B35","artistColorHex":"#FFD700","shadowRgba":"rgba(0,0,0,0.6)","accentHex":"#FF4500"}`,
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
              }),
            }
          );

          // Log full response for debugging
          const paletteJson = await paletteRes.json();
          logStep("Pass 1.5 full API response", { 
            status: paletteRes.status, 
            ok: paletteRes.ok,
            hasChoices: !!paletteJson?.choices,
            choicesLength: paletteJson?.choices?.length,
            firstChoice: paletteJson?.choices?.[0] ? {
              finishReason: paletteJson.choices[0].finish_reason,
              hasMessage: !!paletteJson.choices[0].message,
              contentType: typeof paletteJson.choices[0].message?.content,
              contentPreview: String(paletteJson.choices[0].message?.content || "").substring(0, 200)
            } : null
          });

          if (paletteRes.ok) {
            const content = paletteJson?.choices?.[0]?.message?.content;
            
            if (typeof content === "string" && content.trim().length > 0) {
              // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
              let cleanedContent = content.trim();
              if (cleanedContent.startsWith("```")) {
                cleanedContent = cleanedContent
                  .replace(/^```(?:json)?\s*/i, "")
                  .replace(/```\s*$/, "")
                  .trim();
                logStep("Stripped markdown from response", { cleanedContent: cleanedContent.substring(0, 300) });
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
              logStep("GPT-5 content was empty or not a string", { contentType: typeof content, contentLength: content?.length });
            }
          } else {
            logStep("Palette API request failed", { status: paletteRes.status, error: JSON.stringify(paletteJson).substring(0, 300) });
          }
          
          // TEXT-BASED FALLBACK: If vision failed, derive colors from the expanded prompt
          if (!paletteGuidance) {
            logStep("Vision-based palette failed, attempting text-based fallback");
            
            const textFallbackRes = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "openai/gpt-5-mini",
                  max_completion_tokens: 300,
                  messages: [
                    {
                      role: "system",
                      content: "You are a color theory expert for album cover art. Return only valid JSON.",
                    },
                    {
                      role: "user",
                      content: `Based on this scene description, suggest text colors that would look naturally lit by the scene:

Scene: ${expandedDescription.substring(0, 800)}
Genre: ${genre}
Mood: ${mood}

Return STRICT JSON only with: titleColorHex, artistColorHex, shadowRgba, accentHex
- Colors must match the lighting described (if neon green lighting, use greenish tints)
- If dark/moody, use colors that pop against darkness
- NEVER use generic beige/ivory unless the scene is warm-white lit
- Format: {"titleColorHex":"#RRGGBB","artistColorHex":"#RRGGBB","shadowRgba":"rgba(r,g,b,a)","accentHex":"#RRGGBB"}`,
                    },
                  ],
                }),
              }
            );
            
            if (textFallbackRes.ok) {
              const fallbackJson = await textFallbackRes.json();
              const fallbackContent = fallbackJson?.choices?.[0]?.message?.content;
              logStep("Text fallback response", { content: fallbackContent?.substring?.(0, 300) });
              
              if (typeof fallbackContent === "string" && fallbackContent.trim().length > 0) {
                let cleanedFallback = fallbackContent.trim();
                if (cleanedFallback.startsWith("```")) {
                  cleanedFallback = cleanedFallback.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
                }
                
                try {
                  const parsed = JSON.parse(cleanedFallback);
                  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
                  if (parsed?.titleColorHex && parsed?.artistColorHex && hexRegex.test(parsed.titleColorHex) && hexRegex.test(parsed.artistColorHex)) {
                    paletteGuidance = {
                      titleColorHex: String(parsed.titleColorHex),
                      artistColorHex: String(parsed.artistColorHex),
                      shadowRgba: parsed.shadowRgba || "rgba(0,0,0,0.5)",
                      accentHex: parsed.accentHex ? String(parsed.accentHex) : undefined,
                    };
                    logStep("Palette guidance from text fallback", paletteGuidance);
                  }
                } catch {
                  logStep("Text fallback JSON parse failed");
                }
              }
            }
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

    // Track subscription usage OR deduct credit
    if (userId && hasUnlimitedAccess && subscriptionTier) {
      // Increment monthly usage for subscribers
      const currentMonth = getCurrentMonthYear();
      
      // Try to upsert the usage record
      const { data: existingUsage } = await supabaseClient
        .from("subscription_usage")
        .select("id, generation_count")
        .eq("user_id", userId)
        .eq("month_year", currentMonth)
        .maybeSingle();

      if (existingUsage) {
        // Update existing record
        await supabaseClient
          .from("subscription_usage")
          .update({ generation_count: existingUsage.generation_count + 1 })
          .eq("id", existingUsage.id);
        
        logStep("Subscription usage incremented", { 
          month: currentMonth, 
          newCount: existingUsage.generation_count + 1,
          limit: subscriptionLimit 
        });
      } else {
        // Insert new record for this month
        await supabaseClient
          .from("subscription_usage")
          .insert({ 
            user_id: userId, 
            month_year: currentMonth, 
            generation_count: 1 
          });
        
        logStep("Subscription usage started", { month: currentMonth, count: 1, limit: subscriptionLimit });
      }
    } else if (userId && !hasUnlimitedAccess) {
      // Deduct credit for non-subscribers
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
