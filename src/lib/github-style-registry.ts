// GitHub Style Registry Integration
// Fetches text style configurations from external GitHub repository

export const STYLE_REGISTRY_BASE = 
  "https://raw.githubusercontent.com/LockedupNelly/coverartmaker-style-registry/main/";

// Interface matching the expected JSON structure from GitHub
export interface GitHubStyleVariant {
  id: string;
  name: string;
  description: string;
  reference_images: Array<{ file: string; description?: string }>;
  prompt_instructions: string;
}

export interface GitHubStyleConfig {
  id: string;
  name: string;
  description: string;
  variants: GitHubStyleVariant[];
}

// Cache for fetched styles to avoid repeated network requests
const styleCache: Record<string, GitHubStyleConfig | null> = {};

/**
 * Fetch style configuration from GitHub registry
 * @param stylePath - The path to the style (e.g., "neon-glow", "3d-chrome")
 */
export async function fetchStyleFromRegistry(stylePath: string): Promise<GitHubStyleConfig | null> {
  // Return cached version if available
  if (styleCache[stylePath] !== undefined) {
    return styleCache[stylePath];
  }

  try {
    const response = await fetch(`${STYLE_REGISTRY_BASE}${stylePath}/style.json`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch style from registry: ${stylePath}`, response.status);
      styleCache[stylePath] = null;
      return null;
    }

    const styleConfig: GitHubStyleConfig = await response.json();
    styleCache[stylePath] = styleConfig;
    return styleConfig;
  } catch (error) {
    console.error(`Error fetching style from registry: ${stylePath}`, error);
    styleCache[stylePath] = null;
    return null;
  }
}

/**
 * Resolve reference image URLs from the registry
 * @param stylePath - The style path
 * @param images - Array of reference images from the style config
 */
export function resolveReferenceImages(
  stylePath: string, 
  images: Array<{ file: string; description?: string }>
): string[] {
  return images.map(img => `${STYLE_REGISTRY_BASE}${stylePath}/${img.file}`);
}

/**
 * Get the full URL for a reference image
 */
export function getImageUrl(stylePath: string, filename: string): string {
  return `${STYLE_REGISTRY_BASE}${stylePath}/${filename}`;
}

/**
 * Clear the style cache (useful for refreshing)
 */
export function clearStyleCache(): void {
  Object.keys(styleCache).forEach(key => delete styleCache[key]);
}

/**
 * Check if a style exists in the GitHub registry
 */
export async function styleExistsInRegistry(stylePath: string): Promise<boolean> {
  const style = await fetchStyleFromRegistry(stylePath);
  return style !== null;
}
