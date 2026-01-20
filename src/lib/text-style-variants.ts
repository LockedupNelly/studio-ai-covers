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
  1: "Ethereal Script: Elegant flowing brush calligraphy with a soft glow and motion-blurred edges. First and last letters fade into horizontal zoom-blur; center letters remain sharp.",
  
  2: "Industrial Grunge: Heavy distressed uppercase sans-serif with aggressive grunge texture. Features eroded edges, spray paint overspray, and weathered ink splatters.",
  
  3: "Liquid Glitch: Ultra-bold display typography with horizontal liquify distortion. Fluid, destructive bands smear the letterforms for an experimental glitch aesthetic.",
  
  4: "Wavy Tall: Ultra-tall condensed extra-bold sans-serif. Thick, heavy letters with a pronounced wavy vertical slant and extremely tight spacing.",
  
  5: "Cracked Concrete: Distressed bold geometric sans-serif with one significant jagged crack running diagonally through the text. Texture mimics peeling paint and eroded stone.",
  
  6: "Digital Fragment: Glitched metallic text with severe digital fragmentation. Features horizontal scan lines, pixel displacement, and VHS tracking error artifacts.",
  
  7: "Violent Melt: Blurry glowing text where the bottom third of each letter is aggressively melting and warping, violently dissolving into the background.",
  
  8: "Misty Serif: Bold heavy serif where the top third of each letter is completely blurred, fading into a wispy, atmospheric mist. Bottom remains solid.",
  
  9: "Smoke Form: Letters constructed entirely from swirling wisps of smoke and fog. Ethereal tendrils extend outward, creating a ghostly, disintegrating effect.",
  
  10: "Liquid Mirror: Bold heavy liquid-metal typography with high surface tension. Features mirror-like reflections and specular highlights for a premium, industrial feel."
};

const DARK_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Gothic Blackletter: Sharp medieval construction with high-contrast strokes. Reflective polished surface that adopts the environment's lighting.",
  
  2: "Spiky Metal: Bold death metal typography with sharp angular extensions. Thick, heavy uppercase letters with moderate-length spikes shooting outward.",
  
  3: "Haunted Vine: Tall flowing gothic typography with smooth organic curvature. Vertical strokes bow gracefully like twisting vines or tendrils.",
  
  4: "Angular Bevel: Bold heavy metal typography with sharp geometric letterforms. Features chunky uppercase characters with 3D beveled edges and pointed vertices.",
  
  5: "Blade Letter: Aggressive blackletter with exaggerated sharp spikes. Letterforms feature blade-like extensions and aggressive, weaponized terminals with a subtle sheen.",
  
  6: "Slashing Brush: Ultra-bold aggressive brush-stroke typography. Extremely thick letters with sharp jagged edges and a dry-brush torn paint texture.",
  
  7: "Brutal Spike: Extreme death metal typography with abundant sharp protrusions. Ultra-thick, chunky uppercase with many thorny extensions radiating in all directions.",
  
  8: "Technical Ornate: Tall ornate bold uppercase with elaborate curving spike extensions. Combines a gothic blackletter base with a polished metallic finish.",
  
  9: "Interlocked 3D: Bold 3D beveled heavy metal typography. Letters interlock and nest together in a unified logo lockup with extremely tight spacing.",
  
  10: "Speed Metal: Aggressive slanted metallic typography. Bold chunky uppercase with a strong 15-degree italic angle and sharp angular cuts."
};

const FUTURISTIC_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Action Chrome: Bold angular slanted 3D typography with sharp beveled edges. 80s action movie aesthetic with star-sparkle highlights and racing energy.",
  
  2: "Tech Scanline: Sleek modern typography with horizontal speedline textures. Modern geometric sans-serif with a gentle gradient and clean sci-fi finish.",
  
  3: "Sci-Fi Cut: Bold thick 3D extruded typography with stylized diagonal notches carved into the letters. Tight spacing and deep backward extrusion.",
  
  4: "Sweeping Serif: Extravagant futuristic serif with dramatic elongated, sweeping serifs. Letters are spaced very close together for a premium game-title look.",
  
  5: "Luxury Didone: High-fashion italic serif with maximum thick-to-thin contrast. Features flat hairline serifs and ball terminals for a luxury editorial aesthetic.",
  
  6: "Blocky Headline: Chunky high-contrast serif with exaggerated pointed triangular serifs. Letters are short, wide, and powerful.",
  
  7: "Sleek Notch: Short wide geometric sans-serif with sharp diagonal slices cut into the letterforms. Every corner is sharp, angular, and futuristic.",
  
  8: "Puzzle Interlock: Ultra high-contrast serif where letters connect and nest into each other like puzzle pieces. Refined, mixed-case luxury editorial style.",
  
  9: "Racing Spike: Bold italic slanted sans-serif with sharp pointed terminals extending from the stroke ends. Aggressive speed and racing aesthetic.",
  
  10: "Geometric Power: Bold chunky angular sans-serif with pointed extensions. All letterforms are strictly geometric with a subtle italic slant."
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
  // Use webp for creative (already converted), png for others (pending conversion)
  const extension = styleId === 'creative' ? 'webp' : 'png';
  return Array.from({ length: count }, (_, index) => ({
    id: `${styleId}-${index + 1}`,
    name: `V${index + 1}`,
    description: `${styleName} style variation ${index + 1}`,
    previewImage: `/text-styles/${styleId}/${styleId}-${index + 1}.${extension}`,
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
