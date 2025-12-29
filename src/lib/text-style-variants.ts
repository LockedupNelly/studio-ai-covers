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
const CREATIVE_VARIANT_DESCRIPTIONS: Record<number, string> = {
  1: "Elegant white brush script with soft glow/bloom effect. Flowing cursive letterforms with organic brush strokes. The text has a dreamy, ethereal quality with subtle light diffusion around the edges.",
  2: "Bold, distressed uppercase sans-serif. Heavy black letters with rough, worn edges and splatter/spray paint texture. Grungy, aggressive street art aesthetic. White/light text with heavy distress marks.",
  3: "BOLD CHUNKY DISTORTED DISPLAY FONT. Heavy, thick letterforms with high contrast. Some letters larger than others creating dynamic rhythm. Black and white with strong visual impact. Warped, playful, bold sans-serif.",
  4: "CHUNKY, BOLD, DISTRESSED BLOCK LETTERS. Heavy uppercase sans-serif with rough, hand-painted edges. The letters have an uneven, slightly wobbly baseline giving a raw, energetic feel. White text with grunge texture.",
  5: "Neon glow effect with vibrant electric colors. Glowing tube-light aesthetic with bright core and soft outer glow. Futuristic club/arcade feeling.",
  6: "Hand-drawn sketch style with pencil/charcoal texture. Imperfect, organic letterforms that look authentically hand-crafted. Artistic, personal touch.",
  7: "3D extruded letters with dramatic depth and shadow. Bold, dimensional typography with perspective. Impactful, attention-grabbing style.",
  8: "Watercolor blend effect with soft color transitions. Artistic, painted aesthetic with organic color bleeds. Dreamy, artistic expression.",
  9: "Stencil/spray paint street art style. Military-inspired stencil cuts with spray paint overspray. Urban, rebellious aesthetic.",
  10: "Liquid chrome/metallic effect with reflections. Shiny, mirror-like surface with environmental reflections. Premium, futuristic luxury feel."
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
