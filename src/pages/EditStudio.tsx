import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useTextLayerCompositing } from "@/hooks/useTextLayerCompositing";
import { useTextureCompositing } from "@/hooks/useTextureCompositing";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Palette, Image as ImageIcon, Sun, Layers, Zap, Check, RefreshCw, RotateCcw, RotateCw, History, Coins, ChevronLeft, ChevronRight, Maximize2, Minus, Plus, ShieldAlert, Expand, ArrowUpFromLine } from "lucide-react";
import { IntensityBar } from "@/components/IntensityIcon";
import { colorPalette, getColorValue, getColorHex } from "@/components/ColorPickerPopover";
import { TextStyleVariantDialog } from "@/components/TextStyleVariantDialog";
import { hasVariants, TextStyleVariant } from "@/lib/text-style-variants";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { CoverSelector } from "@/components/CoverSelector";

interface CoverAnalysis {
  dominantColors: string[];
  subjectPosition: string;
  safeTextZones: string[];
  avoidZones: string[];
  mood: string;
}

interface EditState {
  imageUrl: string;
  genre?: string;
  style?: string;
  mood?: string;
  textStyle?: string;
  prompt?: string;
  songTitle?: string | null;
  artistName?: string | null;
  coverAnalysis?: CoverAnalysis | null;
}

// Visual Style options
const visualStyles = [
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
const moodOptions = [
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

// Text style presets
const textStyles = [
  { id: "creative", name: "Creative" },
  { id: "dark", name: "Dark" },
  { id: "futuristic", name: "Futuristic" },
  { id: "modern", name: "Modern" },
  { id: "retro", name: "Retro" },
];

// Texture overlay options - stored in public/textures/
type BlendMode = "overlay" | "multiply" | "screen" | "soft-light" | "hard-light" | "lighter";

// Map canvas blend modes to CSS mix-blend-mode equivalents for preview
const getCssMixBlendMode = (blendMode?: BlendMode): React.CSSProperties['mixBlendMode'] => {
  if (blendMode === "lighter") return "screen"; // "lighter" is canvas-only, "screen" is closest CSS equivalent for preview
  return blendMode;
};

interface TextureOption {
  id: string;
  name: string;
  image: string | null;
  blendMode?: BlendMode;
  opacity?: number;
  gradient?: string; // Fallback for preview only
}

const textureOptions: TextureOption[] = [
  { id: "none", name: "None", image: null },
  { id: "rock-grunge", name: "Rock Grunge", image: "/textures/rock-grunge.jpg", blendMode: "overlay", opacity: 0.125 },
  { id: "light-grunge", name: "Light Grunge", image: "/textures/light-grunge.jpg", blendMode: "lighter", opacity: 0.3 },
  { id: "white-grunge", name: "White Grunge", image: "/textures/white-grunge.jpg", blendMode: "overlay", opacity: 0.5 },
  { id: "paper-grit", name: "Paper Grit", image: "/textures/paper-grit.jpg", blendMode: "lighter", opacity: 0.4 },
  { id: "smoke", name: "Smoke", image: "/textures/smoke.jpg", blendMode: "screen", opacity: 0.5 },
  { id: "vhs", name: "VHS", image: "/textures/vhs.jpg", blendMode: "lighter", opacity: 0.4 },
];

interface LightingOption {
  id: string;
  name: string;
  image: string | null;
  blendMode?: BlendMode;
  opacity?: number;
  gradient?: string;
}

// Light/Lighting options - stored in public/lighting/
const lightingOptions: LightingOption[] = [
  { id: "none", name: "None", image: null },
  { id: "speed-lines", name: "Speed Lines", image: "/lighting/speed-lines.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "heavenly-light", name: "Heavenly Light", image: "/lighting/heavenly-light.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "blue-light", name: "Blue Light", image: "/lighting/blue-heaven.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "prism-leak", name: "Prism Leak", image: "/lighting/prism-leak.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "side-flash", name: "SideFlash", image: "/lighting/side-flash.jpg", blendMode: "screen", opacity: 1.0 },
  { id: "fractal-red", name: "Fractal Red", image: "/lighting/fractal-red.jpg", blendMode: "screen", opacity: 1.0 },
];

// Parental Advisory options - stored in public/parental-advisory/
interface ParentalAdvisoryOption {
  id: string;
  name: string;
  image: string;
}

const parentalAdvisoryOptions: ParentalAdvisoryOption[] = [
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

const EditStudio = () => {
  const { user, loading } = useAuth();
  const { credits, refetch: refetchCredits, hasUnlimitedGenerations } = useCredits();
  const { compositeAndUpload, isCompositing } = useTextLayerCompositing();
  const { applyTextureOverlay, applyMultipleOverlays, isCompositing: isApplyingTexture } = useTextureCompositing();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Mobile edit section tabs
  const [mobileEditTab, setMobileEditTab] = useState<"textures" | "lighting" | "pa" | "colors" | "style" | "custom">("textures");
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  
  // Get passed state from navigation
  const passedState = location.state as EditState | null;
  
  // Original values that came from generation
  const [originalState] = useState({
    imageUrl: passedState?.imageUrl || "",
    style: passedState?.style || "None",
    mood: passedState?.mood || "None",
    textStyle: passedState?.textStyle || "",
    textStyleVariantId: null as string | null, // e.g., "creative-3"
    genre: passedState?.genre || "",
    prompt: passedState?.prompt || "",
    songTitle: passedState?.songTitle || null,
    artistName: passedState?.artistName || null,
    coverAnalysis: passedState?.coverAnalysis || null,
  });
  
  // Store the base artwork (without text) for non-destructive text edits
  const [baseArtworkUrl, setBaseArtworkUrl] = useState<string | null>(null);
  
  // Current values (track what's been "applied")
  const [currentState, setCurrentState] = useState({ ...originalState });
  
  // Working/pending values
  const [imageUrl, setImageUrl] = useState<string>(passedState?.imageUrl || "");
  const [style, setStyle] = useState(passedState?.style || "None");
  const [mood, setMood] = useState(passedState?.mood || "None");
  const [textStyle, setTextStyle] = useState(passedState?.textStyle || "");
  const [mainColor, setMainColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [textures, setTextures] = useState<string[]>([]);
  const [textureIntensities, setTextureIntensities] = useState<Record<string, number>>({}); // Track intensity per texture ID (0-100)
  const [textureRotations, setTextureRotations] = useState<Record<string, number>>({}); // Track rotation per texture ID
  const [lightings, setLightings] = useState<string[]>([]);
  const [lightingRotations, setLightingRotations] = useState<Record<string, number>>({}); // Track rotation per lighting ID
  const [lightingIntensities, setLightingIntensities] = useState<Record<string, number>>({}); // Track intensity per lighting ID (25-100)
  const [parentalAdvisory, setParentalAdvisory] = useState<string>("none");
  const [paPosition, setPaPosition] = useState<"bottom-right" | "bottom-left" | "bottom-center">("bottom-right");
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paInverted, setPaInverted] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  
  // Version history
  const [editHistory, setEditHistory] = useState<string[]>([passedState?.imageUrl || ""]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Text style variant
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [pendingStyleId, setPendingStyleId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  
  // Progress state
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Upscale state
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
  
  // Long-press preview state removed
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  
  // Handle selecting a cover from the selector
  const handleSelectCover = (cover: any) => {
    setImageUrl(cover.image_url);
    setCurrentState(prev => ({
      ...prev,
      imageUrl: cover.image_url,
      songTitle: cover.song_title || null,
      artistName: cover.artist_name || null,
      genre: cover.genre || "",
      style: cover.style || "None",
      mood: cover.mood || "None",
      prompt: cover.prompt || "",
      coverAnalysis: cover.cover_analysis || null,
    }));
    setEditHistory([cover.image_url]);
    setHistoryIndex(0);
  };

  // Handle uploading a new image
  const handleUploadImage = (uploadedImageUrl: string) => {
    setImageUrl(uploadedImageUrl);
    setCurrentState(prev => ({
      ...prev,
      imageUrl: uploadedImageUrl,
    }));
    setEditHistory([uploadedImageUrl]);
    setHistoryIndex(0);
  };
  
  // Fetch cover analysis from database if not provided but we have an image URL
  useEffect(() => {
    const fetchCoverData = async () => {
      if (!user || !passedState?.imageUrl) return;
      
      // Skip if we already have all metadata
      if (originalState.coverAnalysis && originalState.songTitle && originalState.artistName) return;
      
      try {
        // Fetch the generation record by image URL
        const { data, error } = await supabase
          .from("generations")
          .select("song_title, artist_name, cover_analysis")
          .eq("image_url", passedState.imageUrl)
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Failed to fetch cover data:", error);
          return;
        }
        
        if (data) {
          // Update original state with fetched data if not already set
          if (!originalState.songTitle && data.song_title) {
            setCurrentState(prev => ({
              ...prev,
              songTitle: data.song_title,
            }));
          }
          if (!originalState.artistName && data.artist_name) {
            setCurrentState(prev => ({
              ...prev,
              artistName: data.artist_name,
            }));
          }
          if (!originalState.coverAnalysis && data.cover_analysis) {
            setCurrentState(prev => ({
              ...prev,
              coverAnalysis: data.cover_analysis as unknown as CoverAnalysis,
            }));
          }
        }
      } catch (e) {
        console.error("Error fetching cover data:", e);
      }
    };
    
    fetchCoverData();
  }, [user, passedState?.imageUrl, originalState.songTitle, originalState.artistName, originalState.coverAnalysis]);
  
  const buildEditInstructions = () => {
    const instructions: string[] = [];
    
    if (style && style !== "None" && style !== currentState.style) {
      instructions.push(`Change the visual style to ${style}`);
    }
    
    if (mood && mood !== "None" && mood !== currentState.mood) {
      instructions.push(`Adjust the mood/vibe to feel more ${mood}`);
    }
    
    if (mainColor) {
      instructions.push(`Apply ${getColorValue(mainColor)} as a semi-transparent COLOR OVERLAY across the entire cover, similar to a Photoshop Overlay blend mode at approximately 40–60% opacity. This should behave like a cinematic color wash layered on top of the image, affecting the artwork, lighting, atmosphere, AND typography together, while preserving underlying detail, contrast, and texture. The overlay should: influence the overall mood and color balance, tint highlights and midtones more than shadows, preserve deep blacks and bright highlights, maintain material texture, depth, and realism, keep text fully readable and dimensional. IMPORTANT CONSTRAINTS: Do NOT fully recolor or flatten the image. Do NOT monochrome the scene. Do NOT replace the original palette. Do NOT eliminate contrast or lighting direction. Shadows must remain dark and grounded. Highlights must retain brightness and detail. The result should feel like a tasteful color grade, not a color replacement.`);
    }
    
    if (accentColor) {
      instructions.push(`Apply ${getColorValue(accentColor)} as a subtle accent color that influences secondary elements and details throughout the composition. Apply it to: secondary text, small details, borders or outlines of objects, highlights on materials like metal/glass/water reflections, atmospheric glow or ambient light in darker areas, background elements or decorative accents. The accent color should complement the main composition without dominating it. Use approximately 15-30% coverage. It should feel like a tasteful color accent that ties the design together, NOT a full color grade or overlay. The main subjects and primary elements should remain unaffected. Apply naturally and subtly.`);
    }
    
    // Check if text style variant changed (compare full variant ID, not just category)
    const currentVariantId = selectedVariant ? `${textStyle}-${selectedVariant.id}` : null;
    const hasTextStyleChange = currentVariantId && currentVariantId !== currentState.textStyleVariantId;
    
    if (textStyle && selectedVariant && hasTextStyleChange) {
      // Use the detailed promptInstructions from the variant for accurate styling
      const stylePrompt = selectedVariant.promptInstructions || selectedVariant.description || `${textStyle} ${selectedVariant.name} style`;
      const colorRule = mainColor
        ? `Use the explicitly requested text color (${getColorValue(mainColor)}).`
        : "Keep the EXACT same text color as the current cover text (sample it from the image); do not recolor the text.";

      instructions.push(
        `TEXT TYPOGRAPHY FULL REPLACE: First, carefully READ and identify the exact words currently shown on the album cover (artist name, song title, any other text). Then ERASE/INPAINT the existing lettering so none of the previous typography/effects remain. Then re-typeset the SAME words in this EXACT typography style: ${stylePrompt}. ${colorRule} Do not blend the old style with the new style—replace it completely.`
      );
    } else if (textStyle && !selectedVariant && textStyle !== currentState.textStyle) {
      // Fallback for text style without variant
      const colorRule = mainColor
        ? `Use the explicitly requested text color (${getColorValue(mainColor)}).`
        : "Keep the EXACT same text color as the current cover text (sample it from the image); do not recolor the text.";

      instructions.push(
        `TEXT TYPOGRAPHY FULL REPLACE: First, carefully READ and identify the exact words currently shown on the album cover. Then ERASE/INPAINT the existing lettering so none of the previous typography/effects remain. Then re-typeset the SAME words in a ${textStyle} typography style. ${colorRule} Do not blend the old style with the new style—replace it completely.`
      );
    }
    
    
    // Note: Textures and lighting with image files are applied via canvas compositing (not AI)
    // Only include AI instruction for textures/lighting without image files
    if (textures.length > 0) {
      const aiTextures = textures
        .map(id => textureOptions.find(t => t.id === id))
        .filter(t => t && !t.image);
      aiTextures.forEach(textureOption => {
        if (textureOption) {
          instructions.push(`Apply a subtle ${textureOption.name} texture overlay across the entire image`);
        }
      });
    }
    
    if (lightings.length > 0) {
      const aiLightings = lightings
        .map(id => lightingOptions.find(l => l.id === id))
        .filter(l => l && !l.image);
      aiLightings.forEach(lightingOption => {
        if (lightingOption) {
          instructions.push(`Add a ${lightingOption.name} lighting effect / light leak to enhance the atmosphere`);
        }
      });
    }
    
    if (customInstructions.trim()) {
      instructions.push(customInstructions.trim());
    }
    
    return instructions.join(". ");
  };
  
  // Removed - we don't save every edit to Previous Generations anymore
  // Edits are tracked in the local editHistory state instead
  
  const deductCredit = async () => {
    if (hasUnlimitedGenerations) return true;
    
    if (credits === null || credits < 1) {
      toast.error("Insufficient credits", { description: "You need 1 credit to apply edits" });
      return false;
    }
    
    try {
      const { error } = await supabase
        .from("user_credits")
        .update({ credits: credits - 1 })
        .eq("user_id", user?.id);
      
      if (error) throw error;
      refetchCredits();
      return true;
    } catch (error) {
      console.error("Failed to deduct credit:", error);
      toast.error("Failed to process credit");
      return false;
    }
  };
  
  // Determine if this is a text-only edit (no visual changes)
  const isTextOnlyEdit = (
    hasTextStyleChange: boolean,
    mainColorSet: boolean
  ): boolean => {
    // Text-only if: only text style changed (with optional text color)
    // No: visual style, mood, accent color, texture, lighting, parental advisory, custom instructions
    const hasVisualEdits = 
      (style !== currentState.style && style !== "None") ||
      (mood !== currentState.mood && mood !== "None") ||
      accentColor ||
      textures.length > 0 ||
      lightings.length > 0 ||
      customInstructions.trim();
    
    return hasTextStyleChange && !hasVisualEdits;
  };

  // Check if we have text metadata for text layer mode
  const hasTextMetadata = !!(currentState.songTitle || currentState.artistName);

  const handleApplyEdits = async () => {
    const instructions = buildEditInstructions();
    
    // Check if we have texture/lighting overlays that use image files (applied via canvas, not AI)
    const hasCanvasTextures = textures.some(id => {
      const t = textureOptions.find(t => t.id === id);
      return t?.image;
    });
    const hasCanvasLightings = lightings.some(id => {
      const l = lightingOptions.find(l => l.id === id);
      return l?.image;
    });
    const hasCanvasOverlays = hasCanvasTextures || hasCanvasLightings;
    
    // Allow if we have AI instructions OR canvas overlays to apply
    if (!instructions && !hasCanvasOverlays) {
      toast.error("No changes selected", { description: "Please select at least one edit to apply" });
      return;
    }
    
    // Texture-only edits (with image files) don't consume credits - they're local canvas operations
    const isTextureOnlyEditFlag = !instructions && hasCanvasOverlays;
    
    if (!isTextureOnlyEditFlag) {
      // Check and deduct credit for AI edits
      const creditOk = await deductCredit();
      if (!creditOk) return;
    }
    
    setIsEditing(true);
    setProgress(0);
    
    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 600);
    
    try {
      // Check if this is a text-only edit
      const currentVariantId = selectedVariant ? `${textStyle}-${selectedVariant.id}` : null;
      const hasTextStyleChange = !!(currentVariantId && currentVariantId !== currentState.textStyleVariantId);
      const textOnlyEdit = isTextOnlyEdit(hasTextStyleChange, !!mainColor);
      
      // Only use text layer mode if we have text metadata AND it's a text-only edit
      const useTextLayerMode = textOnlyEdit && hasTextMetadata && user;
      
      let finalImageUrl: string = imageUrl; // Start with current image
      
      if (instructions && useTextLayerMode) {
        // ===== NON-DESTRUCTIVE TEXT LAYER MODE (Design Studio Pass 3 style) =====
        // Backend regenerates the full image with integrated text - no client compositing needed
        console.log("Using Design Studio Pass 3-style text integration", { songTitle: currentState.songTitle, artistName: currentState.artistName });
        toast.info("Updating text style...");
        
        const stylePrompt = selectedVariant?.promptInstructions || 
          selectedVariant?.description || 
          `${textStyle} ${selectedVariant?.name || ''} style`;
        
        const styleRefUrl = selectedVariant?.previewImage 
          ? new URL(selectedVariant.previewImage, window.location.origin).toString()
          : null;
        
        setProgress(20);
        
        const { data, error } = await supabase.functions.invoke("edit-cover", {
          body: {
            editMode: "text_layer",
            imageUrl: imageUrl, // Current image (may have text)
            baseArtworkUrl: baseArtworkUrl || null, // Cached clean base (if available)
            typography: {
              songTitle: currentState.songTitle,
              artistName: currentState.artistName,
              stylePrompt,
              styleReferenceImageUrl: styleRefUrl,
              coverAnalysis: currentState.coverAnalysis,
            },
          },
        });
        
        if (error) throw error;

        setProgress(80);
        
        // Backend now returns a complete image (not text_layer mode)
        if (data?.imageUrl) {
          finalImageUrl = data.imageUrl;
          
          // Cache the clean base for future text-only edits
          if (data.baseArtworkUrl) {
            setBaseArtworkUrl(data.baseArtworkUrl);
          }
        } else {
          throw new Error("No image returned from edit");
        }
      } else if (instructions) {
        // ===== LEGACY MODE: Full inpainting =====
        const styleReferenceImageUrl =
          textStyle && selectedVariant
            ? new URL(selectedVariant.previewImage, window.location.origin).toString()
            : null;

        const { data, error } = await supabase.functions.invoke("edit-cover", {
          body: {
            imageUrl: imageUrl,
            instructions: instructions,
            styleReferenceImageUrl,
            songTitle: originalState.songTitle,
            artistName: originalState.artistName,
            coverAnalysis: originalState.coverAnalysis,
          },
        });
        
        if (error) throw error;
        
        if (!data?.imageUrl) {
          throw new Error("No image returned from edit");
        }
        
        finalImageUrl = data.imageUrl;
        
        // After a visual edit, clear the base artwork cache
        // (the composition has changed, so we need fresh text removal next time)
        setBaseArtworkUrl(null);
      }
      // If no instructions but hasCanvasOverlays, we skip AI and go straight to canvas compositing
      
      // ===== APPLY TEXTURE/LIGHTING OVERLAYS VIA CANVAS COMPOSITING =====
      // This happens AFTER AI edits (or can happen standalone for texture-only changes)
      const overlays: Array<{ imageUrl: string; options: { blendMode: BlendMode; opacity: number; rotation?: number } }> = [];
      
      // Add texture overlays if selected and have image files
      textures.forEach(textureId => {
        const textureOption = textureOptions.find(t => t.id === textureId);
        if (textureOption?.image && textureOption.blendMode && textureOption.opacity) {
          overlays.push({
            imageUrl: textureOption.image,
            options: {
              blendMode: textureOption.blendMode,
              opacity: textureOption.opacity,
            },
          });
        }
      });
      
      // Add lighting overlays if selected and have image files
      lightings.forEach(lightingId => {
        const lightingOption = lightingOptions.find(l => l.id === lightingId);
        if (lightingOption?.image && lightingOption.blendMode && lightingOption.opacity) {
          const baseOpacity = lightingOption.opacity;
          const intensityMultiplier = (lightingIntensities[lightingId] ?? 100) / 100;
          overlays.push({
            imageUrl: lightingOption.image,
            options: {
              blendMode: lightingOption.blendMode,
              opacity: baseOpacity * intensityMultiplier,
              rotation: lightingRotations[lightingId] || 0,
            },
          });
        }
      });
      
      // Apply canvas overlays if any
      if (overlays.length > 0) {
        setProgress(95);
        toast.info("Applying texture overlay...");
        finalImageUrl = await applyMultipleOverlays(finalImageUrl, overlays);
      }
      
      setProgress(100);
      
      // Update history
      const newHistory = [...editHistory.slice(0, historyIndex + 1), finalImageUrl];
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      setImageUrl(finalImageUrl);
      
      // Update current state to reflect what was applied
      const appliedVariantId = selectedVariant ? `${textStyle}-${selectedVariant.id}` : null;
      setCurrentState({
        ...currentState,
        imageUrl: finalImageUrl,
        style: style !== "None" ? style : currentState.style,
        mood: mood !== "None" ? mood : currentState.mood,
        textStyle: textStyle || currentState.textStyle,
        textStyleVariantId: appliedVariantId || currentState.textStyleVariantId,
      });
      
      // Reset single-use options
      setMainColor("");
      setAccentColor("");
      setTextures([]);
      setTextureIntensities({});
      setLightings([]);
      setLightingRotations({});
      setLightingIntensities({});
      setCustomInstructions("");
      
      toast.success("Edits applied!", { 
        description: isTextureOnlyEditFlag 
          ? "Texture overlay applied (no credits used)" 
          : textOnlyEdit 
            ? "Text layer updated (background preserved)" 
            : "Your cover has been updated" 
      });
    } catch (error) {
      console.error("Edit error:", error);
      // Refund credit on failure
      refetchCredits();
      toast.error("Edit failed", { 
        description: error instanceof Error ? error.message : "Could not apply edits" 
      });
    } finally {
      clearInterval(progressInterval);
      setIsEditing(false);
    }
  };
  
  const handleDownload = async () => {
    const imageToDownload = upscaledImageUrl || imageUrl;
    if (!imageToDownload) return;
    
    try {
      const res = await fetch(imageToDownload);
      const blob = await res.blob();
      
      // Check if running on native platform (iOS/Android)
      if (Capacitor.isNativePlatform()) {
        // Convert blob to base64 for native saving
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          const fileName = upscaledImageUrl ? `cover-art-hd-${Date.now()}.png` : `cover-art-${Date.now()}.png`;
          
          try {
            await Filesystem.writeFile({
              path: fileName,
              data: base64Data,
              directory: Directory.Documents,
            });
            toast.success("Saved!", { description: "Cover saved to Documents folder" });
          } catch (fsError) {
            console.error("Filesystem write error:", fsError);
            // Fallback to browser download
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = upscaledImageUrl ? "cover-art-hd.png" : "cover-art-final.png";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            toast.success("Downloaded!", { description: upscaledImageUrl ? "HD cover saved" : "Cover saved" });
          }
        };
        reader.readAsDataURL(blob);
      } else {
        // Browser download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = upscaledImageUrl ? "cover-art-hd.png" : "cover-art-final.png";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Downloaded!", { description: upscaledImageUrl ? "HD cover saved (4096x4096)" : "Your final cover has been saved" });
      }
    } catch (error) {
      toast.error("Download failed");
    }
  };
  
  // Long-press handlers removed
  
  const handleUpscale = async () => {
    if (!imageUrl || isUpscaling) return;
    
    setIsUpscaling(true);
    try {
      const { data, error } = await supabase.functions.invoke("upscale-cover", {
        body: { imageUrl },
      });
      
      if (error) throw error;
      
      if (data?.upscaledUrl) {
        setUpscaledImageUrl(data.upscaledUrl);
        toast.success("Cover upscaled to HD!", {
          description: "Your cover is now 4096x4096 (exceeds 3000x3000).",
        });
      } else {
        throw new Error("No upscaled image returned");
      }
    } catch (err) {
      console.error("Upscale error:", err);
      toast.error("Upscale failed", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsUpscaling(false);
    }
  };
  
  const handleRevertToOriginal = () => {
    setImageUrl(originalState.imageUrl);
    setStyle(originalState.style);
    setMood(originalState.mood);
    setTextStyle(originalState.textStyle);
    setHistoryIndex(0);
    toast.info("Reverted to original");
  };
  
  const handlePrevVersion = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setImageUrl(editHistory[newIndex]);
      toast.info(newIndex === 0 ? "Viewing original" : `Viewing Edit ${newIndex}`);
    }
  };
  
  const handleNextVersion = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setImageUrl(editHistory[newIndex]);
      toast.info(`Viewing Edit ${newIndex}`);
    }
  };
  
  const handleVariantSelect = (variant: TextStyleVariant) => {
    if (pendingStyleId) {
      setTextStyle(pendingStyleId);
      setSelectedVariant(variant);
    }
    setShowVariantDialog(false);
    setPendingStyleId(null);
  };
  
  // Compare full variant ID for text style changes (e.g., "creative-3" !== "creative-5")
  const currentVariantId = selectedVariant ? `${textStyle}-${selectedVariant.id}` : null;
  const hasTextStyleVariantChange = currentVariantId && currentVariantId !== currentState.textStyleVariantId;
  
  const hasChanges = (style !== currentState.style && style !== "None") || 
    (mood !== currentState.mood && mood !== "None") || 
    hasTextStyleVariantChange || 
    mainColor || accentColor || 
    textures.length > 0 || lightings.length > 0 || 
    parentalAdvisory !== "none" ||
    customInstructions.trim();
  
  const canGoPrev = historyIndex > 0;
  const canGoNext = historyIndex < editHistory.length - 1;
  const isAtOriginal = historyIndex === 0;
  const totalVersions = editHistory.length;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className={isMobile ? "pt-16 pb-4" : "pt-24 pb-16"}>
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header - Compact on mobile, aligned with tokens */}
            <div className={`flex items-center gap-2 ${isMobile ? "py-1 h-9" : "gap-4 mb-6"}`}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/", { 
                  state: { 
                    returnedImage: imageUrl,
                    genre: currentState.genre,
                    style: currentState.style,
                    mood: currentState.mood,
                    textStyle: currentState.textStyle,
                    songTitle: currentState.songTitle,
                    artistName: currentState.artistName,
                  } 
                })}
                className="px-2 md:px-3 h-7 md:h-8"
              >
                <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </Button>
              <h1 className="font-display text-base md:text-3xl tracking-wide flex-1">EDIT STUDIO</h1>
              <div className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 h-7 rounded-lg">
                <Coins className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
                <span>{hasUnlimitedGenerations ? "∞" : credits ?? 0}</span>
              </div>
            </div>
            
            {/* MOBILE LAYOUT */}
            {isMobile ? (
              <div className="flex flex-col">
                {/* Cover Preview */}
                <div className="bg-background pb-1">
                  <div 
                    className="aspect-square w-[85vw] max-w-[360px] mx-auto bg-card rounded-xl border border-border overflow-hidden relative"
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                    
                        {/* Lighting Preview Overlays */}
                        {lightings.map(lightingId => {
                          const lightingOption = lightingOptions.find(l => l.id === lightingId);
                          if (!lightingOption?.image) return null;
                          const rotation = lightingRotations[lightingId] || 0;
                          const baseOpacity = lightingOption.opacity || 1;
                          const intensityMultiplier = (lightingIntensities[lightingId] ?? 100) / 100;
                          const finalOpacity = baseOpacity * intensityMultiplier;
                          return (
                            <div 
                              key={lightingId}
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                backgroundImage: `url(${lightingOption.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                mixBlendMode: getCssMixBlendMode(lightingOption.blendMode) || 'screen',
                                opacity: finalOpacity,
                                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                              }}
                            />
                          );
                        })}
                        
                        {/* Texture Preview Overlays */}
                        {textures.map(textureId => {
                          const textureOption = textureOptions.find(t => t.id === textureId);
                          if (!textureOption?.image) return null;
                          const baseOpacity = textureOption.opacity || 0.5;
                          const intensityMultiplier = (textureIntensities[textureId] ?? 50) / 40;
                          const finalOpacity = Math.min(baseOpacity * intensityMultiplier, 1);
                          const rotation = textureRotations[textureId] || 0;
                          return (
                            <div 
                              key={textureId}
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                backgroundImage: `url(${textureOption.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                mixBlendMode: getCssMixBlendMode(textureOption.blendMode) || 'overlay',
                                opacity: finalOpacity,
                                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                              }}
                            />
                          );
                        })}
                        
                        {/* Color Filter Overlays - Real-time preview */}
                        {mainColor && getColorHex(mainColor) && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ 
                              backgroundColor: getColorHex(mainColor),
                              mixBlendMode: 'overlay',
                              opacity: 0.45,
                            }}
                          />
                        )}
                        {accentColor && getColorHex(accentColor) && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ 
                              background: `
                                radial-gradient(ellipse at 15% 85%, ${getColorHex(accentColor)} 0%, transparent 35%),
                                radial-gradient(ellipse at 85% 15%, ${getColorHex(accentColor)} 0%, transparent 35%),
                                radial-gradient(ellipse at 50% 50%, ${getColorHex(accentColor)}22 0%, transparent 60%)
                              `,
                              mixBlendMode: 'color-dodge',
                              opacity: 0.35,
                            }}
                          />
                        )}
                        
                        {/* Parental Advisory Logo Overlay */}
                        {parentalAdvisory !== "none" && (
                          <div 
                            className={`absolute w-[22%] ${
                              paPosition === "bottom-right" ? "bottom-2 right-2" :
                              paPosition === "bottom-left" ? "bottom-2 left-2" :
                              "bottom-2 left-1/2 -translate-x-1/2"
                            }`}
                          >
                            <img 
                              src={parentalAdvisoryOptions.find(p => p.id === parentalAdvisory)?.image}
                              alt="Parental Advisory"
                              className="w-full h-auto"
                              style={{ filter: paInverted ? "invert(1)" : "none" }}
                            />
                          </div>
                        )}
                        
                        {/* Version indicator */}
                        {editHistory.length > 1 && (
                          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <History className="w-2.5 h-2.5" />
                            {isAtOriginal ? "Original" : `Edit ${historyIndex}`}
                          </div>
                        )}
                        
                        {/* Progress overlay */}
                        {(isEditing || isUpscaling) && (
                          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-medium">{isEditing ? "Applying..." : "Upscaling..."}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <CoverSelector onSelect={handleSelectCover} onUpload={handleUploadImage} />
                    )}
                  </div>
                </div>
                
                {/* Compact Horizontal Swipe Tab Navigation */}
                <div 
                  ref={mobileTabsRef}
                  className="flex gap-1 overflow-x-auto scrollbar-hide py-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {[
                    { id: "textures", label: "Textures", icon: Layers, count: textures.length },
                    { id: "lighting", label: "Lighting", icon: Zap, count: lightings.length },
                    { id: "pa", label: "Advisory", icon: ShieldAlert, count: parentalAdvisory !== "none" ? 1 : 0 },
                    { id: "colors", label: "Colors", icon: Sun, count: (mainColor ? 1 : 0) + (accentColor ? 1 : 0) },
                    { id: "custom", label: "Custom", icon: Sparkles, count: customInstructions.trim() ? 1 : 0 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setMobileEditTab(tab.id as typeof mobileEditTab)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full whitespace-nowrap text-[11px] font-medium transition-all shrink-0 ${
                        mobileEditTab === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground/70"
                      }`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`px-1 rounded-full text-[9px] ${
                          mobileEditTab === tab.id ? "bg-white/20" : "bg-primary/20 text-primary"
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Edit Sections */}
                <div className="mt-2">
                  {/* Textures Section - Horizontal Scroll */}
                  {mobileEditTab === "textures" && (
                    <div className="flex flex-col"  style={{ height: textures.length > 0 ? 'auto' : 'auto' }}>
                      <div 
                        className="flex gap-2 overflow-x-auto scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {textureOptions.filter(t => t.id !== "none").map(t => {
                          const isSelected = textures.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (isSelected) {
                                  // First click on selected: just show controls (move to end)
                                  // Second click: remove
                                  const isLastItem = textures[textures.length - 1] === t.id;
                                  if (isLastItem) {
                                    // Already active, so remove it
                                    setTextures(textures.filter(id => id !== t.id));
                                    const { [t.id]: _, ...rest } = textureIntensities;
                                    setTextureIntensities(rest);
                                    const { [t.id]: __, ...restRotations } = textureRotations;
                                    setTextureRotations(restRotations);
                                  } else {
                                    // Move to end to make it the active one
                                    setTextures([...textures.filter(id => id !== t.id), t.id]);
                                  }
                                } else {
                                  setTextures([...textures, t.id]);
                                  setTextureIntensities({ ...textureIntensities, [t.id]: 50 });
                                }
                              }}
                              disabled={isEditing}
                              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex items-end justify-center relative shrink-0 ${
                                isSelected
                                  ? textures[textures.length - 1] === t.id 
                                    ? "border-white ring-1 ring-white/50" 
                                    : "border-primary ring-1 ring-primary/50"
                                  : "border-border"
                              }`}
                              style={{
                                width: 'calc((100% - 1rem) / 3.5)',
                                background: t.image ? `url(${t.image}) center/cover` : "var(--secondary)" 
                              }}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 w-full text-center truncate">
                                {t.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Single Control Row for Active Texture - centered in remaining space */}
                      {textures.length > 0 && (() => {
                        const activeTextureId = textures[textures.length - 1];
                        const currentIntensity = textureIntensities[activeTextureId] ?? 50;
                        const currentRotation = textureRotations[activeTextureId] || 0;
                        const isMin = currentIntensity <= 25;
                        const isMax = currentIntensity >= 100;
                        return (
                          <div className="flex items-center justify-center gap-2 py-4">
                            {/* Rotate button */}
                            <button
                              onClick={() => setTextureRotations({ ...textureRotations, [activeTextureId]: (currentRotation + 90) % 360 })}
                              className="w-12 h-12 flex items-center justify-center rounded-lg bg-secondary border border-border"
                            >
                              <RotateCw className="w-5 h-5" />
                            </button>
                            {/* Intensity controls */}
                            <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 h-12 border border-border">
                              <button
                                onClick={() => setTextureIntensities({ ...textureIntensities, [activeTextureId]: Math.max(25, currentIntensity - 25) })}
                                disabled={isMin}
                                className={`w-8 h-8 rounded bg-background flex items-center justify-center transition-colors ${isMin ? 'text-destructive' : ''}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <div className="w-10 text-center">
                                <IntensityBar intensity={currentIntensity} className="w-5 h-5 mx-auto" />
                              </div>
                              <button
                                onClick={() => setTextureIntensities({ ...textureIntensities, [activeTextureId]: Math.min(100, currentIntensity + 25) })}
                                disabled={isMax}
                                className={`w-8 h-8 rounded bg-background flex items-center justify-center transition-colors ${isMax ? 'text-destructive' : ''}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Lighting Section - Horizontal Scroll */}
                  {mobileEditTab === "lighting" && (
                    <div className="flex flex-col">
                      <div 
                        className="flex gap-2 overflow-x-auto scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {lightingOptions.filter(l => l.id !== "none").map(l => {
                          const isSelected = lightings.includes(l.id);
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                if (isSelected) {
                                  // First click on selected: just show controls (move to end)
                                  // Second click: remove
                                  const isLastItem = lightings[lightings.length - 1] === l.id;
                                  if (isLastItem) {
                                    // Already active, so remove it
                                    setLightings(lightings.filter(id => id !== l.id));
                                    const { [l.id]: _, ...rest } = lightingRotations;
                                    setLightingRotations(rest);
                                    const { [l.id]: __, ...restIntensity } = lightingIntensities;
                                    setLightingIntensities(restIntensity);
                                  } else {
                                    // Move to end to make it the active one
                                    setLightings([...lightings.filter(id => id !== l.id), l.id]);
                                  }
                                } else {
                                  setLightings([...lightings, l.id]);
                                  setLightingIntensities({ ...lightingIntensities, [l.id]: 100 });
                                }
                              }}
                              disabled={isEditing}
                              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex items-end justify-center relative shrink-0 ${
                                isSelected
                                  ? lightings[lightings.length - 1] === l.id 
                                    ? "border-white ring-1 ring-white/50" 
                                    : "border-primary ring-1 ring-primary/50"
                                  : "border-border"
                              }`}
                              style={{
                                width: 'calc((100% - 1rem) / 3.5)',
                                background: l.image ? `url(${l.image}) center/cover` : "var(--secondary)" 
                              }}
                            >
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 w-full text-center truncate">
                                {l.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Single Control Row for Active Lighting - centered in remaining space */}
                      {lightings.length > 0 && (() => {
                        const activeLightingId = lightings[lightings.length - 1];
                        const currentRotation = lightingRotations[activeLightingId] || 0;
                        const currentIntensity = lightingIntensities[activeLightingId] ?? 100;
                        const isMin = currentIntensity <= 25;
                        const isMax = currentIntensity >= 100;
                        return (
                          <div className="flex items-center justify-center gap-2 py-4">
                            {/* Rotate button */}
                            <button
                              onClick={() => setLightingRotations({ ...lightingRotations, [activeLightingId]: (currentRotation + 90) % 360 })}
                              className="w-12 h-12 flex items-center justify-center rounded-lg bg-secondary border border-border"
                            >
                              <RotateCw className="w-5 h-5" />
                            </button>
                            {/* Intensity controls */}
                            <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 h-12 border border-border">
                              <button
                                onClick={() => setLightingIntensities({ ...lightingIntensities, [activeLightingId]: Math.max(25, currentIntensity - 25) })}
                                disabled={isMin}
                                className={`w-8 h-8 rounded bg-background flex items-center justify-center transition-colors ${isMin ? 'text-destructive' : ''}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <div className="w-10 text-center">
                                <IntensityBar intensity={currentIntensity} className="w-5 h-5 mx-auto" />
                              </div>
                              <button
                                onClick={() => setLightingIntensities({ ...lightingIntensities, [activeLightingId]: Math.min(100, currentIntensity + 25) })}
                                disabled={isMax}
                                className={`w-8 h-8 rounded bg-background flex items-center justify-center transition-colors ${isMax ? 'text-destructive' : ''}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {/* Parental Advisory Section - Horizontal Scroll */}
                  {mobileEditTab === "pa" && (
                    <div className="space-y-2">
                      <div 
                        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {parentalAdvisoryOptions.map(pa => {
                          const isSelected = parentalAdvisory === pa.id;
                          return (
                            <button
                              key={pa.id}
                              onClick={() => setParentalAdvisory(pa.id)}
                              disabled={isEditing}
                              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex items-center justify-center relative shrink-0 ${
                                isSelected
                                  ? "border-primary ring-1 ring-primary/50"
                                  : "border-border"
                              }`}
                              style={{ 
                                width: 'calc((100% - 1rem) / 3.5)',
                                background: pa.id === "none" ? "var(--secondary)" : "#1a1a1a"
                              }}
                            >
                              {pa.id !== "none" ? (
                                <img 
                                  src={pa.image} 
                                  alt={pa.name}
                                  className="w-3/4 h-auto object-contain"
                                  style={{ filter: paInverted ? "invert(1)" : "none" }}
                                />
                              ) : (
                                <span className="text-[10px] text-muted-foreground">None</span>
                              )}
                              {isSelected && pa.id !== "none" && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {parentalAdvisory !== "none" && (
                        <div className="flex gap-2 items-center justify-center mt-2">
                          {/* Position selector - compact buttons */}
                          <div className="flex gap-1">
                            {[
                              { id: "bottom-left", label: "Left" },
                              { id: "bottom-center", label: "Center" },
                              { id: "bottom-right", label: "Right" },
                            ].map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => setPaPosition(pos.id as typeof paPosition)}
                                className={`py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                                  paPosition === pos.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-foreground/70 hover:bg-secondary/80"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                          <Button
                            variant={paInverted ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaInverted(!paInverted)}
                            className="h-7 text-xs px-3"
                          >
                            Invert
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Colors Section - Square color chips using grid */}
                  {mobileEditTab === "colors" && (
                    <div className="space-y-3">
                      {/* Main Color */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">MAIN COLOR</Label>
                        <div className="grid grid-cols-10 gap-1.5">
                          {colorPalette.map(c => {
                            const isSelected = mainColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setMainColor(isSelected ? "" : c.id)}
                                disabled={isEditing}
                                className={`aspect-square rounded-md transition-all flex items-center justify-center relative ${
                                  isSelected
                                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                    : ""
                                } ${c.id === "black" ? "ring-1 ring-white/50" : ""}`}
                                style={{ 
                                  background: `linear-gradient(160deg, ${c.color} 0%, ${c.color}cc 50%, ${c.color}99 100%)`
                                }}
                                title={c.name}
                              >
                                {isSelected && (
                                  <Check className={`w-3.5 h-3.5 drop-shadow-md ${["white", "yellow"].includes(c.id) ? "text-gray-800" : "text-white"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Accent Color */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">ACCENT COLOR</Label>
                        <div className="grid grid-cols-10 gap-1.5">
                          {colorPalette.map(c => {
                            const isSelected = accentColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setAccentColor(isSelected ? "" : c.id)}
                                disabled={isEditing}
                                className={`aspect-square rounded-md transition-all flex items-center justify-center relative ${
                                  isSelected
                                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                                    : ""
                                } ${c.id === "black" ? "ring-1 ring-white/50" : ""}`}
                                style={{ 
                                  background: `linear-gradient(160deg, ${c.color} 0%, ${c.color}cc 50%, ${c.color}99 100%)`
                                }}
                                title={c.name}
                              >
                                {isSelected && (
                                  <Check className={`w-3.5 h-3.5 drop-shadow-md ${["white", "yellow"].includes(c.id) ? "text-gray-800" : "text-white"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  
                  {/* Custom Instructions Section */}
                  {mobileEditTab === "custom" && (
                    <Textarea
                      placeholder="e.g., 'Change background', 'Zoom in on subject', 'Add dramatic lighting'"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      disabled={isEditing}
                      className="bg-secondary min-h-[72px] max-h-[72px] text-base resize-none"
                    />
                  )}
                </div>
                
                {/* Divider + Action Buttons - Fixed height container to prevent jumping */}
                <div className="border-t border-border/50 mt-4 pt-3 mt-auto">
                  <p className="text-[10px] text-muted-foreground text-center mb-2">
                    Edits must be applied first to appear in download
                  </p>
                  {/* Apply Edit button - full width row */}
                  <Button
                    onClick={handleApplyEdits}
                    disabled={isEditing || isUpscaling || !hasChanges}
                    className="w-full gap-2 h-11 mb-2"
                  >
                    {isEditing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Apply Edit (1 Credit)
                      </>
                    )}
                  </Button>
                  {/* Three buttons row - smaller */}
                  <div className="grid grid-cols-3 gap-2 pb-4">
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing || isUpscaling}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setIsFullscreen(true)}
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing || isUpscaling || !imageUrl}
                    >
                      <Expand className="w-3.5 h-3.5" />
                      Fullscreen
                    </Button>
                    {!upscaledImageUrl ? (
                      <Button
                        onClick={handleUpscale}
                        variant="outline"
                        className="h-9 gap-1 text-xs"
                        disabled={isEditing || isUpscaling}
                      >
                        <ArrowUpFromLine className="w-3.5 h-3.5" />
                        {isUpscaling ? "Upscaling..." : "Upscale"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-9 gap-1 text-xs"
                        disabled
                      >
                        <Check className="w-3.5 h-3.5" />
                        Upscaled
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Mobile Edit History Navigation */}
                {totalVersions > 1 && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Button
                      onClick={handlePrevVersion}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 gap-1"
                      disabled={isEditing || !canGoPrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Undo
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {isAtOriginal ? "Original" : `Edit ${historyIndex}`}
                    </span>
                    <Button
                      onClick={handleNextVersion}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 gap-1"
                      disabled={isEditing || !canGoNext}
                    >
                      Redo
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* DESKTOP LAYOUT */
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left: Cover Preview */}
                <div className="space-y-4">
                  <div className="aspect-square bg-card rounded-xl border border-border overflow-hidden relative">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Lighting Preview Overlays */}
                        {lightings.map(lightingId => {
                          const lightingOption = lightingOptions.find(l => l.id === lightingId);
                          if (!lightingOption?.image) return null;
                          const rotation = lightingRotations[lightingId] || 0;
                          const baseOpacity = lightingOption.opacity || 1;
                          const intensityMultiplier = (lightingIntensities[lightingId] ?? 100) / 100;
                          const finalOpacity = baseOpacity * intensityMultiplier;
                          return (
                            <div 
                              key={lightingId}
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                backgroundImage: `url(${lightingOption.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                mixBlendMode: getCssMixBlendMode(lightingOption.blendMode) || 'screen',
                                opacity: finalOpacity,
                                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                              }}
                            />
                          );
                        })}
                        
                        {/* Texture Preview Overlays */}
                        {textures.map(textureId => {
                          const textureOption = textureOptions.find(t => t.id === textureId);
                          if (!textureOption?.image) return null;
                          const baseOpacity = textureOption.opacity || 0.5;
                          const intensityMultiplier = (textureIntensities[textureId] ?? 50) / 40;
                          const finalOpacity = Math.min(baseOpacity * intensityMultiplier, 1);
                          const rotation = textureRotations[textureId] || 0;
                          return (
                            <div 
                              key={textureId}
                              className="absolute inset-0 pointer-events-none"
                              style={{ 
                                backgroundImage: `url(${textureOption.image})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                mixBlendMode: getCssMixBlendMode(textureOption.blendMode) || 'overlay',
                                opacity: finalOpacity,
                                transform: rotation ? `rotate(${rotation}deg)` : undefined,
                              }}
                            />
                          );
                        })}
                        
                        {/* Color Filter Overlays - Real-time preview */}
                        {mainColor && getColorHex(mainColor) && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ 
                              backgroundColor: getColorHex(mainColor),
                              mixBlendMode: 'overlay',
                              opacity: 0.45,
                            }}
                          />
                        )}
                        {accentColor && getColorHex(accentColor) && (
                          <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ 
                              background: `
                                radial-gradient(ellipse at 15% 85%, ${getColorHex(accentColor)} 0%, transparent 35%),
                                radial-gradient(ellipse at 85% 15%, ${getColorHex(accentColor)} 0%, transparent 35%),
                                radial-gradient(ellipse at 50% 50%, ${getColorHex(accentColor)}22 0%, transparent 60%)
                              `,
                              mixBlendMode: 'color-dodge',
                              opacity: 0.35,
                            }}
                          />
                        )}
                        
                        {/* Parental Advisory Logo Overlay */}
                        {parentalAdvisory !== "none" && (
                          <div 
                            className={`absolute w-[20%] ${
                              paPosition === "bottom-right" ? "bottom-3 right-3" :
                              paPosition === "bottom-left" ? "bottom-3 left-3" :
                              "bottom-3 left-1/2 -translate-x-1/2"
                            }`}
                          >
                            <img 
                              src={parentalAdvisoryOptions.find(p => p.id === parentalAdvisory)?.image}
                              alt="Parental Advisory"
                              className="w-full h-auto"
                              style={{ filter: paInverted ? "invert(1)" : "none" }}
                            />
                          </div>
                        )}
                        
                        {/* Version indicator */}
                        {editHistory.length > 1 && (
                          <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1">
                            <History className="w-3 h-3" />
                            {isAtOriginal ? "Original" : `Edit ${historyIndex}`}
                          </div>
                        )}
                        
                        {/* Progress overlay during editing */}
                        {isEditing && (
                          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                              <p className="text-lg font-semibold mb-2">Applying edits...</p>
                              <Progress value={progress} className="w-48" />
                              <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
                            </div>
                          </div>
                        )}
                        
                        {/* Progress overlay during upscaling */}
                        {isUpscaling && (
                          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                              <p className="text-lg font-semibold mb-2">Upscaling to HD...</p>
                              <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <CoverSelector onSelect={handleSelectCover} onUpload={handleUploadImage} />
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleApplyEdits}
                      disabled={isEditing || isUpscaling || !hasChanges}
                      className="flex-1 min-w-[200px] gap-2"
                      size="lg"
                    >
                      {isEditing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Apply Edits (1 credit)
                        </>
                      )}
                    </Button>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <Button
                          onClick={handleDownload}
                          variant="outline"
                          size="lg"
                          className="gap-2"
                          disabled={isEditing || isUpscaling}
                        >
                          <Download className="w-4 h-4" />
                          {upscaledImageUrl ? "Download HD" : "Download"}
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center mt-1 max-w-[160px]">
                          Edits must be applied first to appear in download
                        </p>
                      </div>
                      <Button
                        onClick={() => setIsFullscreen(true)}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        disabled={isEditing || isUpscaling || !imageUrl}
                      >
                        <Expand className="w-4 h-4" />
                        Fullscreen
                      </Button>
                      {!upscaledImageUrl && (
                        <Button
                          onClick={handleUpscale}
                          variant="outline"
                          size="lg"
                          className="gap-2"
                          disabled={isEditing || isUpscaling}
                        >
                          <ArrowUpFromLine className="w-4 h-4" />
                          {isUpscaling ? "Upscaling..." : "Upscale HD"}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Version Navigation */}
                  {totalVersions > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        onClick={handlePrevVersion}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1"
                        disabled={isEditing || !canGoPrev}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                      </Button>
                      <span className="text-sm text-muted-foreground px-3">
                        {isAtOriginal ? "Original" : `Edit ${historyIndex}`} / {totalVersions - 1} {totalVersions - 1 === 1 ? "edit" : "edits"}
                      </span>
                      <Button
                        onClick={handleNextVersion}
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground gap-1"
                        disabled={isEditing || !canGoNext}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Revert to original button */}
                  <div className="flex justify-center">
                    <Button
                      onClick={handleRevertToOriginal}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground gap-1"
                      disabled={isEditing || isAtOriginal}
                    >
                      <RotateCcw className="w-3 h-3" />
                      Revert to Original
                    </Button>
                  </div>
                </div>
                
                {/* Right: Editing Options - Tighter layout */}
                <div className="space-y-3">
                  {/* Colors / Color Filters - Visual grid like other sections */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                      <Sun className="w-4 h-4 text-primary" />
                      Color Filters
                    </div>
                    
                    <div className="space-y-2">
                      {/* Main Color */}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Main Color</Label>
                        <div className="grid grid-cols-10 gap-1">
                            {colorPalette.map(c => {
                            const isSelected = mainColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setMainColor(isSelected ? "" : c.id)}
                                disabled={isEditing}
                                className={`aspect-square rounded-md transition-all flex items-center justify-center relative ${
                                  isSelected
                                    ? `ring-2 ring-offset-1 ring-offset-background`
                                    : "hover:scale-105"
                                } ${c.id === "black" ? "ring-1 ring-white/50" : ""}`}
                                style={{ 
                                  background: `linear-gradient(160deg, ${c.color} 0%, ${c.color}cc 50%, ${c.color}99 100%)`,
                                  boxShadow: isSelected ? `0 0 0 2px ${c.color}` : undefined
                                }}
                                title={c.name}
                              >
                                {isSelected && (
                                  <Check className={`w-4 h-4 drop-shadow-md ${["white", "yellow"].includes(c.id) ? "text-gray-800" : "text-white"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {/* Accent Color */}
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Accent Color</Label>
                        <div className="grid grid-cols-10 gap-1">
                          {colorPalette.map(c => {
                            const isSelected = accentColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => setAccentColor(isSelected ? "" : c.id)}
                                disabled={isEditing}
                                className={`aspect-square rounded-md transition-all flex items-center justify-center relative ${
                                  isSelected
                                    ? `ring-2 ring-offset-1 ring-offset-background`
                                    : "hover:scale-105"
                                } ${c.id === "black" ? "ring-1 ring-white/50" : ""}`}
                                style={{ 
                                  background: `linear-gradient(160deg, ${c.color} 0%, ${c.color}cc 50%, ${c.color}99 100%)`,
                                  boxShadow: isSelected ? `0 0 0 2px ${c.color}` : undefined
                                }}
                                title={c.name}
                              >
                                {isSelected && (
                                  <Check className={`w-4 h-4 drop-shadow-md ${["white", "yellow"].includes(c.id) ? "text-gray-800" : "text-white"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Visual selectors row: Textures + Lighting */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Textures - Visual squares (multi-select) */}
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                        <Layers className="w-4 h-4 text-primary" />
                        Textures
                        {textures.length > 0 && <span className="text-primary">({textures.length})</span>}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {textureOptions.filter(t => t.id !== "none").map(t => {
                          const isSelected = textures.includes(t.id);
                          const currentIntensity = textureIntensities[t.id] ?? 50;
                          return (
                            <div key={t.id} className="flex flex-col gap-1">
                              <button
                                onClick={() => {
                                  if (isSelected) {
                                    setTextures(textures.filter(id => id !== t.id));
                                    const { [t.id]: _, ...rest } = textureIntensities;
                                    setTextureIntensities(rest);
                                  } else {
                                    setTextures([...textures, t.id]);
                                  }
                                }}
                                disabled={isEditing}
                                title={t.name}
                                className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center justify-center relative ${
                                  isSelected
                                    ? "border-primary ring-1 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                                style={{ 
                                  background: t.image 
                                    ? `url(${t.image}) center/cover` 
                                    : t.gradient || "var(--secondary)" 
                                }}
                              >
                                {isSelected && (
                                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                                <span className="text-[8px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-0.5 leading-tight">
                                  {t.name}
                                </span>
                              </button>
                              {isSelected && (
                                <div className="flex items-center justify-between gap-1 py-0.5">
                                  <button
                                    onClick={() => {
                                      const newIntensity = Math.max(0, currentIntensity - 25);
                                      setTextureIntensities({ ...textureIntensities, [t.id]: newIntensity });
                                    }}
                                    disabled={isEditing || currentIntensity <= 0}
                                    className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center disabled:opacity-50"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="text-[9px] text-muted-foreground">{currentIntensity}%</span>
                                  <button
                                    onClick={() => {
                                      const newIntensity = Math.min(100, currentIntensity + 25);
                                      setTextureIntensities({ ...textureIntensities, [t.id]: newIntensity });
                                    }}
                                    disabled={isEditing || currentIntensity >= 100}
                                    className="w-6 h-6 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground flex items-center justify-center disabled:opacity-50"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Lighting - Visual squares (multi-select) */}
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                        <Zap className="w-4 h-4 text-primary" />
                        Lighting
                        {lightings.length > 0 && <span className="text-primary">({lightings.length})</span>}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {lightingOptions.filter(l => l.id !== "none").map(l => {
                          const isSelected = lightings.includes(l.id);
                          const currentRotation = lightingRotations[l.id] || 0;
                          const currentIntensity = lightingIntensities[l.id] ?? 100;
                          const isMin = currentIntensity <= 25;
                          const isMax = currentIntensity >= 100;
                          return (
                            <div key={l.id} className="flex flex-col gap-1">
                              <button
                                onClick={() => {
                                  if (isSelected) {
                                    setLightings(lightings.filter(id => id !== l.id));
                                    const { [l.id]: _, ...rest } = lightingRotations;
                                    setLightingRotations(rest);
                                    const { [l.id]: __, ...restIntensity } = lightingIntensities;
                                    setLightingIntensities(restIntensity);
                                  } else {
                                    setLightings([...lightings, l.id]);
                                    setLightingIntensities({ ...lightingIntensities, [l.id]: 100 });
                                  }
                                }}
                                disabled={isEditing}
                                title={l.name}
                                className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center justify-center relative ${
                                  isSelected
                                    ? "border-primary ring-1 ring-primary"
                                    : "border-border hover:border-primary/50"
                                }`}
                                style={{ 
                                  background: l.image 
                                    ? `url(${l.image}) center/cover` 
                                    : l.gradient || "var(--secondary)" 
                                }}
                              >
                                {isSelected && (
                                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                  </div>
                                )}
                                <span className="text-[8px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-0.5 leading-tight">
                                  {l.name}
                                </span>
                              </button>
                              {isSelected && l.image && (
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => {
                                      const nextRotation = (currentRotation + 90) % 360;
                                      setLightingRotations({ ...lightingRotations, [l.id]: nextRotation });
                                    }}
                                    disabled={isEditing}
                                    className="flex items-center justify-center gap-1 py-1 rounded bg-secondary hover:bg-secondary/80 text-muted-foreground text-[10px] transition-all"
                                  >
                                    <RotateCw className="w-3 h-3" />
                                  </button>
                                  <div className="flex items-center justify-between gap-1 py-0.5">
                                    <button
                                      onClick={() => setLightingIntensities({ ...lightingIntensities, [l.id]: Math.max(25, currentIntensity - 25) })}
                                      disabled={isEditing || isMin}
                                      className={`w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-50 ${isMin ? 'text-destructive' : 'text-muted-foreground'}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <Zap className={`w-3 h-3 ${isMin || isMax ? 'text-destructive' : 'text-muted-foreground'}`} />
                                    <button
                                      onClick={() => setLightingIntensities({ ...lightingIntensities, [l.id]: Math.min(100, currentIntensity + 25) })}
                                      disabled={isEditing || isMax}
                                      className={`w-6 h-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-50 ${isMax ? 'text-destructive' : 'text-muted-foreground'}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  
                  {/* Parental Advisory */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                      <ShieldAlert className="w-4 h-4 text-primary" />
                      Parental Advisory
                    </div>
                    
                    <div className="grid grid-cols-6 gap-1.5 mb-3">
                      {parentalAdvisoryOptions.map(pa => {
                        const isSelected = parentalAdvisory === pa.id;
                        return (
                          <button
                            key={pa.id}
                            onClick={() => setParentalAdvisory(pa.id)}
                            disabled={isEditing}
                            title={pa.name}
                            className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex items-center justify-center relative ${
                              isSelected
                                ? "border-primary ring-1 ring-primary"
                                : "border-border hover:border-primary/50"
                            }`}
                            style={{ 
                              background: pa.id === "none" ? "var(--secondary)" : "#1a1a1a"
                            }}
                          >
                            {pa.id !== "none" ? (
                              <img 
                                src={pa.image} 
                                alt={pa.name}
                                className="w-3/4 h-auto object-contain"
                                style={{ filter: paInverted ? "invert(1)" : "none" }}
                              />
                            ) : (
                              <span className="text-[9px] text-muted-foreground">None</span>
                            )}
                            {isSelected && pa.id !== "none" && (
                              <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-2 h-2 text-primary-foreground" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {parentalAdvisory !== "none" && (
                      <div className="flex gap-2 items-center">
                        <div className="flex gap-1 flex-1">
                          {[
                            { id: "bottom-left", label: "Left" },
                            { id: "bottom-center", label: "Center" },
                            { id: "bottom-right", label: "Right" },
                          ].map(pos => (
                            <button
                              key={pos.id}
                              onClick={() => setPaPosition(pos.id as typeof paPosition)}
                              className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium transition-colors ${
                                paPosition === pos.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground/70 hover:bg-secondary/80"
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                        <Button
                          variant={paInverted ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaInverted(!paInverted)}
                          className="h-8 text-xs"
                        >
                          Invert
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Instructions - Compact */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Custom Instructions
                    </div>
                    
                    <Textarea
                      placeholder="Describe any other edits... (e.g., 'Make background darker', 'Add more contrast')"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      disabled={isEditing}
                      className="bg-secondary min-h-[60px] text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Text Style Variant Dialog */}
      {pendingStyleId && (
        <TextStyleVariantDialog
          open={showVariantDialog}
          onOpenChange={setShowVariantDialog}
          styleId={pendingStyleId}
          styleName={textStyles.find(t => t.id === pendingStyleId)?.name || pendingStyleId}
          onSelectVariant={handleVariantSelect}
          selectedVariantId={selectedVariant?.id}
        />
      )}
      
      {/* Fullscreen Modal */}
      {isFullscreen && imageUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative">
            <div className="rounded-xl overflow-hidden border-2 border-white/30">
              <img
                src={imageUrl}
                alt="Cover fullscreen"
                className="max-w-[90vw] max-h-[80vh] object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <p className="text-white/50 text-xs mt-4">tap anywhere to exit</p>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default EditStudio;
