// Shared configuration for Design Studio and Edit Studio

// Genre options
export const genres = [
  "Hip-Hop / Rap",
  "Pop",
  "EDM",
  "R&B",
  "Rock",
  "Alternative",
  "Indie",
  "Metal",
  "Country",
  "Jazz",
  "Classical"
];

// Visual styles with descriptions (for GeneratorStudio)
export const visualStylesWithDescriptions = [
  { id: "None", name: "None", description: "AI chooses the best style for your prompt" },
  { id: "Realism", name: "Realism", description: "Photorealistic imagery with lifelike detail" },
  { id: "3D Render", name: "3D Render", description: "Computer-generated 3D graphics and models" },
  { id: "Illustration", name: "Illustration", description: "Hand-drawn artistic style with creative flair" },
  { id: "Anime", name: "Anime", description: "Japanese animation style with bold lines and colors" },
  { id: "Fine Art", name: "Fine Art", description: "Classical painting techniques and aesthetics" },
  { id: "Abstract", name: "Abstract", description: "Non-representational shapes, colors and forms" },
  { id: "Minimalist", name: "Minimalist", description: "Clean, simple design with negative space" },
  { id: "Cinematic", name: "Cinematic", description: "Movie-like dramatic lighting and composition" },
  { id: "Retro", name: "Retro", description: "Vintage aesthetics from past decades" },
  { id: "Other", name: "Other", description: "Describe your own custom visual style" },
];

// Simple visual styles array (for EditStudio dropdowns)
export const visualStyles = [
  "None",
  "Realism",
  "3D Render",
  "Illustration",
  "Anime",
  "Fine Art",
  "Abstract",
  "Minimalist",
  "Cinematic",
  "Retro",
];

// Mood options
export const moodOptions = [
  "None",
  "Aggressive",
  "Dark",
  "Mysterious",
  "Euphoric",
  "Uplifting",
  "Melancholic",
  "Romantic",
  "Peaceful",
  "Intense",
  "Nostalgic"
];

// Text style categories
export const textStyleCategories = [
  { id: "creative", name: "Creative" },
  { id: "dark", name: "Dark" },
  { id: "futuristic", name: "Futuristic" },
  { id: "modern", name: "Modern" },
  { id: "retro", name: "Retro" },
];

// Simple category IDs for horizontal scroll (GeneratorStudio)
export const textStyleCategoryIds = ["creative", "dark", "futuristic"];

// Blend mode type
export type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter";

// Map canvas blend modes to CSS mix-blend-mode equivalents for preview
export const getCssMixBlendMode = (blendMode?: BlendMode): React.CSSProperties['mixBlendMode'] => {
  if (blendMode === "lighter") return "screen"; // "lighter" is canvas-only, "screen" is closest CSS equivalent
  return blendMode;
};

// Texture options
export interface TextureOption {
  id: string;
  name: string;
  image: string | null;
  blendMode?: BlendMode;
  opacity?: number;
  gradient?: string; // Fallback for preview only
}

export const textureOptions: TextureOption[] = [
  { id: "none", name: "None", image: null },
  { id: "rock-grunge", name: "Rock Grunge", image: "/textures/rock-grunge.jpg", blendMode: "overlay", opacity: 0.125 },
  { id: "light-grunge", name: "Light Grunge", image: "/textures/light-grunge.jpg", blendMode: "lighter", opacity: 0.3 },
  { id: "white-grunge", name: "White Grunge", image: "/textures/white-grunge.jpg", blendMode: "overlay", opacity: 0.5 },
  { id: "paper-grit", name: "Paper Grit", image: "/textures/paper-grit.jpg", blendMode: "lighter", opacity: 0.4 },
  { id: "smoke", name: "Smoke", image: "/textures/smoke.jpg", blendMode: "screen", opacity: 0.5 },
  { id: "vhs", name: "VHS", image: "/textures/vhs.jpg", blendMode: "lighter", opacity: 0.4 },
];

// Lighting options
export interface LightingOption {
  id: string;
  name: string;
  image: string | null;
  blendMode?: BlendMode;
  opacity?: number;
  gradient?: string;
}

export const lightingOptions: LightingOption[] = [
  { id: "none", name: "None", image: null },
  { id: "speed-lines", name: "Speed Lines", image: "/lighting/speed-lines.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "heavenly-light", name: "Heavenly Light", image: "/lighting/heavenly-light.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "blue-light", name: "Blue Light", image: "/lighting/blue-heaven.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "prism-leak", name: "Prism Leak", image: "/lighting/prism-leak.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "side-flash", name: "SideFlash", image: "/lighting/side-flash.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "fractal-red", name: "Fractal Red", image: "/lighting/fractal-red.jpg", blendMode: "screen", opacity: 1.0 },
];

// Parental Advisory options
export interface ParentalAdvisoryOption {
  id: string;
  name: string;
  image: string;
}

export const parentalAdvisoryOptions: ParentalAdvisoryOption[] = [
  { id: "none", name: "None", image: "" },
  { id: "standard", name: "Standard", image: "/parental-advisory/standard.png" },
  { id: "modern", name: "Modern", image: "/parental-advisory/modern.png" },
  { id: "minimal", name: "Minimal", image: "/parental-advisory/minimal.png" },
  { id: "3d", name: "3D", image: "/parental-advisory/3d.png" },
  { id: "grunge", name: "Grunge", image: "/parental-advisory/grunge.png" },
  { id: "drippy", name: "Drippy", image: "/parental-advisory/drippy.png" },
  { id: "futuristic", name: "Futuristic", image: "/parental-advisory/futuristic.png" },
  { id: "sticker", name: "Sticker", image: "/parental-advisory/sticker.png" },
  { id: "chaos", name: "Chaos", image: "/parental-advisory/chaos.png" },
  { id: "smooth", name: "Smooth", image: "/parental-advisory/smooth.png" },
  { id: "focus", name: "Focus", image: "/parental-advisory/focus.png" },
];

// Progress stages for generation
export const progressStages = [
  { label: "Preparing your cover...", progress: 5 },
  { label: "Generating artwork...", progress: 20 },
  { label: "Creating your vision...", progress: 40 },
  { label: "Rendering details...", progress: 60 },
  { label: "Adding finishing touches...", progress: 80 },
  { label: "Almost ready...", progress: 95 },
];
