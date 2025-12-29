// Text Style Variants Configuration
// Only 5 styles available: Creative, Dark, Futuristic, Modern, Retro

export interface TextStyleVariant {
  id: string;
  name: string;
  description: string;
  previewImage: string; // URL to preview image (in public/text-styles/)
  promptInstructions: string; // Detailed AI prompt for this exact style
  referenceImages?: string[]; // Additional reference images for AI
}

export interface TextStyleWithVariants {
  id: string;
  name: string;
  description: string;
  example: string;
  prompt: string;
  variants: TextStyleVariant[];
}

// Detailed descriptions for each creative variant - MUST MATCH PREVIEW IMAGES
// These are EXTENSIVE prompts designed for AI image generation accuracy
const CREATIVE_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "TYPOGRAPHY STYLE: Elegant flowing white brush script calligraphy with soft ethereal glow and MOTION BLUR edges. LETTERFORMS: Organic, hand-painted cursive with natural brush stroke variations, thick-to-thin transitions. CRITICAL EFFECT - MOTION/ZOOM BLUR: The FIRST 1-2 letters and LAST 1-2 letters of the song title MUST have a horizontal motion blur/zoom blur effect - letters appear to be fading/blurring into motion at the edges, like they're zooming in from the sides. The center letters remain sharp and crisp. EFFECTS: Soft white light bloom/halo around text, dreamy luminescence, edge letters dissolving into directional motion blur streaks. COLOR: Pure white text with soft gray shadows on dark background. MOOD: Romantic, ethereal, premium wedding invitation aesthetic with cinematic motion feel.",
  
  2: "TYPOGRAPHY STYLE: Heavy distressed uppercase industrial sans-serif with aggressive grunge texture. LETTERFORMS: Bold, blocky condensed letters with rough eroded edges, paint splatter, and worn-away sections. EFFECTS: Spray paint overspray, ink splatter marks, scratched and weathered surface texture. COLOR: Off-white/gray text with heavy black distress marks on dark background. MOOD: Street art, punk rock poster, urban decay aesthetic.",
  
  3: "TYPOGRAPHY STYLE: Ultra-bold chunky distorted display font with HORIZONTAL BLUR/LIQUIFY LINES cutting through the text. LETTERFORMS: Extremely thick, heavy sans-serif with inconsistent letter sizes - some letters much larger than others creating dynamic visual rhythm. CRITICAL EFFECT - LIQUIFY DISTORTION LINES: There MUST be 2-3 horizontal wavy blur/liquify distortion lines running THROUGH the text - these lines warp and smear the letters where they cross, creating a glitchy/liquid warp effect. The lines stretch and blur the letterforms horizontally as if the text was liquified in those areas. EFFECTS: Horizontal liquify wave distortions cutting through letters, slight perspective warping, glitch-like horizontal smear bands. COLOR: High contrast black and white. MOOD: Bold, impactful, glitchy modern poster design, attention-grabbing distortion aesthetic.",
  
  4: "TYPOGRAPHY STYLE: ULTRA TALL condensed EXTRA-BOLD SANS-SERIF with WAVY SLANTED distortion. CRITICAL WEIGHT - MUST BE EXTRA BOLD: Letters must be THICK, CHUNKY, and HEAVY - never thin or light weight. Stroke width should be substantial and commanding. CRITICAL - MUST BE SANS-SERIF: Absolutely NO serifs, NO decorative flourishes, NO thin strokes - clean geometric sans-serif letterforms only (like Impact, Bebas Neue Bold, or Black weight condensed fonts). LETTERFORMS: Extremely tall and narrow uppercase letters with VERY THICK stroke weight, letters touching or nearly touching (extremely tight letter spacing). CRITICAL WAVY EFFECT: The letters have a pronounced WAVE/SLANT distortion - they curve and lean dynamically. The vertical strokes curve slightly creating an organic wave pattern across the word. NEVER use thin fonts. NEVER use serif fonts. COLOR: White or colored text on dark background. MOOD: Bold impactful headlines with dynamic wavy energy.",
  
  5: "TYPOGRAPHY STYLE: EXTREMELY DISTRESSED GRUNGE SANS-SERIF with ONE MAJOR JAGGED CRACK. CRITICAL - MUST BE SANS-SERIF: Heavy bold geometric sans-serif (like Impact), NO serifs, NO glow. LETTERFORMS: Thick, bold, uppercase with MAXIMUM DISTRESS - rough eroded edges, chunks missing, heavily worn and damaged appearance. ABSOLUTE REQUIREMENT - JAGGED CRACK: There MUST ALWAYS be ONE SIGNIFICANT JAGGED CRACK running diagonally through the ENTIRE text from one side to the other - this crack is TRANSPARENT showing the background through it. The crack should be irregular and jagged like cracked concrete or shattered stone, cutting completely through multiple letters. This crack is NON-NEGOTIABLE and must be prominent and visible. EXTREME DISTRESS TEXTURE: Letters must look SEVERELY weathered - rough pitted surface like old concrete, paint peeling, eroded edges, visible wear and damage throughout. The letters should look ancient, broken, and beaten. Every letter should have visible damage, rough edges, and distress marks. COLOR: Off-white/cream weathered text on dark background. MOOD: Post-apocalyptic, destroyed, maximum grunge and decay. NO CLEAN EDGES, NO SMOOTH SURFACES.",
  
  6: "TYPOGRAPHY STYLE: GLITCHED METALLIC CHROME TEXT with severe digital corruption and fragmentation. LETTERFORMS: Bold, italic condensed sans-serif with chrome/silver metallic finish, letters breaking apart horizontally. EFFECTS: CRITICAL - Heavy horizontal glitch lines slicing through text, pixel displacement, digital scan line artifacts, data corruption blocks, RGB color separation on edges, scattered pixel debris around letters. COLOR: Silver/chrome metallic gradient with white highlights, black glitch blocks, grayscale corruption artifacts. MOOD: Cyberpunk, corrupted data, VHS tracking error, digital dystopia aesthetic. The text should look like it's being destroyed by a computer virus or signal interference.",
  
  7: "TYPOGRAPHY STYLE: BLURRY GLOWING TEXT with EXTREME CHAOTIC MELTING/DISSOLVING BOTTOM. LETTERFORMS: Bold uppercase, entire text has soft blur/glow. CRITICAL - EXTREME BOTTOM DISSOLUTION (5X INTENSITY): The BOTTOM THIRD of each letter MUST have MASSIVELY EXAGGERATED melting, warping, blurring, and fading. The bottom portion should be COMPLETELY DESTROYED - ultra blurry, extremely warped and distorted, chaotically melting, and FADING TO NOTHING. The melting should extend FAR below the letters with maximum blur and distortion. Letters should look like they are violently dissolving, melting into oblivion with intense warping. The bottom portions become SO BLURRY they are nearly invisible, fading to complete transparency. This dissolution effect must be EXTREME, CHAOTIC, and DRAMATIC - not subtle. The warping should twist and distort the melting portions beyond recognition. Think of letters being disintegrated from the bottom up - maximum destruction, maximum blur, maximum fade. The effect should be 5X more intense than normal melting text. COLOR: White/light glowing text on dark background. MOOD: Violently dissolving, extreme warped melting, fading into void.",
  
  8: "TYPOGRAPHY STYLE: BOLD SERIF with TOP THIRD COMPLETELY BLURRED OUT. LETTERFORMS: BOLD, HEAVY serif font with subtle serifs and thick strokes - NOT thin like Times New Roman. The font should have substantial weight and presence, with refined but minimal serifs. Think bold display serif, not book text serif. CRITICAL BLOWN OUT TOP: The TOP THIRD of each letter itself MUST be COMPLETELY BLURRED OUT and FADING - the actual letterforms dissolve into extreme blur at the top, becoming transparent and disappearing into wispy mist. The bottom 2/3 of letters are more solid and readable, but the top third of every letter blurs out dramatically into fading mist/smoke that extends above. This blur is part of the letters themselves, not just effects above them. The transition from solid to blurred should be dramatic. COLOR: Any color that matches the cover vibe - the text should complement the artwork. MOOD: Ethereal, fading away, dissolving upward into mist, dramatic blown out effect. CRITICAL: Font must be BOLD with weight, not thin. Top third COMPLETELY blurred.",
  
  9: "TYPOGRAPHY STYLE: TEXT MADE ENTIRELY OF SMOKE/FOG with WISPS EXPANDING THROUGHOUT. LETTERFORMS: THIN, elegant script or serif letters that appear to be COMPLETELY FORMED FROM SMOKE - the letters themselves are made of swirling smoke, mist, and fog. NOT solid letters with smoke effects - the actual letterforms ARE smoke. CRITICAL SMOKE EFFECT: The entire text must look like it is constructed from wispy, swirling smoke. Smoke wisps and tendrils should extend and expand OUT from all parts of every letter - top, bottom, sides - as if the text is disintegrating and dissolving into the air. The letters should have a thin, ethereal quality with smoke particles and wisps floating away in all directions. TEXTURE: Soft, translucent smoke texture throughout. The edges of letters are undefined and wispy, blending into smoke trails. The text should feel like it could disappear at any moment - fragile and ephemeral. COLOR: Gray/white smoke on dark background, or smoke color that complements the cover. MOOD: Ethereal, ghostly, disintegrating, vanishing into mist and fog. The text is MADE OF SMOKE, not text with smoke added.",
  
  10: "TYPOGRAPHY STYLE: BOLD HEAVY liquid chrome mercury metallic text with mirror reflections. LETTERFORMS: THICK, BLOCKY, HEAVY WEIGHT sans-serif or slab serif - NOT thin or rounded. The letters should be MASSIVE and BOLD with substantial stroke weight, appearing as thick slabs of liquid metal. Think heavy industrial chrome, not delicate mercury. EFFECTS: Perfect mirror reflections of environment, chrome specular highlights, liquid surface tension appearance, water droplets on metal surface. COLOR: Silver chrome with reflected colors from surroundings, bright white highlights and deep shadows for dimension. MOOD: Premium luxury, powerful, industrial strength, high-end product design. CRITICAL: Letters must be BOLD and HEAVY with thick strokes - NOT thin or wispy."
};

const DARK_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "TYPOGRAPHY STYLE: Gothic blackletter with chrome metallic finish and sparkle effects. LETTERFORMS: Sharp, pointed medieval blackletter with dramatic angular serifs and high contrast thick/thin strokes. EFFECTS: Mirror-finish chrome surface, small star sparkle highlights scattered around text, sharp pointed terminals. COLOR: Silver chrome with bright white specular highlights on black background. MOOD: Medieval dark fantasy, heavy metal album art, royal gothic luxury.",
  
  2: "TYPOGRAPHY STYLE: EXTREME DEATH METAL / BLACK METAL CONTROLLED CHAOS typography with sharp angular extensions and spikes. LETTERFORMS: Aggressive, angular blackletter-inspired uppercase letters with SHARP POINTED SPIKE EXTENSIONS shooting outward from letters in all directions - top, bottom, and sides. Letters have dramatic thick-to-thin contrast with razor-sharp terminals. The letterforms are BARELY readable due to the extreme angular distortions and spike decorations - this controlled chaos is intentional. CRITICAL SPIKE EXTENSIONS: Every letter MUST have multiple sharp pointed extensions, blade-like protrusions, and angular spikes extending outward. Some spikes curve and hook, others are straight and dagger-like. The spikes interweave between letters creating complex overlapping geometry. Letters connect to each other through these sharp extensions. ANGULAR DISTORTION: Letters are stretched, warped, and distorted with exaggerated angular forms. Vertical strokes may curve or slash at dramatic angles. The overall composition should look like weaponized calligraphy - dangerous and aggressive. TEXTURE: Subtle metallic sheen with chrome/silver highlights on the letter surfaces. The metal appears polished but deadly. SPACING: Letters are tightly packed and overlapping, with spikes from one letter extending into the space of adjacent letters, creating an interlocked chaotic but balanced composition. COLOR: Silver/white metallic text with sharp highlights on pure black background. MOOD: Death metal album art, black metal, extreme music, aggressive weaponized typography that looks dangerous and barely readable but maintains artistic cohesion. The chaos is CONTROLLED - it's complex but intentional, not random.",
  
  3: "TYPOGRAPHY STYLE: TALL CONDENSED GOTHIC HORROR typography with EXTREMELY SHARP pointed serifs. LETTERFORMS: VERY TALL and NARROW uppercase letters with EXTREME vertical condensation - letters are stretched VERY TALL relative to their width, creating an imposing towering presence. The letters use a gothic/blackletter-inspired style with EXTREMELY SHARP, DAGGER-LIKE POINTED SERIFS at the top and bottom of every vertical stroke. CRITICAL HEIGHT RATIO: Letters must be at LEAST 3-4x taller than they are wide. This extreme vertical stretch creates an unsettling, horror movie poster feel. SHARP POINTED SERIFS: Every serif is RAZOR SHARP and pointed like daggers or vampire fangs. The serifs at the tops of letters point upward like spires, the serifs at the bottoms point downward like stakes. These are NOT subtle - they are dramatically sharp and menacing. STROKE STYLE: Letters have dramatic thick-to-thin contrast with the main vertical strokes being thick and powerful while the connecting strokes are thinner. The overall feel is of ancient gothic castle spires and medieval weaponry. TEXTURE: Subtle stone or metal texture on the letter surfaces, can have slight weathering or cracks. A subtle gradient from lighter at top to slightly darker at bottom adds dimension. SPACING: Letters are moderately spaced to allow each sharp serif to be visible, but close enough to feel cohesive as a title treatment. COLOR: Ghostly white/silver/gray metallic text with subtle highlights and shadows to emphasize the sharp edges. The text appears carved from stone or forged from metal. Pure black background. MOOD: Gothic horror, haunted castle, vampire aesthetic, horror movie titles, dark fantasy. The typography should feel ancient, imposing, dangerous, and deeply unsettling.",
  
  4: "TYPOGRAPHY STYLE: Smoke/mist dissolving ethereal text. LETTERFORMS: Letters that appear to be made of or dissolving into smoke, soft undefined edges that fade into wisps. EFFECTS: Swirling smoke tendrils, letters fading at edges, atmospheric fog, gradient opacity. COLOR: Gray/white smoke on black background, subtle transparency. MOOD: Mysterious, supernatural, haunting disappearance.",
  
  5: "TYPOGRAPHY STYLE: Aggressive blackletter with sharp pointed extensions. LETTERFORMS: Heavy metal style blackletter with exaggerated sharp spikes and points extending from letters, angular aggressive terminals. EFFECTS: Sharp pointed protrusions, blade-like extensions, subtle metallic sheen. COLOR: White/silver text with sharp contrast on black background. MOOD: Death metal, aggressive, dangerous, weaponized typography.",
  
  6: "TYPOGRAPHY STYLE: Torn paper collage with layered dark textures. LETTERFORMS: Letters appear cut or torn from different paper sources, uneven edges, varied textures within each letter. EFFECTS: Ripped paper edges, layered textures, visible paper grain, chaotic overlapping. COLOR: Off-white torn paper on black with visible texture variations. MOOD: Punk zine, chaotic art, deconstructed design.",
  
  7: "TYPOGRAPHY STYLE: Digital glitch corruption with scan lines. LETTERFORMS: Sans-serif text heavily corrupted with digital artifacts, horizontal displacement, broken apart sections. EFFECTS: Scan lines, RGB color separation, pixel displacement, data corruption blocks, static noise. COLOR: White text with cyan/magenta glitch artifacts on black. MOOD: Corrupted signal, cyberpunk horror, digital decay.",
  
  8: "TYPOGRAPHY STYLE: Burning ember text with fire and charred edges. LETTERFORMS: Letters appear to be burning wood or paper, glowing hot edges, charred and crumbling sections. EFFECTS: Glowing ember edges, floating sparks, ash particles, smoke, heat distortion. COLOR: Orange/red glowing edges fading to charred black, ember particles. MOOD: Destruction, intense heat, apocalyptic fire.",
  
  9: "TYPOGRAPHY STYLE: Frozen ice crystal text with frost effects. LETTERFORMS: Letters made of or covered in ice, sharp crystalline edges, frozen translucent appearance. EFFECTS: Ice crystals forming on letters, frost patterns, frozen condensation, icicle formations. COLOR: Pale blue-white ice with cold highlights on dark background. MOOD: Frozen, unforgiving cold, winter horror.",
  
  10: "TYPOGRAPHY STYLE: Minimal shadow silhouette with elegant depth. LETTERFORMS: Clean, elegant serif or sans-serif with strong shadow creating dimensional depth, sophisticated restraint. EFFECTS: Long dramatic shadow casting, subtle gradient in shadow, clean crisp edges. COLOR: White text with deep black shadow on dark gray background. MOOD: Elegant mystery, sophisticated darkness, minimal drama."
};

const FUTURISTIC_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "TYPOGRAPHY STYLE: Chrome italic racing script with metallic shine and star sparkles. LETTERFORMS: Bold, slanted connected script with speed-inspired angles, sharp terminals, racing aesthetic. EFFECTS: Mirror-finish chrome surface, lens flare sparkle highlights, subtle motion blur suggestion. COLOR: Silver chrome with bright white specular highlights on dark background. MOOD: Luxury sports cars, high-speed racing, premium performance.",
  
  2: "TYPOGRAPHY STYLE: Neon circuit board integrated text. LETTERFORMS: Modern sans-serif with circuit traces extending from letters, PCB-inspired geometric connections. EFFECTS: Glowing neon lines, circuit paths connecting letters, electronic nodes, subtle pulse effect. COLOR: Electric cyan/green neon glow on dark PCB-textured background. MOOD: Cyberpunk tech, electronic circuits, AI/computing.",
  
  3: "TYPOGRAPHY STYLE: Sleek titanium/chrome metallic finish. LETTERFORMS: Clean, geometric sans-serif with brushed metal texture, precision engineering aesthetic. EFFECTS: Brushed metal grain, subtle reflections, machined precision edges. COLOR: Cool silver/titanium with blue-tinted highlights on dark background. MOOD: Aerospace technology, premium devices, precision engineering.",
  
  4: "TYPOGRAPHY STYLE: Heavy digital glitch with RGB separation. LETTERFORMS: Bold sans-serif torn apart by glitch effects, horizontal displacement creating fragmented appearance. EFFECTS: RGB color channel separation, horizontal slice displacement, pixel corruption, digital artifacts. COLOR: White text with separated cyan/magenta/yellow channels on black. MOOD: System malfunction, cyber attack, digital corruption.",
  
  5: "TYPOGRAPHY STYLE: Elegant high-contrast Didone serif. LETTERFORMS: Refined serif with extreme thick/thin contrast, hairline serifs, elegant vertical stress. EFFECTS: Clean, precise letterforms with minimal effects, sophisticated restraint. COLOR: Pure white on black, perfect contrast. MOOD: High fashion, luxury editorial, timeless elegance with modern sensibility.",
  
  6: "TYPOGRAPHY STYLE: Plasma energy glow contained in letter shapes. LETTERFORMS: Bold letters that appear to contain swirling plasma energy, glowing from within. EFFECTS: Pulsing inner glow, energy wisps, electrical plasma texture, outer glow halo. COLOR: Electric blue/purple plasma glow with white hot core on dark background. MOOD: Contained power, sci-fi energy, fusion reactor.",
  
  7: "TYPOGRAPHY STYLE: Technical wireframe blueprint aesthetic. LETTERFORMS: Letters rendered as technical line drawings, construction lines visible, engineering diagram style. EFFECTS: Thin precise lines, measurement annotations, grid alignment, technical callouts. COLOR: Cyan/blue lines on dark navy blueprint background. MOOD: Engineering precision, technical design, architectural planning.",
  
  8: "TYPOGRAPHY STYLE: ULTRA HIGH-CONTRAST DIDONE SERIF - the most extreme thick/thin contrast possible, like Bodoni Poster or Didot Display at their most dramatic. LETTERFORMS: Refined uppercase serif with MAXIMUM 10:1 thick-to-hairline stroke ratio - thick verticals are VERY BOLD while horizontal hairlines are RAZOR THIN (nearly disappearing). Ball terminals, unbracketed flat serifs, strong vertical stress. KEY VISUAL MARKERS: The contrast must be SO extreme that thin strokes look almost fragile compared to thick strokes. Letters appear elegant yet powerful. ABSOLUTELY NO textured effects, NO 3D, NO glow - pure clean typography only. COLOR: Pure crisp white on solid black. MOOD: High fashion magazine cover (Vogue, Harper's Bazaar), luxury editorial, timeless elegance.",
  
  9: "TYPOGRAPHY STYLE: Digital matrix code rain integration. LETTERFORMS: Text integrated with falling green code rain, characters partially obscured by cascading data. EFFECTS: Vertical falling code streams, glowing characters, digital rain overlay. COLOR: Bright green matrix code on black background. MOOD: Hacker aesthetic, digital realm, cyberspace.",
  
  10: "TYPOGRAPHY STYLE: Floating holographic projection with depth layers. LETTERFORMS: Semi-transparent text appearing as 3D hologram, visible scan lines, floating in space. EFFECTS: Holographic flicker, layered transparency, projection beam visible, scan lines. COLOR: Cyan/blue hologram with translucent quality on dark background. MOOD: Advanced technology, sci-fi interface, futuristic display."
};

const MODERN_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "TYPOGRAPHY STYLE: Ultra-bold condensed headline sans-serif. LETTERFORMS: Extremely heavy, very tightly spaced uppercase, maximum visual weight, newspaper headline impact. EFFECTS: None - pure typographic power through weight and scale. COLOR: Solid black on white or white on black, high contrast. MOOD: Bold journalism, impactful headlines, commanding presence.",
  
  2: "TYPOGRAPHY STYLE: Bold extended sans-serif with generous tracking. LETTERFORMS: Wide, bold sans-serif with letters spaced apart, strong horizontal emphasis. EFFECTS: Clean, no effects - typographic impact through spacing and weight. COLOR: White on dark or black on light, clean contrast. MOOD: Contemporary branding, modern luxury, confident statement.",
  
  3: "TYPOGRAPHY STYLE: Thin elegant extended sans-serif. LETTERFORMS: Ultra-light weight, wide letterforms with generous letter-spacing, refined and delicate. EFFECTS: Minimal - pure elegance through restraint. COLOR: White or light gray on dark, subtle contrast. MOOD: High fashion, luxury editorial, refined minimalism.",
  
  4: "TYPOGRAPHY STYLE: Gradient color overlay on bold sans-serif. LETTERFORMS: Bold, clean sans-serif serving as canvas for gradient. EFFECTS: Smooth gradient transition across text, modern color blending. COLOR: Vibrant gradient (pink to orange, blue to purple, etc.) on contrasting background. MOOD: Contemporary digital, fresh and energetic, social media aesthetic.",
  
  5: "TYPOGRAPHY STYLE: Bold rounded sans-serif. LETTERFORMS: Heavy weight with rounded terminals and corners, friendly geometric forms. EFFECTS: None - clean, approachable through rounded forms. COLOR: White on dark background, soft contrast. MOOD: Friendly tech, approachable modern, contemporary warmth.",
  
  6: "TYPOGRAPHY STYLE: Split/layered color offset effect. LETTERFORMS: Bold sans-serif with duplicated layers offset slightly, creating depth through color. EFFECTS: Multiple colored layers offset horizontally or vertically, risograph-style overlap. COLOR: Overlapping cyan and magenta, or complementary colors on white. MOOD: Dynamic design, energetic printing, contemporary graphic style.",
  
  7: "TYPOGRAPHY STYLE: Halftone dot pattern texture. LETTERFORMS: Bold text filled with halftone dot pattern, retro printing technique. EFFECTS: Visible dot grid pattern within letterforms, varying dot sizes for tone. COLOR: Black dots on white or colored dots on contrasting background. MOOD: Retro-modern print, pop art influence, graphic texture.",
  
  8: "TYPOGRAPHY STYLE: Clean sans-serif with soft dimensional shadow. LETTERFORMS: Medium weight, friendly sans-serif with subtle 3D depth effect. EFFECTS: Soft, slightly offset shadow creating gentle lift from surface. COLOR: White or colored text with soft gray/colored shadow. MOOD: Approachable, friendly modern, subtle dimension.",
  
  9: "TYPOGRAPHY STYLE: Geometric constructivist letterforms. LETTERFORMS: Letters built from basic geometric shapes - circles, triangles, rectangles, visible construction. EFFECTS: Visible geometric building blocks, mathematical precision. COLOR: Bold primary colors or black/white geometric forms. MOOD: Bauhaus influence, artistic construction, designed typography.",
  
  10: "TYPOGRAPHY STYLE: Organic gradient mesh flowing through text. LETTERFORMS: Sans-serif serving as container for flowing gradient mesh. EFFECTS: Smooth, organic color transitions, fluid gradient movement. COLOR: Flowing gradients of complementary colors, organic transitions. MOOD: Fluid contemporary, organic digital, smooth modern aesthetic."
};

const RETRO_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "TYPOGRAPHY STYLE: 3D chrome script with deep extrusion. LETTERFORMS: Flowing connected script with rounded strokes, 80s chrome lettering style. EFFECTS: Deep 3D extrusion showing side faces, mirror chrome reflections, dramatic shadows. COLOR: Silver chrome with gradient from bright to shadowed, sparkle highlights. MOOD: 80s movie titles, retro luxury, nostalgic chrome.",
  
  2: "TYPOGRAPHY STYLE: Elegant neon signature script with soft glow. LETTERFORMS: Thin, delicate connected cursive like a handwritten signature, neon tube construction. EFFECTS: Soft outer glow, light bloom, subtle reflection below. COLOR: White or pastel neon with matching glow halo on dark background. MOOD: Elegant nightlife, upscale lounge, sophisticated retro.",
  
  3: "TYPOGRAPHY STYLE: Heavy groovy rounded serif. LETTERFORMS: Very thick, rounded Cooper Black style with friendly bubble proportions, 70s aesthetic. EFFECTS: Minimal - impact through bold friendly forms. COLOR: Warm colors or white on contrasting background. MOOD: 70s advertising, friendly retro, groovy warmth.",
  
  4: "TYPOGRAPHY STYLE: 8-bit pixel art serif font. LETTERFORMS: Blocky, pixelated letterforms with visible pixel grid, retro video game typography. EFFECTS: Jagged pixel edges, grid-aligned construction. COLOR: Bright arcade colors or white pixels on dark. MOOD: Retro gaming, 8-bit nostalgia, arcade aesthetic.",
  
  5: "TYPOGRAPHY STYLE: Groovy 70s flowing script. LETTERFORMS: Rounded, bouncy connected script with disco-era personality, playful curves. EFFECTS: Soft, friendly forms with smooth connections. COLOR: Warm retro palette on contrasting background. MOOD: Disco era, funky 70s, groovy vibes.",
  
  6: "TYPOGRAPHY STYLE: Chrome italic racing font with sparkles. LETTERFORMS: Bold, slanted condensed sans-serif with speed aesthetic, racing stripe feel. EFFECTS: Chrome metallic finish, lens flare sparkles, speed lines suggested. COLOR: Silver chrome with white sparkle highlights on dark. MOOD: 80s racing, sports graphics, high-speed retro.",
  
  7: "TYPOGRAPHY STYLE: Aggressive metallic brush stroke italic. LETTERFORMS: Bold, hand-painted appearance with forward slant, visible brush texture in strokes. EFFECTS: Metallic silver sheen on brush strokes, dynamic energy, speed lines. COLOR: Silver metallic on dark background with motion blur suggestion. MOOD: 80s action movies, energetic sports, dynamic retro.",
  
  8: "TYPOGRAPHY STYLE: 3D chrome heavy metal lettering. LETTERFORMS: Bold, angular letterforms with sharp points, rock/metal band aesthetic, beveled edges. EFFECTS: Deep 3D chrome extrusion, sparkle highlights, dramatic lighting. COLOR: Silver chrome with gradient depth, star sparkles on dark. MOOD: 80s rock albums, heavy metal, powerful retro.",
  
  9: "TYPOGRAPHY STYLE: Massive 3D chrome block letters. LETTERFORMS: Ultra-bold uppercase sans-serif with enormous 3D depth, cinematic scale. EFFECTS: Very deep extrusion, chrome reflections, sparkle effects, dramatic scale. COLOR: Polished chrome with deep shadows, lens flare highlights. MOOD: 80s blockbuster movies, epic scale, monumental retro.",
  
  10: "TYPOGRAPHY STYLE: Dynamic chrome brush script. LETTERFORMS: Energetic cursive painted with bold strokes, metallic finish, forward motion. EFFECTS: Chrome metallic sheen, speed lines, dynamic brush marks. COLOR: Silver chrome with motion effects on dark background. MOOD: 80s action sports, dynamic retro, energetic chrome."
};

// Helper to generate variants with detailed descriptions
const createVariantsWithDescriptions = (
  styleId: string, 
  styleName: string, 
  descriptions: Record<number, string>,
  count: number = 10
): TextStyleVariant[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `${styleId}-${index + 1}`,
    name: `V${index + 1}`,
    description: `${styleName} style variation ${index + 1}`,
    previewImage: `/text-styles/${styleId}/${styleId}-${index + 1}.png`,
    promptInstructions: descriptions[index + 1] || `Apply the ${styleName} text style as shown in the reference image. Match the exact letterforms, effects, colors, and styling.`
  }));
};

// Master configuration of all text style variants - Only 5 styles available
export const TEXT_STYLE_VARIANTS: Record<string, TextStyleVariant[]> = {
  "creative": createVariantsWithDescriptions("creative", "Creative", CREATIVE_VARIANT_DESCRIPTIONS),
  "dark": createVariantsWithDescriptions("dark", "Dark", DARK_VARIANT_DESCRIPTIONS),
  "futuristic": createVariantsWithDescriptions("futuristic", "Futuristic", FUTURISTIC_VARIANT_DESCRIPTIONS),
  "modern": createVariantsWithDescriptions("modern", "Modern", MODERN_VARIANT_DESCRIPTIONS),
  "retro": createVariantsWithDescriptions("retro", "Retro", RETRO_VARIANT_DESCRIPTIONS)
};

// Get variants for a specific text style
export function getTextStyleVariants(styleId: string): TextStyleVariant[] {
  return TEXT_STYLE_VARIANTS[styleId] || [];
}

// Check if a style has variants
export function hasVariants(styleId: string): boolean {
  return (TEXT_STYLE_VARIANTS[styleId]?.length || 0) > 0;
}

// Get all available style IDs
export function getAvailableStyleIds(): string[] {
  return Object.keys(TEXT_STYLE_VARIANTS);
}
