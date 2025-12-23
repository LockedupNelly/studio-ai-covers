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

// Helper to generate placeholder variants
const createPlaceholderVariants = (styleId: string, styleName: string, count: number = 10): TextStyleVariant[] => {
  const variantNames: Record<string, string[]> = {
    "futuristic": ["Cyber Grid", "Hologram", "Tech Pulse", "Quantum", "Neon Matrix", "Digital Core", "Void Stream", "Laser Edge", "Circuit Flow", "Plasma Wave"],
    "dark": ["Shadow Realm", "Midnight", "Obsidian", "Eclipse", "Abyss", "Phantom", "Noir", "Twilight", "Void", "Omen"],
    "modern": ["Clean Cut", "Sharp", "Sleek", "Refined", "Polished", "Contemporary", "Streamlined", "Crisp", "Structured", "Bold"],
    "retro": ["70s Funk", "80s Synth", "Vintage Vibes", "Throwback", "Classic Wave", "Old School", "Disco Era", "Analog", "Cassette", "VHS"],
    "creative": ["Abstract", "Artistic", "Expressive", "Unique", "Imaginative", "Bold Vision", "Freeform", "Dynamic", "Avant-garde", "Fusion"]
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

// Master configuration of all text style variants - Only 5 styles available
export const TEXT_STYLE_VARIANTS: Record<string, TextStyleVariant[]> = {
  "creative": createPlaceholderVariants("creative", "Creative"),
  "dark": createPlaceholderVariants("dark", "Dark"),
  "futuristic": createPlaceholderVariants("futuristic", "Futuristic"),
  "modern": createPlaceholderVariants("modern", "Modern"),
  "retro": createPlaceholderVariants("retro", "Retro")
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
