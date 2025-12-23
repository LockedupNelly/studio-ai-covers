// Text Style Variants Configuration
// Each style has 10 placeholder variants ready for custom reference images

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

// Helper to generate placeholder variants
const createPlaceholderVariants = (styleId: string, styleName: string, count: number = 10): TextStyleVariant[] => {
  const variantNames: Record<string, string[]> = {
    "futuristic": ["Cyber Grid", "Hologram", "Tech Pulse", "Quantum", "Neon Matrix", "Digital Core", "Void Stream", "Laser Edge", "Circuit Flow", "Plasma Wave"],
    "dark": ["Shadow Realm", "Midnight", "Obsidian", "Eclipse", "Abyss", "Phantom", "Noir", "Twilight", "Void", "Omen"],
    "luxury": ["Golden Era", "Platinum", "Diamond", "Royal", "Opulent", "Prestige", "Elite", "Regal", "Imperial", "Majestic"],
    "modern": ["Clean Cut", "Sharp", "Sleek", "Refined", "Polished", "Contemporary", "Streamlined", "Crisp", "Structured", "Bold"],
    "neon": ["Electric Pink", "Cyber Blue", "Laser Green", "Hot Orange", "Purple Haze", "Rainbow Glow", "Sunset Burst", "Arctic Ice", "Fire Wire", "Prism"],
    "retro": ["70s Funk", "80s Synth", "Vintage Vibes", "Throwback", "Classic Wave", "Old School", "Disco Era", "Analog", "Cassette", "VHS"],
    "minimal": ["Pure", "Essential", "Zen", "Simple", "Clean", "Subtle", "Refined", "Bare", "Elegant", "Quiet"],
    "creative": ["Abstract", "Artistic", "Expressive", "Unique", "Imaginative", "Bold Vision", "Freeform", "Dynamic", "Avant-garde", "Fusion"],
    "playful": ["Bubbly", "Fun Pop", "Cheerful", "Bouncy", "Whimsical", "Joyful", "Cartoon", "Candy", "Party", "Vibrant"]
  };

  const names = variantNames[styleId] || Array.from({ length: count }, (_, i) => `Variant ${i + 1}`);

  return names.map((name, index) => ({
    id: `${styleId}-${index + 1}`,
    name,
    description: `${styleName} style variation ${index + 1}`,
    previewImage: `/text-styles/${styleId}/${styleId}-${index + 1}.png`,
    promptInstructions: `Apply the ${styleName} text style as shown in the reference image. Match the exact letterforms, effects, colors, and styling.`
  }));
};

// Master configuration of all text style variants
export const TEXT_STYLE_VARIANTS: Record<string, TextStyleVariant[]> = {
  "futuristic": createPlaceholderVariants("futuristic", "Futuristic"),
  "dark": createPlaceholderVariants("dark", "Dark"),
  "luxury": createPlaceholderVariants("luxury", "Luxury"),
  "modern": createPlaceholderVariants("modern", "Modern"),
  "neon": createPlaceholderVariants("neon", "Neon"),
  "retro": createPlaceholderVariants("retro", "Retro"),
  "minimal": createPlaceholderVariants("minimal", "Minimal"),
  "creative": createPlaceholderVariants("creative", "Creative"),
  "playful": createPlaceholderVariants("playful", "Playful")
};

// Get variants for a specific text style
export function getTextStyleVariants(styleId: string): TextStyleVariant[] {
  return TEXT_STYLE_VARIANTS[styleId] || [];
}

// Check if a style has variants
export function hasVariants(styleId: string): boolean {
  return (TEXT_STYLE_VARIANTS[styleId]?.length || 0) > 0;
}
