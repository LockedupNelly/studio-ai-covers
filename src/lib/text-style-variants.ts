// Text Style Variants Configuration
// Each text style can have multiple variants with detailed prompt instructions
// This structure allows for GitHub-managed JSON configs to be imported

import { 
  STYLE_REGISTRY_BASE, 
  fetchStyleIndex,
  fetchStyleConfig,
  fetchPromptTemplate,
  getImageUrl,
  buildPromptFromConfig,
  type StyleIndexEntry,
  type GitHubStyleConfig 
} from './github-style-registry';

export interface TextStyleVariant {
  id: string;
  name: string;
  description: string;
  previewImage: string; // URL to preview image
  promptInstructions: string; // Detailed AI prompt for this exact style
  referenceImages?: string[]; // Additional reference images for AI
  stylePath?: string; // Path in GitHub registry
  githubConfig?: GitHubStyleConfig; // Full config from GitHub
}

export interface TextStyleWithVariants {
  id: string;
  name: string;
  description: string;
  example: string;
  prompt: string; // Base prompt
  variants: TextStyleVariant[];
}

// Re-export for use elsewhere
export { STYLE_REGISTRY_BASE, fetchPromptTemplate, buildPromptFromConfig };

// Map local style IDs to GitHub category names
const STYLE_ID_TO_CATEGORY: Record<string, string> = {
  "neon-glow": "neon",
  "3d-chrome": "chrome",
  "gothic-script": "gothic",
  "grunge-distressed": "grunge",
  "fire-flames": "fire",
  "glitch-digital": "glitch"
};

/**
 * Fetch variants from GitHub registry and convert to local format
 * Falls back to local config if GitHub fetch fails
 */
export async function fetchVariantsFromGitHub(styleId: string): Promise<TextStyleVariant[] | null> {
  try {
    const styleIndex = await fetchStyleIndex();
    
    if (!styleIndex) {
      console.warn("Could not fetch style index from GitHub");
      return null;
    }

    // Map local styleId to GitHub category
    const category = STYLE_ID_TO_CATEGORY[styleId];
    if (!category || !styleIndex[category]) {
      console.warn(`No GitHub category found for ${styleId}`);
      return null;
    }

    const entries: StyleIndexEntry[] = styleIndex[category];
    
    // Fetch each variant's full config
    const variants: TextStyleVariant[] = await Promise.all(
      entries.map(async (entry) => {
        const config = await fetchStyleConfig(entry.path);
        
        return {
          id: entry.style_id,
          name: entry.display_name,
          description: config?.description || "",
          previewImage: getImageUrl(entry.path, entry.thumbnail),
          promptInstructions: config ? JSON.stringify(config) : "", // Store full config as JSON
          referenceImages: config?.reference_images.map(img => getImageUrl(entry.path, img.file)) || [],
          stylePath: entry.path,
          githubConfig: config || undefined
        };
      })
    );

    console.log(`Loaded ${variants.length} variants from GitHub for ${styleId}`);
    return variants;
  } catch (error) {
    console.error("Error fetching variants from GitHub:", error);
    return null;
  }
}

// This is the master configuration - you can expand this or load from external JSON
export const TEXT_STYLE_VARIANTS: Record<string, TextStyleVariant[]> = {
  "neon-glow": [
    {
      id: "neon-glow-rainbow",
      name: "Rainbow Neon",
      description: "Multi-color neon gradient with intense glow",
      previewImage: "/text-styles/neon-rainbow.jpg",
      promptInstructions: `Create text with a vibrant rainbow neon effect. The text should have:
- Multiple neon colors blending smoothly: hot pink, electric cyan, lime green, and warm yellow
- Intense outer glow with soft bloom effect radiating 20-30 pixels outward
- Slight 3D depth with the neon tubes appearing raised
- Brushstroke/hand-painted style letterforms with slight texture
- Dark background with subtle color reflections from the neon
- Each letter should have chromatic variation as if different neon tubes
- Add subtle light rays and lens flare effects
- Typography style: bold, slightly italicized, dynamic brush script`
    },
    {
      id: "neon-glow-pink-electric",
      name: "Pink Electric",
      description: "Hot pink and cyan neon with aggressive brush strokes",
      previewImage: "/text-styles/neon-pink-electric.png",
      promptInstructions: `Create text EXACTLY matching the reference image style. Critical visual elements:
- AGGRESSIVE BRUSH STROKE lettering - NOT clean fonts, hand-painted/scratched strokes with raw jagged edges
- HOT PINK/MAGENTA core color (#FF1493, #FF00FF) with CYAN/BLUE outer glow (#00FFFF)
- Letters appear SLASHED/scratched into existence with paint splatter and drips
- Intense BLOOM/GLOW effect bleeding outward from each stroke
- Pure BLACK background for maximum contrast
- Glitchy/distorted edges on the letters like VHS corruption
- Light LENS FLARE and chromatic aberration around the text
- Each letter has visible brush texture and stroke variation
- Style: 80s retro synthwave aesthetic, aggressive and energetic`
    }
  ],
  "3d-chrome": [
    {
      id: "3d-chrome-silver",
      name: "Silver Mirror",
      description: "Polished silver chrome with reflections",
      previewImage: "/text-styles/chrome-silver.jpg",
      promptInstructions: `Create text with a polished silver chrome metallic effect. The text should have:
- Mirror-like reflective surface with gradient highlights
- Cool silver/platinum color palette
- Sharp specular highlights showing light source
- Subtle environment reflections in the metal
- Deep shadows and 3D extrusion for depth
- Clean, bold sans-serif letterforms
- Slight bevel on edges catching light
- Typography style: bold industrial sans-serif`
    },
    {
      id: "3d-chrome-gold",
      name: "Liquid Gold",
      description: "Warm gold chrome with luxury feel",
      previewImage: "/text-styles/chrome-gold.jpg",
      promptInstructions: `Create text with a warm liquid gold chrome effect. The text should have:
- Rich gold/amber metallic surface (#FFD700, #B8860B)
- Smooth gradient transitions from light to shadow
- Warm specular highlights
- Slight reflection of surroundings in the metal
- 3D depth with extruded sides
- Elegant, premium appearance
- Typography style: bold serif or elegant display font`
    }
  ],
  "gothic-script": [
    {
      id: "gothic-classic",
      name: "Classic Blackletter",
      description: "Traditional ornate blackletter",
      previewImage: "/text-styles/gothic-classic.jpg",
      promptInstructions: `Create text with traditional Gothic blackletter calligraphy. The text should have:
- Classic Fraktur/Blackletter style letterforms
- Thick vertical strokes with thin connecting lines
- Ornate decorative terminals and flourishes
- Deep black ink on parchment or aged paper texture
- Slight texture showing brush or pen strokes
- Medieval manuscript aesthetic
- Typography style: traditional blackletter/Fraktur`
    },
    {
      id: "gothic-metal",
      name: "Metal Gothic",
      description: "Dark metal band style gothic",
      previewImage: "/text-styles/gothic-metal.jpg",
      promptInstructions: `Create text with dark metal band gothic style. The text should have:
- Angular, aggressive blackletter with sharp points
- Thorns, spikes, or barbed wire elements
- Dark steel or silver metallic appearance
- Weathered, battle-worn texture
- Blood red accents optional
- Dark atmospheric background
- Typography style: extreme metal band logo aesthetic`
    }
  ],
  "grunge-distressed": [
    {
      id: "grunge-xerox",
      name: "Xerox Decay",
      description: "Photocopied, degraded aesthetic",
      previewImage: "/text-styles/grunge-xerox.jpg",
      promptInstructions: `Create text with xerox/photocopy distressed effect. The text should have:
- High contrast black and white
- Noise, grain, and copy machine artifacts
- Partially degraded/faded areas
- Torn paper edges or tape marks
- Multiple generation copy effect
- Raw punk/zine aesthetic
- Typography style: bold sans-serif degraded through copying`
    },
    {
      id: "grunge-rust",
      name: "Rust & Decay",
      description: "Corroded metal texture",
      previewImage: "/text-styles/grunge-rust.jpg",
      promptInstructions: `Create text with rusted corroded metal effect. The text should have:
- Orange/brown rust coloring with oxidation patterns
- Pitted, decayed metal surface texture
- Flaking and peeling sections
- Industrial, abandoned aesthetic
- Heavy wear and age marks
- Typography style: industrial stencil or bold block letters`
    }
  ],
  "fire-flames": [
    {
      id: "fire-inferno",
      name: "Inferno Blaze",
      description: "Intense burning flames engulfing text",
      previewImage: "/text-styles/fire-inferno.jpg",
      promptInstructions: `Create text engulfed in intense fire and flames. The text should have:
- Realistic fire with orange, yellow, and red flames
- Flames licking upward from all letters
- Glowing ember edges on the text
- Smoke wisps rising above
- Dark background for maximum contrast
- Heat distortion effect around edges
- Flying sparks and embers
- Typography style: bold, angular letters that look forged in fire`
    },
    {
      id: "fire-ember",
      name: "Glowing Embers",
      description: "Smoldering coals and ember glow",
      previewImage: "/text-styles/fire-ember.jpg",
      promptInstructions: `Create text with smoldering ember and coal effect. The text should have:
- Deep red/orange glowing edges like hot coals
- Cracked surface revealing molten interior
- Subtle smoke wisps
- Darker, more controlled than full flames
- Volcanic/lava aesthetic
- Intense heat glow emanating outward
- Typography style: cracked, fractured letters like cooling lava`
    }
  ],
  "glitch-digital": [
    {
      id: "glitch-rgb",
      name: "RGB Split",
      description: "Chromatic aberration glitch",
      previewImage: "/text-styles/glitch-rgb.jpg",
      promptInstructions: `Create text with RGB chromatic aberration glitch effect. The text should have:
- Red, green, blue color channel separation
- Offset color layers creating 3D anaglyph effect
- Digital scan lines or CRT monitor texture
- Slight horizontal displacement/shift
- Cyberpunk/vaporwave aesthetic
- Dark background with color bleeding
- Typography style: bold sans-serif with sharp edges`
    },
    {
      id: "glitch-corrupt",
      name: "Data Corrupt",
      description: "Corrupted file/databending aesthetic",
      previewImage: "/text-styles/glitch-corrupt.jpg",
      promptInstructions: `Create text with corrupted digital file aesthetic. The text should have:
- JPEG/PNG compression artifacts
- Blocky pixel displacement
- Random color blocks and streaks
- Partial fragmentation of letters
- Digital noise and static
- Broken/shifted sections
- Typography style: system font being destroyed by data corruption`
    }
  ]
};

// Function to get variants for a specific text style
export function getTextStyleVariants(styleId: string): TextStyleVariant[] {
  return TEXT_STYLE_VARIANTS[styleId] || [];
}

// Function to check if a style has variants
export function hasVariants(styleId: string): boolean {
  return (TEXT_STYLE_VARIANTS[styleId]?.length || 0) > 0;
}
