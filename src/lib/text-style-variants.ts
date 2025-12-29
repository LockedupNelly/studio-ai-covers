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
  1: "TYPOGRAPHY STYLE: Elegant flowing white brush script calligraphy with soft ethereal glow effect. LETTERFORMS: Organic, hand-painted cursive with natural brush stroke variations, thick-to-thin transitions. EFFECTS: Soft white light bloom/halo around text edges, dreamy luminescence, subtle light diffusion. COLOR: Pure white text with soft gray shadows on dark background. MOOD: Romantic, ethereal, premium wedding invitation aesthetic.",
  
  2: "TYPOGRAPHY STYLE: Heavy distressed uppercase industrial sans-serif with aggressive grunge texture. LETTERFORMS: Bold, blocky condensed letters with rough eroded edges, paint splatter, and worn-away sections. EFFECTS: Spray paint overspray, ink splatter marks, scratched and weathered surface texture. COLOR: Off-white/gray text with heavy black distress marks on dark background. MOOD: Street art, punk rock poster, urban decay aesthetic.",
  
  3: "TYPOGRAPHY STYLE: Ultra-bold chunky distorted display font with playful warping. LETTERFORMS: Extremely thick, heavy sans-serif with inconsistent letter sizes - some letters much larger than others creating dynamic visual rhythm. EFFECTS: Slight perspective warping, letters appear to bulge or bend. COLOR: High contrast black and white. MOOD: Bold, impactful, modern poster design, attention-grabbing.",
  
  4: "TYPOGRAPHY STYLE: Chunky hand-painted block letters with raw energetic character. LETTERFORMS: Heavy uppercase sans-serif with uneven, wobbly baseline, imperfect hand-drawn edges that look painted with a wide brush. EFFECTS: Rough paint texture, slight drips, organic imperfections. COLOR: White/cream text with grunge texture on dark background. MOOD: DIY punk aesthetic, concert poster, raw artistic energy.",
  
  5: "TYPOGRAPHY STYLE: Vibrant neon tube light signage with electric glow. LETTERFORMS: Rounded, continuous stroke letterforms that look like bent neon tubes, connected letters where possible. EFFECTS: Bright glowing core with multi-layered outer glow, color bleeding, light reflection on surface below. COLOR: Hot pink, electric blue, or vivid purple neon with matching glow halos. MOOD: 80s arcade, nightclub signage, synthwave aesthetic.",
  
  6: "TYPOGRAPHY STYLE: GLITCHED METALLIC CHROME TEXT with severe digital corruption and fragmentation. LETTERFORMS: Bold, italic condensed sans-serif with chrome/silver metallic finish, letters breaking apart horizontally. EFFECTS: CRITICAL - Heavy horizontal glitch lines slicing through text, pixel displacement, digital scan line artifacts, data corruption blocks, RGB color separation on edges, scattered pixel debris around letters. COLOR: Silver/chrome metallic gradient with white highlights, black glitch blocks, grayscale corruption artifacts. MOOD: Cyberpunk, corrupted data, VHS tracking error, digital dystopia aesthetic. The text should look like it's being destroyed by a computer virus or signal interference.",
  
  7: "TYPOGRAPHY STYLE: 3D extruded block letters with dramatic dimensional depth. LETTERFORMS: Bold, geometric sans-serif with strong extrusion showing side and bottom faces, sharp perspective angles. EFFECTS: Long shadow casting, isometric or perspective 3D extrusion, highlighted top face. COLOR: Bright colors with darker extrusion sides, strong shadows. MOOD: Pop art, retro gaming, eye-catching signage.",
  
  8: "TYPOGRAPHY STYLE: Watercolor painted text with organic color bleeding. LETTERFORMS: Soft-edged letters that look hand-painted with watercolors, varying opacity within strokes. EFFECTS: Color bleeds and runs, wet-on-wet watercolor effects, pigment pooling at edges, transparent layering. COLOR: Soft pastel gradients - pinks, blues, purples bleeding into each other. MOOD: Artistic, dreamy, feminine, artistic expression.",
  
  9: "TYPOGRAPHY STYLE: Military stencil cut letters with spray paint application. LETTERFORMS: Bold uppercase with characteristic stencil bridges/gaps in letters (A, B, D, O, P, Q, R), angular geometric forms. EFFECTS: Spray paint overspray texture, paint bleeding under stencil edges, multiple spray layers. COLOR: Matte black or olive drab on contrasting background, or white spray on dark. MOOD: Military, industrial, urban street art, utilitarian.",
  
  10: "TYPOGRAPHY STYLE: Liquid chrome mercury metallic text with mirror reflections. LETTERFORMS: Smooth, rounded sans-serif that looks like molten liquid metal pooled into letter shapes, organic flowing edges. EFFECTS: Perfect mirror reflections of environment, chrome specular highlights, liquid surface tension appearance. COLOR: Silver chrome with reflected colors from surroundings, bright white highlights. MOOD: Premium luxury, futuristic technology, high-end product design."
};

const DARK_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Gothic blackletter with dramatic shadows. Medieval-inspired letterforms with deep darkness. Mysterious, ancient aesthetic.",
  2: "Cracked stone/marble texture. Letters appear carved from dark stone with fractures. Ancient, powerful feeling.",
  3: "Blood red on black with drip effects. Horror-inspired with liquid dripping from letters. Intense, visceral impact.",
  4: "Smoke/mist dissolving effect. Letters fade into wisps of dark smoke. Ethereal, haunting atmosphere.",
  5: "Lightning/electrical crackling effect. Bright electrical arcs around dark letters. Powerful, energetic darkness.",
  6: "Torn paper/collage dark aesthetic. Ripped edges with layered dark textures. Chaotic, artistic destruction.",
  7: "Glitch/corrupted digital effect. Pixelated distortion with scan lines. Broken, unsettling digital horror.",
  8: "Fire and embers on charred text. Burning edges with floating sparks. Destructive, intense heat.",
  9: "Ice/frost crystalline dark style. Frozen, sharp crystal formations. Cold, unforgiving atmosphere.",
  10: "Shadow silhouette with subtle depth. Minimal but dramatic shadow play. Elegant, mysterious darkness."
};

const FUTURISTIC_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Holographic display with scan lines. Semi-transparent with digital artifacts. Sci-fi interface aesthetic.",
  2: "Neon circuit board patterns. Glowing tech lines integrated with letters. Cyberpunk technology feel.",
  3: "Chrome/titanium metallic finish. Sleek, polished futuristic metal. Premium tech aesthetic.",
  4: "Glitching/pixelated distortion. Digital corruption with color separation. Cyber-glitch style.",
  5: "Laser-cut precision lines. Sharp, geometric with light beam effects. High-tech precision.",
  6: "Plasma/energy glow effect. Pulsing energy contained in letter shapes. Powerful sci-fi energy.",
  7: "Wireframe/blueprint technical style. Engineering diagram aesthetic. Technical, precise design.",
  8: "Gradient chrome with rainbow reflections. Iridescent metallic surface. Premium futuristic luxury.",
  9: "Digital matrix/code rain effect. Falling code integrated with text. Hacker/cyber aesthetic.",
  10: "Floating hologram with depth layers. 3D holographic projection look. Advanced technology display."
};

const MODERN_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Clean geometric sans-serif. Minimal, precise letterforms. Contemporary, professional aesthetic.",
  2: "Bold condensed with tight tracking. Impactful, space-efficient typography. Strong, modern statement.",
  3: "Thin elegant with wide spacing. Refined, luxurious minimalism. High-fashion editorial style.",
  4: "Gradient overlay with smooth transitions. Modern color blending. Fresh, contemporary feel.",
  5: "Outlined/stroke only letters. Minimal, sophisticated outline style. Clean, architectural approach.",
  6: "Split/layered color effect. Overlapping color planes. Dynamic, energetic modern design.",
  7: "Dot matrix/halftone pattern. Retro-modern print technique. Graphic, textured approach.",
  8: "Soft shadow with depth. Subtle 3D effect with smooth shadows. Approachable, friendly modern.",
  9: "Geometric shapes integrated. Letters formed from basic shapes. Constructivist, artistic modern.",
  10: "Gradient mesh with organic flow. Smooth, flowing color transitions. Fluid, contemporary style."
};

const RETRO_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "3D CHROME SCRIPT with metallic silver finish. Flowing cursive lettering with beveled edges and dramatic depth extrusion. Shiny reflective surface with shadows. 70s/80s chrome typography style.",
  2: "ELEGANT NEON SIGNATURE SCRIPT with soft white glow. Thin, flowing handwritten cursive with glowing tube-light effect. The text appears to float with subtle light bloom around the strokes.",
  3: "BOLD GROOVY SERIF with chunky rounded letterforms. Heavy, playful Cooper Black style typography with thick strokes. Vintage 70s feel with friendly, bubbly character.",
  4: "8-BIT PIXEL SERIF FONT. Retro video game typography with blocky, pixelated letterforms. Classic arcade/computer game aesthetic with jagged edges and nostalgic digital character.",
  5: "GROOVY 70s BUBBLE SCRIPT with rounded, flowing letterforms. Funky retro typography with smooth curves and playful character. Disco-era aesthetic with soft, bouncy strokes.",
  6: "CHROME ITALIC RACING FONT with metallic finish and star sparkles. Bold, slanted sports-style lettering with 3D chrome effect. Dynamic speed aesthetic with lens flare highlights.",
  7: "AGGRESSIVE BRUSH STROKE ITALIC with metallic silver texture. Bold, hand-painted appearance with dynamic forward slant. Speed lines and raw, energetic brush marks. Racing/action movie aesthetic.",
  8: "3D CHROME HEAVY METAL LETTERING with beveled edges and star sparkles. Bold, angular rock/metal band style typography. Sharp points and dramatic dimensional depth. 80s rock album aesthetic.",
  9: "MASSIVE 3D CHROME BLOCK LETTERS with deep extrusion and sparkle effects. Ultra-bold uppercase sans-serif with dramatic depth. Stacked layout with cinematic impact. 80s movie poster typography.",
  10: "CHROME BRUSH SCRIPT with metallic silver finish. Dynamic, hand-painted cursive with speed lines. Bold, energetic strokes with dimensional sheen. 80s action/sports aesthetic."
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
