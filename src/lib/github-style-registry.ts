// GitHub Style Registry Integration
// Fetches text style configurations from external GitHub repository

export const STYLE_REGISTRY_BASE = 
  "https://raw.githubusercontent.com/LockedupNelly/coverartmaker-style-registry/main/";

// Interface matching the GitHub style-index.json structure
export interface StyleIndexEntry {
  style_id: string;
  display_name: string;
  path: string;
  thumbnail: string;
  generation_mode: "reference_led" | "prompt_led";
}

export interface StyleIndex {
  [category: string]: StyleIndexEntry[];
}

// Interface matching individual style.json files
export interface GitHubStyleConfig {
  style_id: string;
  display_name: string;
  category: string;
  description: string;
  thumbnail: string;
  generation_mode: "reference_led" | "prompt_led";
  letterform_reference_required: boolean;
  design_intent: string;
  avoid_styles: string[];
  stroke_type: string;
  glow_profile: {
    intensity: string;
    spread: string;
    edge_softness: string;
  };
  color_rules: {
    mode: string;
    primary_colors?: string[];
    allow_user_override: boolean;
  };
  text_behavior: {
    distortion: string;
    flicker: boolean;
  };
  layout_rules: {
    preferred_alignment: string;
    thumbnail_safe: boolean;
  };
  reference_images: Array<{
    file: string;
    role: string;
    lock_strength: string;
    affects: string[];
  }>;
}

// Cache for fetched data
const styleIndexCache: StyleIndex | null = null;
const styleConfigCache: Record<string, GitHubStyleConfig | null> = {};
let promptTemplateCache: string | null = null;

/**
 * Fetch the master style index from GitHub
 */
export async function fetchStyleIndex(): Promise<StyleIndex | null> {
  if (styleIndexCache) {
    return styleIndexCache;
  }

  try {
    const response = await fetch(`${STYLE_REGISTRY_BASE}style-index.json`);
    
    if (!response.ok) {
      console.warn("Failed to fetch style index from GitHub", response.status);
      return null;
    }

    const index: StyleIndex = await response.json();
    return index;
  } catch (error) {
    console.error("Error fetching style index:", error);
    return null;
  }
}

/**
 * Fetch a specific style configuration from GitHub
 * @param stylePath - The path from style-index.json (e.g., "text-styles/neon/rainbow-neon")
 */
export async function fetchStyleConfig(stylePath: string): Promise<GitHubStyleConfig | null> {
  if (styleConfigCache[stylePath] !== undefined) {
    return styleConfigCache[stylePath];
  }

  try {
    const response = await fetch(`${STYLE_REGISTRY_BASE}${stylePath}/style.json`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch style config: ${stylePath}`, response.status);
      styleConfigCache[stylePath] = null;
      return null;
    }

    const config: GitHubStyleConfig = await response.json();
    styleConfigCache[stylePath] = config;
    return config;
  } catch (error) {
    console.error(`Error fetching style config: ${stylePath}`, error);
    styleConfigCache[stylePath] = null;
    return null;
  }
}

/**
 * Fetch the prompt template from GitHub
 */
export async function fetchPromptTemplate(): Promise<string | null> {
  if (promptTemplateCache) {
    return promptTemplateCache;
  }

  try {
    const response = await fetch(`${STYLE_REGISTRY_BASE}prompt-templates/text-style.template.txt`);
    
    if (!response.ok) {
      console.warn("Failed to fetch prompt template", response.status);
      return null;
    }

    promptTemplateCache = await response.text();
    return promptTemplateCache;
  } catch (error) {
    console.error("Error fetching prompt template:", error);
    return null;
  }
}

/**
 * Get the full URL for a thumbnail or reference image
 */
export function getImageUrl(stylePath: string, filename: string): string {
  return `${STYLE_REGISTRY_BASE}${stylePath}/${filename}`;
}

/**
 * Get reference image URLs for a style
 */
export function getReferenceImageUrls(stylePath: string, config: GitHubStyleConfig): string[] {
  return config.reference_images.map(img => getImageUrl(stylePath, img.file));
}

/**
 * Build a complete prompt from the template and style config
 */
export function buildPromptFromConfig(
  template: string,
  config: GitHubStyleConfig,
  stylePath: string,
  textToRender: string
): string {
  const referenceImageUrls = getReferenceImageUrls(stylePath, config);
  
  let prompt = template
    .replace("{TEXT}", textToRender)
    .replace("{DISPLAY_NAME}", config.display_name)
    .replace("{DESCRIPTION}", config.description)
    .replace("{REFERENCE_IMAGES}", referenceImageUrls.length > 0 
      ? referenceImageUrls.join("\n") 
      : "No reference images provided - use prompt instructions only.");

  // Add style-specific instructions based on config
  const styleInstructions = buildStyleInstructions(config);
  prompt += "\n\nADDITIONAL STYLE RULES:\n" + styleInstructions;

  return prompt;
}

/**
 * Build additional instructions from style config
 */
function buildStyleInstructions(config: GitHubStyleConfig): string {
  const instructions: string[] = [];

  // Stroke type
  instructions.push(`Stroke Type: ${config.stroke_type.replace(/_/g, " ")}`);

  // Glow profile
  instructions.push(`Glow: ${config.glow_profile.intensity} intensity, ${config.glow_profile.spread} spread, ${config.glow_profile.edge_softness} edges`);

  // Color rules
  if (config.color_rules.primary_colors) {
    instructions.push(`Colors: ${config.color_rules.primary_colors.join(", ")} (${config.color_rules.mode.replace(/_/g, " ")})`);
  } else {
    instructions.push(`Color Mode: ${config.color_rules.mode.replace(/_/g, " ")}`);
  }

  // Text behavior
  if (config.text_behavior.distortion !== "none") {
    instructions.push(`Distortion: ${config.text_behavior.distortion.replace(/_/g, " ")}`);
  }

  // Avoid styles
  if (config.avoid_styles.length > 0) {
    instructions.push(`AVOID: ${config.avoid_styles.map(s => s.replace(/_/g, " ")).join(", ")}`);
  }

  // Generation mode
  if (config.generation_mode === "reference_led") {
    instructions.push("Mode: Reference-led generation - closely follow the reference image letterforms");
  } else {
    instructions.push("Mode: Prompt-led generation - use creative interpretation based on description");
  }

  return instructions.join("\n");
}

/**
 * Clear all caches (useful for refreshing)
 */
export function clearRegistryCache(): void {
  Object.keys(styleConfigCache).forEach(key => delete styleConfigCache[key]);
  promptTemplateCache = null;
}
