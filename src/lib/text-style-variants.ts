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

// Helper to generate variants with V1-V10 naming
const createVariants = (styleId: string, styleName: string, count: number = 10): TextStyleVariant[] => {
  return Array.from({ length: count }, (_, index) => ({
    id: `${styleId}-${index + 1}`,
    name: `V${index + 1}`,
    description: `${styleName} style variation ${index + 1}`,
    previewImage: `/text-styles/${styleId}/${styleId}-${index + 1}.png`,
    promptInstructions: `Apply the ${styleName} text style as shown in the reference image. Match the exact letterforms, effects, colors, and styling.`
  }));
};

// Master configuration of all text style variants - Only 5 styles available
export const TEXT_STYLE_VARIANTS: Record<string, TextStyleVariant[]> = {
  "creative": createVariants("creative", "Creative"),
  "dark": createVariants("dark", "Dark"),
  "futuristic": createVariants("futuristic", "Futuristic"),
  "modern": createVariants("modern", "Modern"),
  "retro": createVariants("retro", "Retro")
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
