import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { useTextLayerCompositing } from "@/hooks/useTextLayerCompositing";
import { useTextureCompositing } from "@/hooks/useTextureCompositing";
import { useCoverPreview } from "@/hooks/useCoverPreview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Palette, Image as ImageIcon, Sun, Layers, Zap, Check, RefreshCw, RotateCcw, RotateCw, History, Coins, ChevronLeft, ChevronRight, Minus, Plus, ShieldAlert, Expand } from "lucide-react";
import { IntensityBar } from "@/components/IntensityIcon";
import { colorPalette, getColorValue, getColorHex } from "@/components/ColorPickerPopover";
import { TextStyleVariantDialog } from "@/components/TextStyleVariantDialog";
import { hasVariants, TextStyleVariant } from "@/lib/text-style-variants";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { CoverSelector } from "@/components/CoverSelector";
import { downloadImage, isMobileDevice } from "@/lib/download-utils";
import { SEO } from "@/components/SEO";
import {
  visualStyles,
  moodOptions,
  textStyleCategories as textStyles,
  textureOptions,
  lightingOptions,
  parentalAdvisoryOptions,
  getCssMixBlendMode,
  type BlendMode,
  type TextureOption,
  type LightingOption,
  type ParentalAdvisoryOption,
} from "@/lib/studio-config";

interface CoverAnalysis {
  dominantColors?: string[];
  subjectPosition?: string;
  safeTextZones?: string[];
  avoidZones?: string[];
  mood?: string;
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
  hadReferenceImages?: boolean;
  generationId?: string | null;
}

const EditStudio = () => {
  const { user, loading } = useAuth();
  const { credits, refetch: refetchCredits, hasUnlimitedGenerations } = useCredits();
  const { compositeAndUpload, isCompositing } = useTextLayerCompositing();
  const { compositeAllLayers, isCompositing: isApplyingTexture } = useTextureCompositing();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Mobile edit section tabs
  const [mobileEditTab, setMobileEditTab] = useState<"textures" | "lighting" | "pa" | "colors" | "style" | "custom">("textures");
  const mobileTabsRef = useRef<HTMLDivElement>(null);
  
  // Refs for DOM-to-PNG baking (captures the preview exactly as shown)
  const coverPreviewRef = useRef<HTMLDivElement>(null);
  const mobileCoverPreviewRef = useRef<HTMLDivElement>(null);
  
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
    generationId: passedState?.generationId || null,
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
  const [activeTexture, setActiveTexture] = useState<string | null>(null); // Currently focused texture for controls
  const [lightings, setLightings] = useState<string[]>([]);
  const [lightingRotations, setLightingRotations] = useState<Record<string, number>>({}); // Track rotation per lighting ID
  const [lightingIntensities, setLightingIntensities] = useState<Record<string, number>>({}); // Track intensity per lighting ID (25-100)
  const [activeLighting, setActiveLighting] = useState<string | null>(null); // Currently focused lighting for controls
  const [parentalAdvisory, setParentalAdvisory] = useState<string>("none");
  const [paPosition, setPaPosition] = useState<"bottom-right" | "bottom-left" | "bottom-center" | "top-right" | "top-left" | "top-center">("bottom-right");
  const [paSize, setPaSize] = useState<"small" | "medium" | "large">("medium");
  
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paInverted, setPaInverted] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  // Mobile web "Save to Photos" flow (requires a second tap to keep user gesture)
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharePreparing, setSharePreparing] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  
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
  
  // Image loading state (used to prevent dark/blank flashes)
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [committedSrc, setCommittedSrc] = useState<string>(passedState?.imageUrl || "");
  const coverImgRef = useRef<HTMLImageElement | null>(null);
  
  // Build preview config for the unified render pipeline
  const previewConfig = useMemo(() => {
    // Build lighting layers
    const lightingLayers = lightings.map(lightingId => {
      const lightingOption = lightingOptions.find(l => l.id === lightingId);
      const baseOpacity = lightingOption?.opacity || 1;
      const intensityMultiplier = (lightingIntensities[lightingId] ?? 100) / 100;
      return {
        imageUrl: lightingOption?.image || "",
        blendMode: lightingOption?.blendMode || "screen" as const,
        opacity: baseOpacity * intensityMultiplier,
        rotation: lightingRotations[lightingId] || 0,
      };
    }).filter(l => l.imageUrl);
    
    // Build texture layers
    const textureLayers = textures.map(textureId => {
      const textureOption = textureOptions.find(t => t.id === textureId);
      const baseOpacity = textureOption?.opacity || 0.5;
      const intensityMultiplier = (textureIntensities[textureId] ?? 50) / 40;
      return {
        imageUrl: textureOption?.image || "",
        blendMode: textureOption?.blendMode || "overlay" as const,
        opacity: Math.min(baseOpacity * intensityMultiplier, 1),
        rotation: textureRotations[textureId] || 0,
      };
    }).filter(t => t.imageUrl);
    
    // Build color configs  
    const mainColorConfig = mainColor && getColorHex(mainColor) ? {
      hex: getColorHex(mainColor)!,
      opacity: 0.45,
    } : undefined;
    
    const accentColorConfig = accentColor && getColorHex(accentColor) ? {
      hex: getColorHex(accentColor)!,
      opacity: 0.35,
    } : undefined;
    
    // Build parental advisory config
    const paOption = parentalAdvisory !== "none" 
      ? parentalAdvisoryOptions.find(p => p.id === parentalAdvisory) 
      : null;
    const paConfig = paOption?.image ? {
      imageUrl: paOption.image,
      position: paPosition,
      size: paSize,
      inverted: paInverted,
    } : undefined;
    
    return {
      lightings: lightingLayers,
      textures: textureLayers,
      mainColor: mainColorConfig,
      accentColor: accentColorConfig,
      parentalAdvisory: paConfig,
    };
  }, [lightings, lightingIntensities, lightingRotations, textures, textureIntensities, textureRotations, mainColor, accentColor, parentalAdvisory, paPosition, paSize, paInverted]);

  // Use unified canvas preview - WYSIWYG: preview uses same pipeline as Apply/Download
  const { previewUrl, isRendering: isPreviewRendering, hasOverlays } = useCoverPreview({
    baseImageUrl: imageUrl,
    config: previewConfig,
    enabled: !!imageUrl,
    debounceMs: 100,
  });
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  
  // Track the actual image src being displayed (preview takes precedence)
  const displaySrc = previewUrl || imageUrl;

  // Keep the last successfully-loaded image on screen while the next one loads.
  // This prevents the preview from going dark after Apply Edits / history navigation.
  useEffect(() => {
    if (!displaySrc) return;
    if (displaySrc === committedSrc) {
      setIsImageLoaded(true);
      return;
    }

    setIsImageLoaded(false);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setCommittedSrc(displaySrc);
      setIsImageLoaded(true);
    };
    img.onerror = () => {
      // If preload fails, keep showing the last good image instead of going dark.
      setIsImageLoaded(true);
    };
    img.src = displaySrc;
  }, [displaySrc, committedSrc]);
  
  // Handle selecting a cover from the selector  
  const handleSelectCover = (cover: {
    image_url: string;
    song_title?: string | null;
    artist_name?: string | null;
    genre?: string;
    style?: string;
    mood?: string;
    prompt?: string;
    cover_analysis?: CoverAnalysis | null;
  }) => {
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

  // Handle going back to design studio with state restoration
  const handleBackToDesignStudio = () => {
    navigate("/design-studio", {
      state: {
        genre: currentState.genre,
        style: currentState.style !== "None" ? currentState.style : undefined,
        mood: currentState.mood !== "None" ? currentState.mood : undefined,
        textStyle: currentState.textStyle || undefined,
        songTitle: currentState.songTitle || undefined,
        artistName: currentState.artistName || undefined,
        prompt: currentState.prompt || undefined,
        hadReferenceImages: passedState?.hadReferenceImages || false,
      }
    });
  };

  // Handle clearing the selected cover to go back to selector
  const handleBackToSelector = () => {
    setImageUrl("");
    setCurrentState(prev => ({ ...prev, imageUrl: "" }));
    setEditHistory([]);
    setHistoryIndex(0);
    setUpscaledImageUrl(null);
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
    
    // Colors are local overlays only; they should NOT trigger AI edits.

    // Check if text style variant changed (compare full variant ID, not just category)
    const currentVariantId = selectedVariant ? `${textStyle}-${selectedVariant.id}` : null;
    const hasTextStyleChange = currentVariantId && currentVariantId !== currentState.textStyleVariantId;

    if (textStyle && selectedVariant && hasTextStyleChange) {
      // Use the detailed promptInstructions from the variant for accurate styling
      const stylePrompt =
        selectedVariant.promptInstructions ||
        selectedVariant.description ||
        `${textStyle} ${selectedVariant.name} style`;

      const colorRule =
        "Keep the EXACT same text color as the current cover text (sample it from the image); do not recolor the text.";

      instructions.push(
        `TEXT TYPOGRAPHY FULL REPLACE: First, carefully READ and identify the exact words currently shown on the album cover (artist name, song title, any other text). Then ERASE/INPAINT the existing lettering so none of the previous typography/effects remain. Then re-typeset the SAME words in this EXACT typography style: ${stylePrompt}. ${colorRule} Do not blend the old style with the new style—replace it completely.`
      );
    } else if (textStyle && !selectedVariant && textStyle !== currentState.textStyle) {
      // Fallback for text style without variant
      const colorRule =
        "Keep the EXACT same text color as the current cover text (sample it from the image); do not recolor the text.";

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
  const isTextOnlyEdit = (hasTextStyleChange: boolean): boolean => {
    // Text-only if: only text style changed.
    // No: visual style, mood, colors, texture, lighting, parental advisory, custom instructions
    const hasVisualEdits =
      (style !== currentState.style && style !== "None") ||
      (mood !== currentState.mood && mood !== "None") ||
      !!mainColor ||
      !!accentColor ||
      textures.length > 0 ||
      lightings.length > 0 ||
      parentalAdvisory !== "none" ||
      !!customInstructions.trim();

    return hasTextStyleChange && !hasVisualEdits;
  };

  // Check if we have text metadata for text layer mode
  const hasTextMetadata = !!(currentState.songTitle || currentState.artistName);

  // Note: DOM baking removed due to CORS issues with external images
  // Canvas compositing is used instead which handles CORS properly

  const handleApplyEdits = async () => {
    // Prevent rapid clicks while processing
    if (isEditing || isApplyingTexture || isPreviewRendering) {
      return;
    }
    
    const instructions = buildEditInstructions();
    
    // Check if we have canvas-only overlays (applied locally, not via AI)
    const hasCanvasTextures = textures.some(id => {
      const t = textureOptions.find(t => t.id === id);
      return t?.image;
    });
    const hasCanvasLightings = lightings.some(id => {
      const l = lightingOptions.find(l => l.id === id);
      return l?.image;
    });
    const hasColorOverlays = !!(mainColor || accentColor);
    const hasParentalAdvisory = parentalAdvisory !== "none";
    const hasCanvasOverlays = hasCanvasTextures || hasCanvasLightings || hasColorOverlays || hasParentalAdvisory;
    
    // Allow if we have AI instructions OR canvas overlays to apply
    if (!instructions && !hasCanvasOverlays) {
      toast.error("No changes selected", { description: "Please select at least one edit to apply" });
      return;
    }
    
    // For canvas-only edits, ensure we have a valid preview URL
    const isCanvasOnlyEdit = !instructions && hasCanvasOverlays;
    if (isCanvasOnlyEdit && !previewUrl) {
      toast.error("Please wait", { description: "Preview is still rendering, try again in a moment" });
      return;
    }
    
    // ALL Apply Edits actions cost 1 credit
    const creditOk = await deductCredit();
    if (!creditOk) return;
    
    // isCanvasOnlyEdit already defined above
    
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
      const textOnlyEdit = isTextOnlyEdit(hasTextStyleChange);
      
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
            generationId: originalState.generationId || null,
            genre: originalState.genre || null,
            style: originalState.style || null,
            mood: originalState.mood || null,
            prompt: originalState.prompt || null,
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
            generationId: originalState.generationId || null,
            genre: originalState.genre || null,
            style: originalState.style || null,
            mood: originalState.mood || null,
            prompt: originalState.prompt || null,
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
      // If no instructions but hasCanvasOverlays, use the already-rendered preview
      
      // ===== OVERLAY APPLICATION =====
      // For canvas-only edits: The preview is ALREADY rendered at 3000x3000 with exact same pipeline
      // Just use previewUrl directly - no need to re-composite!
      const hasCanvasOverlaysToApply = lightings.length > 0 || textures.length > 0 || 
        (mainColor && getColorHex(mainColor)) || (accentColor && getColorHex(accentColor)) ||
        parentalAdvisory !== "none";
      
      if (hasCanvasOverlaysToApply) {
        setProgress(90);
        
        // For canvas-only edits (no AI instructions), just lock in the preview
        if (isCanvasOnlyEdit && previewUrl) {
          console.log("Locking in preview directly (no re-render needed)");
          finalImageUrl = previewUrl;
        } else {
          // AI edit + overlays: need to composite overlays onto the AI result
          toast.info("Applying overlays...");
          console.log("Applying overlays with canvas compositing", {
            lightings: lightings.length,
            textures: textures.length,
            mainColor: !!mainColor,
            accentColor: !!accentColor,
            parentalAdvisory,
          });
          finalImageUrl = await compositeWithCanvas(finalImageUrl);
        }
      }
      
      // Helper function for canvas compositing
      async function compositeWithCanvas(baseUrl: string): Promise<string> {
        // Build lighting layers
        const lightingLayers = lightings.map(lightingId => {
          const lightingOption = lightingOptions.find(l => l.id === lightingId);
          const baseOpacity = lightingOption?.opacity || 1;
          const intensityMultiplier = (lightingIntensities[lightingId] ?? 100) / 100;
          const layer = {
            imageUrl: lightingOption?.image || "",
            blendMode: lightingOption?.blendMode || "screen" as const,
            opacity: baseOpacity * intensityMultiplier,
            rotation: lightingRotations[lightingId] || 0,
          };
          console.log("Lighting layer:", lightingId, layer);
          return layer;
        }).filter(l => l.imageUrl);
        
        // Build texture layers
        const textureLayers = textures.map(textureId => {
          const textureOption = textureOptions.find(t => t.id === textureId);
          const baseOpacity = textureOption?.opacity || 0.5;
          const intensityMultiplier = (textureIntensities[textureId] ?? 50) / 40;
          const layer = {
            imageUrl: textureOption?.image || "",
            blendMode: textureOption?.blendMode || "overlay" as const,
            opacity: Math.min(baseOpacity * intensityMultiplier, 1),
            rotation: textureRotations[textureId] || 0,
          };
          console.log("Texture layer:", textureId, layer);
          return layer;
        }).filter(t => t.imageUrl);
        
        // Build color configs
        const mainColorConfig = mainColor && getColorHex(mainColor) ? {
          hex: getColorHex(mainColor)!,
          opacity: 0.45,
          blendMode: 'overlay' as const,
        } : undefined;
        
        const accentColorConfig = accentColor && getColorHex(accentColor) ? {
          hex: getColorHex(accentColor)!,
          opacity: 0.35,
          blendMode: 'color-dodge' as const,
        } : undefined;
        
        // Build parental advisory config
        const paOption = parentalAdvisory !== "none" 
          ? parentalAdvisoryOptions.find(p => p.id === parentalAdvisory) 
          : null;
        const paConfig = paOption?.image ? {
          imageUrl: paOption.image,
          position: paPosition,
          size: paSize,
          inverted: paInverted,
        } : undefined;
        
        console.log("Compositing config:", {
          baseUrl: baseUrl.substring(0, 50) + "...",
          lightingLayers: lightingLayers.length,
          textureLayers: textureLayers.length,
          mainColorConfig,
          accentColorConfig,
          paConfig,
        });
        
        // Single-pass compositing - all layers applied at once
        const result = await compositeAllLayers(baseUrl, {
          lightings: lightingLayers,
          textures: textureLayers,
          mainColor: mainColorConfig,
          accentColor: accentColorConfig,
          parentalAdvisory: paConfig,
        });
        
        console.log("Composite result length:", result.length, "starts with:", result.substring(0, 30));
        return result;
      }
      
      setProgress(100);

      // Validate finalImageUrl before saving
      if (!finalImageUrl || finalImageUrl.length < 100) {
        throw new Error("Failed to generate image - result was empty");
      }

      // Persist as a new version so it appears in "My Creations"
      let persistedGenerationId: string | null = null;
      let persistedVersion: number | null = null;

      const activeGenId = currentState.generationId || originalState.generationId;
      if (user && activeGenId) {
        try {
          const blob = await (await fetch(finalImageUrl)).blob();

          // Determine root + next version
          const { data: currentGen, error: currentErr } = await supabase
            .from("generations")
            .select("id, parent_id")
            .eq("id", activeGenId)
            .eq("user_id", user.id)
            .single();

          if (currentErr) throw currentErr;

          const rootId = currentGen.parent_id ?? currentGen.id;

          const { data: lastVersionRow } = await supabase
            .from("generations")
            .select("version")
            .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
            .order("version", { ascending: false })
            .limit(1)
            .maybeSingle();

          const nextVersion = (lastVersionRow?.version ?? 1) + 1;

          // Upload to storage
          const filename = `${user.id}/${Date.now()}-edit-studio-v${nextVersion}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("covers")
            .upload(filename, blob, {
              contentType: blob.type || "image/jpeg",
              upsert: false,
            });
          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("covers").getPublicUrl(filename);
          const publicUrl = urlData.publicUrl;

          const autoEditInstructions =
            instructions?.trim() ||
            (isCanvasOnlyEdit ? "Overlays applied" : textOnlyEdit ? "Text style updated" : "Edited cover");

          // Insert generation version
          const { data: inserted, error: insertError } = await supabase
            .from("generations")
            .insert({
              user_id: user.id,
              parent_id: rootId,
              version: nextVersion,
              edit_instructions: autoEditInstructions,
              image_url: publicUrl,
              prompt: currentState.prompt || originalState.prompt || "",
              genre: currentState.genre || originalState.genre || "",
              style: currentState.style || originalState.style || "None",
              mood: currentState.mood || originalState.mood || "None",
              song_title: currentState.songTitle ?? originalState.songTitle ?? null,
              artist_name: currentState.artistName ?? originalState.artistName ?? null,
              cover_analysis: (currentState.coverAnalysis ?? originalState.coverAnalysis ?? null) as any,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;

          persistedGenerationId = inserted?.id || null;
          persistedVersion = nextVersion;
          finalImageUrl = publicUrl;
        } catch (e) {
          console.error("Auto-save to My Creations failed:", e);
          // Keep the applied edit locally even if saving fails
        }
      }

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
        generationId: persistedGenerationId ?? currentState.generationId,
        style: style !== "None" ? style : currentState.style,
        mood: mood !== "None" ? mood : currentState.mood,
        textStyle: textStyle || currentState.textStyle,
        textStyleVariantId: appliedVariantId || currentState.textStyleVariantId,
      });

      // Reset single-use options (these are now baked into the image)
      setMainColor("");
      setAccentColor("");
      setTextures([]);
      setTextureIntensities({});
      setTextureRotations({});
      setLightings([]);
      setLightingRotations({});
      setLightingIntensities({});
      setParentalAdvisory("none");
      setPaInverted(false);
      setCustomInstructions("");

      toast.success(persistedVersion ? "Saved to My Creations" : "Edits applied!", {
        description: persistedVersion
          ? `Version ${persistedVersion} added to your history`
          : isCanvasOnlyEdit
            ? "Overlays applied"
            : textOnlyEdit
              ? "Text layer updated (background preserved)"
              : "Your cover has been updated",
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
    // IMPORTANT: Download should ONLY download the currently applied image.
    // Pending selections (colors/textures/lighting) must be applied first via "Apply Edits".
    const imageToDownload = imageUrl;
    if (!imageToDownload) return;

    try {
      if (Capacitor.isNativePlatform()) {
        // Native platform - save to filesystem
        try {
          const response = await fetch(imageToDownload);
          const blob = await response.blob();

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            const fileName = `cover-art-3000x3000-${Date.now()}.jpg`;

            try {
              await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Documents,
              });
              toast.success("Saved!", {
                description: "3000x3000 JPEG saved to Documents",
              });
            } catch (fsError) {
              console.error("Filesystem write error:", fsError);
              await downloadImage(imageToDownload, "cover-art", { width: 3000, height: 3000 });
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Native download error:", error);
          await downloadImage(imageToDownload, "cover-art", { width: 3000, height: 3000 });
        }
        return;
      }

      // Mobile web: prepare the file first, then user taps Share (required by iOS gesture rules)
      const canNativeShareFiles =
        isMobileDevice() &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function";

      if (canNativeShareFiles) {
        setSharePreparing(true);
        setShareDialogOpen(true);

        try {
          const res = await fetch(imageToDownload, { cache: "no-store" });
          const blob = await res.blob();
          const fileName = `cover-art-3000x3000-${Date.now()}.jpg`;
          const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
          setShareFile(file);
        } catch (e) {
          console.error("Share preparation failed:", e);
          toast.error("Couldn't prepare share", { description: "Falling back to download" });
          setShareDialogOpen(false);
          setShareFile(null);
          await downloadImage(imageToDownload, "cover-art", { width: 3000, height: 3000 });
        } finally {
          setSharePreparing(false);
        }

        return;
      }

      // Desktop or browsers without share sheet: regular download
      await downloadImage(imageToDownload, "cover-art", { width: 3000, height: 3000 });
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download failed", { description: "Please try again" });
    }
  };

  const handleSaveToCreations = async () => {
    if (!user) {
      toast.error("Please sign in to save");
      return;
    }

    const activeGenId = currentState.generationId || originalState.generationId;
    if (!activeGenId) {
      toast.error("Can't save this yet", {
        description: "Generate a cover first so it can be versioned.",
      });
      return;
    }

    if (!imageUrl) return;

    try {
      // Always bake a high-res 3000x3000 output matching the preview pipeline
      const bakedDataUrl = await compositeAllLayers(imageUrl, previewConfig);
      const blob = await (await fetch(bakedDataUrl)).blob();

      // Determine root + next version
      const { data: currentGen, error: currentErr } = await supabase
        .from("generations")
        .select("id, parent_id")
        .eq("id", activeGenId)
        .eq("user_id", user.id)
        .single();

      if (currentErr) throw currentErr;

      const rootId = currentGen.parent_id ?? currentGen.id;

      const { data: lastVersionRow } = await supabase
        .from("generations")
        .select("version")
        .or(`id.eq.${rootId},parent_id.eq.${rootId}`)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (lastVersionRow?.version ?? 1) + 1;

      // Upload to storage
      const filename = `${user.id}/${Date.now()}-edit-studio-v${nextVersion}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("covers")
        .upload(filename, blob, {
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("covers").getPublicUrl(filename);
      const publicUrl = urlData.publicUrl;

      // Insert generation version
      const { data: inserted, error: insertError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          parent_id: rootId,
          version: nextVersion,
          edit_instructions: "Saved from Edit Studio",
          image_url: publicUrl,
          prompt: currentState.prompt || originalState.prompt || "",
          genre: currentState.genre || originalState.genre || "",
          style: currentState.style || originalState.style || "None",
          mood: currentState.mood || originalState.mood || "None",
          song_title: currentState.songTitle ?? originalState.songTitle ?? null,
          artist_name: currentState.artistName ?? originalState.artistName ?? null,
          cover_analysis: (currentState.coverAnalysis ?? originalState.coverAnalysis ?? null) as any,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      // Update local state so the next save chains correctly
      setCurrentState((prev) => ({
        ...prev,
        imageUrl: publicUrl,
        generationId: inserted?.id || activeGenId,
      }));
      setImageUrl(publicUrl);
      setEditHistory((prev) => [...prev, publicUrl]);
      setHistoryIndex((prev) => prev + 1);

      toast.success("Saved to My Creations", {
        description: `Version ${nextVersion} added to your history`,
      });
    } catch (e: any) {
      console.error("Save to creations failed:", e);
      toast.error("Save failed", {
        description: e?.message || "Please try again",
      });
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
  
  // Determine if the current changes are canvas-only (for internal tracking, but still costs 1 credit)
  const isCanvasOnlyChange = useMemo(() => {
    const hasAIChanges = 
      (style !== currentState.style && style !== "None") || 
      (mood !== currentState.mood && mood !== "None") || 
      hasTextStyleVariantChange ||
      customInstructions.trim();
    
    const hasOverlayChanges = 
      mainColor || accentColor || 
      textures.length > 0 || lightings.length > 0 || 
      parentalAdvisory !== "none";
    
    return !hasAIChanges && hasOverlayChanges;
  }, [style, mood, hasTextStyleVariantChange, customInstructions, mainColor, accentColor, textures, lightings, parentalAdvisory, currentState.style, currentState.mood]);
  
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
    <>
      <SEO pageKey="editStudio" />
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
                onClick={() => navigate("/design-studio", { 
                  state: { 
                    returnedImage: imageUrl,
                    genre: currentState.genre,
                    style: currentState.style,
                    mood: currentState.mood,
                    textStyle: currentState.textStyle,
                    songTitle: currentState.songTitle,
                    artistName: currentState.artistName,
                    hadReferenceImages: passedState?.hadReferenceImages,
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
                    ref={mobileCoverPreviewRef}
                    className="group/cover aspect-square w-[85vw] max-w-[360px] mx-auto bg-card rounded-xl border border-border overflow-hidden relative"
                  >
                    {imageUrl ? (
                      <>
                        {/* Loading skeleton (only while next image is preloading) */}
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
                        )}
                        {/* UNIFIED PREVIEW: Use canvas-rendered preview when available (WYSIWYG) */}
                        {/* This ensures preview matches Apply/Download exactly */}
                        <img
                          ref={coverImgRef}
                          src={committedSrc}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="async"
                        />
                        
                        {/* Preview rendering indicator */}
                        {isPreviewRendering && hasOverlays && (
                          <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] flex items-center gap-1">
                            <div className="w-2 h-2 border border-primary border-t-transparent rounded-full animate-spin" />
                            Rendering...
                          </div>
                        )}
                        
                        {/* Version indicator - excluded from capture */}
                        {editHistory.length > 1 && (
                          <div data-exclude-from-capture="true" className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <History className="w-2.5 h-2.5" />
                            {isAtOriginal ? "Original" : `Edit ${historyIndex}`}
                          </div>
                        )}
                        
                        {/* Change Cover button overlay - excluded from capture */}
                        <button
                          data-exclude-from-capture="true"
                          onClick={handleBackToSelector}
                          disabled={isEditing}
                          className="absolute top-2 right-2 px-2 py-1 rounded-md bg-background/90 backdrop-blur-sm text-[10px] font-medium flex items-center gap-1 transition-all duration-200 disabled:opacity-50 opacity-0 hover:opacity-100 focus:opacity-100 group-hover/cover:opacity-100"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                          Change
                        </button>
                        
                        {/* Progress overlay - excluded from capture */}
                        {isEditing && (
                          <div data-exclude-from-capture="true" className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-xs font-medium">Applying...</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <CoverSelector onSelect={handleSelectCover} />
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
                                  const isActive = textures[textures.length - 1] === t.id;
                                  if (isActive) {
                                    // Already active - remove it
                                    setTextures(textures.filter(id => id !== t.id));
                                    const { [t.id]: _, ...rest } = textureIntensities;
                                    setTextureIntensities(rest);
                                    const { [t.id]: __, ...restRotations } = textureRotations;
                                    setTextureRotations(restRotations);
                                  } else {
                                    // Selected but not active - make it active (move to end)
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
                                    ? "border-white ring-1 ring-white"
                                    : "border-primary ring-1 ring-primary"
                                  : "border-border"
                              }`}
                              style={{
                                width: 'calc((100% - 1rem) / 3.5)',
                                background: !t.image ? "var(--secondary)" : undefined
                              }}
                            >
                              {t.image && (
                                <img 
                                  src={t.image} 
                                  alt={t.name}
                                  loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center z-10">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 w-full text-center truncate z-10">
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
                          <div className="flex items-center justify-center gap-3 py-4">
                            {/* Rotate button */}
                            <button
                              onClick={() => setTextureRotations({ ...textureRotations, [activeTextureId]: (currentRotation + 90) % 360 })}
                              className="w-12 h-12 flex items-center justify-center rounded-lg bg-card border-2 border-white/30 shadow-lg"
                              title="Rotate texture"
                            >
                              <RotateCw className="w-5 h-5 text-white" />
                            </button>
                            {/* Intensity controls */}
                            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 h-12 border-2 border-white/30 shadow-lg">
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
                                  const isActive = lightings[lightings.length - 1] === l.id;
                                  if (isActive) {
                                    // Already active - remove it
                                    setLightings(lightings.filter(id => id !== l.id));
                                    const { [l.id]: _, ...rest } = lightingRotations;
                                    setLightingRotations(rest);
                                    const { [l.id]: __, ...restIntensity } = lightingIntensities;
                                    setLightingIntensities(restIntensity);
                                  } else {
                                    // Selected but not active - make it active (move to end)
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
                                    ? "border-white ring-1 ring-white"
                                    : "border-primary ring-1 ring-primary"
                                  : "border-border"
                              }`}
                              style={{
                                width: 'calc((100% - 1rem) / 3.5)',
                                background: !l.image ? "var(--secondary)" : undefined
                              }}
                            >
                              {l.image && (
                                <img 
                                  src={l.image} 
                                  alt={l.name}
                                  loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                              {isSelected && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center z-10">
                                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                                </div>
                              )}
                              <span className="text-[9px] font-medium text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 w-full text-center truncate z-10">
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
                          <div className="flex items-center justify-center gap-3 py-4">
                            {/* Rotate button */}
                            <button
                              onClick={() => setLightingRotations({ ...lightingRotations, [activeLightingId]: (currentRotation + 90) % 360 })}
                              className="w-12 h-12 flex items-center justify-center rounded-lg bg-card border-2 border-white/30 shadow-lg"
                              title="Rotate lighting"
                            >
                              <RotateCw className="w-5 h-5 text-white" />
                            </button>
                            {/* Intensity controls */}
                            <div className="flex items-center gap-1.5 bg-card rounded-lg px-3 h-12 border-2 border-white/30 shadow-lg">
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
                                  loading="lazy"
                                  decoding="async"
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap mt-2">
                          {/* Size */}
                          <div className="flex items-center gap-1 bg-secondary/50 rounded px-1.5 py-0.5">
                            <span className="text-[9px] text-muted-foreground">Size</span>
                            {[
                              { id: "small", label: "S" },
                              { id: "medium", label: "M" },
                              { id: "large", label: "L" },
                            ].map(size => (
                              <button
                                key={size.id}
                                onClick={() => setPaSize(size.id as typeof paSize)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                                  paSize === size.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {size.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Position */}
                          <div className="flex items-center gap-1 bg-secondary/50 rounded px-1.5 py-0.5">
                            <span className="text-[9px] text-muted-foreground">Pos</span>
                            {[
                              { id: "top", label: "T" },
                              { id: "bottom", label: "B" },
                            ].map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => {
                                  const horizontal = paPosition.includes("left") ? "left" : 
                                                     paPosition.includes("center") ? "center" : "right";
                                  setPaPosition(`${pos.id}-${horizontal}` as typeof paPosition);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                                  paPosition.startsWith(pos.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                            <span className="text-muted-foreground/50">|</span>
                            {[
                              { id: "left", label: "L" },
                              { id: "center", label: "C" },
                              { id: "right", label: "R" },
                            ].map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => {
                                  const vertical = paPosition.startsWith("top") ? "top" : "bottom";
                                  setPaPosition(`${vertical}-${pos.id}` as typeof paPosition);
                                }}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                                  paPosition.includes(pos.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Color */}
                          <button
                            onClick={() => setPaInverted(!paInverted)}
                            className={`px-2 py-0.5 rounded text-[9px] font-medium transition-colors ${
                              paInverted
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/50 text-foreground/70 hover:bg-secondary"
                            }`}
                          >
                            {paInverted ? "White" : "Black"}
                          </button>
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
                    disabled={isEditing || isUpscaling || isApplyingTexture || isPreviewRendering || !hasChanges}
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
                  {/* Two buttons row - smaller */}
                  <div className="grid grid-cols-4 gap-2 pb-4">
                    <Button
                      onClick={handleBackToSelector}
                      variant="ghost"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Change
                    </Button>
                    <Button
                      onClick={handleSaveToCreations}
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing || !imageUrl || !user}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Save
                    </Button>
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                    <Button
                      onClick={() => setIsFullscreen(true)}
                      variant="outline"
                      className="h-9 gap-1 text-xs"
                      disabled={isEditing || !imageUrl}
                    >
                      <Expand className="w-3.5 h-3.5" />
                      Fullscreen
                    </Button>
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
                  <div ref={coverPreviewRef} className="group/cover aspect-square bg-card rounded-xl border border-border overflow-hidden relative">
                    {imageUrl ? (
                      <>
                        {/* Loading skeleton (only while next image is preloading) */}
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
                        )}
                        {/* UNIFIED PREVIEW: Use canvas-rendered preview when available (WYSIWYG) */}
                        {/* This ensures preview matches Apply/Download exactly */}
                        <img
                          ref={coverImgRef}
                          src={committedSrc}
                          alt="Cover preview"
                          className="w-full h-full object-cover"
                          loading="eager"
                          decoding="async"
                        />
                        
                        {/* Preview rendering indicator */}
                        {isPreviewRendering && hasOverlays && (
                          <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1.5 z-10">
                            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Rendering...
                          </div>
                        )}
                        
                        {/* Version indicator - excluded from capture */}
                        {editHistory.length > 1 && (
                          <div data-exclude-from-capture="true" className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1">
                            <History className="w-3 h-3" />
                            {isAtOriginal ? "Original" : `Edit ${historyIndex}`}
                          </div>
                        )}
                        
                        {/* Change Cover button overlay - excluded from capture */}
                        <button
                          data-exclude-from-capture="true"
                          onClick={handleBackToSelector}
                          disabled={isEditing}
                          className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-medium flex items-center gap-1.5 transition-all duration-200 border border-border disabled:opacity-50 opacity-0 hover:opacity-100 focus:opacity-100 group-hover/cover:opacity-100"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          Change Cover
                        </button>
                        
                        {/* Progress overlay during editing - excluded from capture */}
                        {isEditing && (
                          <div data-exclude-from-capture="true" className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                              <p className="text-lg font-semibold mb-2">Applying edits...</p>
                              <Progress value={progress} className="w-48" />
                              <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <CoverSelector onSelect={handleSelectCover} />
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleApplyEdits}
                      disabled={isEditing || isApplyingTexture || isPreviewRendering || !hasChanges}
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
                          Apply Edits (1 Credit)
                        </>
                      )}
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleBackToSelector}
                        variant="ghost"
                        size="lg"
                        className="gap-2"
                        disabled={isEditing}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Change Cover
                      </Button>
                      <div className="flex flex-col items-center">
                        <Button
                          onClick={handleDownload}
                          variant="outline"
                          size="lg"
                          className="gap-2"
                          disabled={isEditing}
                        >
                          <Download className="w-4 h-4" />
                          Download
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
                        disabled={isEditing || !imageUrl}
                      >
                        <Expand className="w-4 h-4" />
                        Fullscreen
                      </Button>
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
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                          <Layers className="w-4 h-4 text-primary" />
                          Textures
                          {textures.length > 0 && <span className="text-primary">({textures.length})</span>}
                        </div>
                        
                        {activeTexture && textures.includes(activeTexture) && (
                          <div className="flex items-center gap-2">
                            {/* Intensity controls - more prominent styling */}
                            <div className="flex items-center gap-1 bg-card border border-white/30 rounded-lg px-2 py-1">
                              <button
                                onClick={() => {
                                  const current = textureIntensities[activeTexture] ?? 50;
                                  setTextureIntensities({ ...textureIntensities, [activeTexture]: Math.max(0, current - 25) });
                                }}
                                disabled={isEditing || (textureIntensities[activeTexture] ?? 50) <= 0}
                                className="w-5 h-5 rounded bg-secondary hover:bg-secondary/80 text-white flex items-center justify-center disabled:opacity-50"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs text-white font-medium min-w-[32px] text-center">{textureIntensities[activeTexture] ?? 50}%</span>
                              <button
                                onClick={() => {
                                  const current = textureIntensities[activeTexture] ?? 50;
                                  setTextureIntensities({ ...textureIntensities, [activeTexture]: Math.min(100, current + 25) });
                                }}
                                disabled={isEditing || (textureIntensities[activeTexture] ?? 50) >= 100}
                                className="w-5 h-5 rounded bg-secondary hover:bg-secondary/80 text-white flex items-center justify-center disabled:opacity-50"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {textureOptions.filter(t => t.id !== "none").map(t => {
                          const isSelected = textures.includes(t.id);
                          const isActive = activeTexture === t.id;
                          return (
                            <button
                              key={t.id}
                              onClick={() => {
                                if (isSelected) {
                                  if (isActive) {
                                    // Already active - remove it
                                    setTextures(textures.filter(id => id !== t.id));
                                    const { [t.id]: _, ...rest } = textureIntensities;
                                    setTextureIntensities(rest);
                                    setActiveTexture(textures.length > 1 ? textures.find(id => id !== t.id) || null : null);
                                  } else {
                                    // Selected but not active - just make it active
                                    setActiveTexture(t.id);
                                    setActiveLighting(null); // Deactivate lighting section
                                  }
                                } else {
                                  // Not selected - add and make active
                                  setTextures([...textures, t.id]);
                                  setTextureIntensities({ ...textureIntensities, [t.id]: 50 });
                                  setActiveTexture(t.id);
                                  setActiveLighting(null); // Deactivate lighting section
                                }
                              }}
                              disabled={isEditing}
                              title={t.name}
                              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center justify-center relative ${
                                isSelected
                                  ? isActive
                                    ? "border-white ring-1 ring-white"
                                    : "border-primary ring-1 ring-primary"
                                  : "border-border hover:border-white/50"
                              }`}
                              style={{ 
                                background: !t.image ? (t.gradient || "var(--secondary)") : undefined
                              }}
                            >
                              {t.image && (
                                <img 
                                  src={t.image} 
                                  alt={t.name}
                                  loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                              <span className="text-[8px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-0.5 leading-tight z-10">
                                {t.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Lighting - Visual squares (multi-select) */}
                    <div className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                          <Zap className="w-4 h-4 text-primary" />
                          Lighting
                          {lightings.length > 0 && <span className="text-primary">({lightings.length})</span>}
                        </div>
                        
                        {activeLighting && lightings.includes(activeLighting) && (() => {
                          const currentRotation = lightingRotations[activeLighting] || 0;
                          const currentIntensity = lightingIntensities[activeLighting] ?? 100;
                          const isMin = currentIntensity <= 25;
                          const isMax = currentIntensity >= 100;
                          return (
                            <div className="flex items-center gap-2">
                              {/* Rotation - more prominent styling */}
                              <button
                                onClick={() => {
                                  const nextRotation = (currentRotation + 90) % 360;
                                  setLightingRotations({ ...lightingRotations, [activeLighting]: nextRotation });
                                }}
                                disabled={isEditing}
                                className="w-6 h-6 rounded bg-card border border-white/30 hover:bg-secondary text-white flex items-center justify-center"
                                title="Rotate lighting"
                              >
                                <RotateCw className="w-3 h-3" />
                              </button>
                              
                              {/* Intensity controls - more prominent styling */}
                              <div className="flex items-center gap-1 bg-card border border-white/30 rounded-lg px-2 py-1">
                                <button
                                  onClick={() => setLightingIntensities({ ...lightingIntensities, [activeLighting]: Math.max(25, currentIntensity - 25) })}
                                  disabled={isEditing || isMin}
                                  className={`w-5 h-5 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-50 ${isMin ? 'text-destructive' : 'text-white'}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <Zap className={`w-3 h-3 ${isMin || isMax ? 'text-destructive' : 'text-white'}`} />
                                <button
                                  onClick={() => setLightingIntensities({ ...lightingIntensities, [activeLighting]: Math.min(100, currentIntensity + 25) })}
                                  disabled={isEditing || isMax}
                                  className={`w-5 h-5 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center disabled:opacity-50 ${isMax ? 'text-destructive' : 'text-white'}`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5">
                        {lightingOptions.filter(l => l.id !== "none").map(l => {
                          const isSelected = lightings.includes(l.id);
                          return (
                            <button
                              key={l.id}
                              onClick={() => {
                                const isActive = activeLighting === l.id;
                                if (isSelected) {
                                  if (isActive) {
                                    // Already active - remove it
                                    setLightings(lightings.filter(id => id !== l.id));
                                    const { [l.id]: _, ...rest } = lightingRotations;
                                    setLightingRotations(rest);
                                    const { [l.id]: __, ...restIntensity } = lightingIntensities;
                                    setLightingIntensities(restIntensity);
                                    setActiveLighting(lightings.length > 1 ? lightings.find(id => id !== l.id) || null : null);
                                  } else {
                                    // Selected but not active - just make it active
                                    setActiveLighting(l.id);
                                    setActiveTexture(null); // Deactivate texture section
                                  }
                                } else {
                                  // Not selected - add and make active
                                  setLightings([...lightings, l.id]);
                                  setLightingIntensities({ ...lightingIntensities, [l.id]: 100 });
                                  setActiveLighting(l.id);
                                  setActiveTexture(null); // Deactivate texture section
                                }
                              }}
                              disabled={isEditing}
                              title={l.name}
                              className={`aspect-square rounded-lg border-2 transition-all overflow-hidden flex flex-col items-center justify-center relative ${
                                isSelected
                                  ? activeLighting === l.id
                                    ? "border-white ring-1 ring-white"
                                    : "border-primary ring-1 ring-primary"
                                  : "border-border hover:border-white/50"
                              }`}
                              style={{ 
                                background: !l.image ? (l.gradient || "var(--secondary)") : undefined
                              }}
                            >
                              {l.image && (
                                <img 
                                  src={l.image} 
                                  alt={l.name}
                                  loading="lazy"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                              <span className="text-[8px] font-medium text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center px-0.5 leading-tight z-10">
                                {l.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  
                  {/* Parental Advisory */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                        <ShieldAlert className="w-4 h-4 text-primary" />
                        Parental Advisory
                      </div>
                      
                      {parentalAdvisory !== "none" && (
                        <div className="flex items-center gap-3">
                          {/* Size */}
                          <div className="flex items-center gap-1.5 bg-secondary/50 rounded px-2 py-1">
                            <span className="text-[10px] text-muted-foreground">Size</span>
                            {[
                              { id: "small", label: "S" },
                              { id: "medium", label: "M" },
                              { id: "large", label: "L" },
                            ].map(size => (
                              <button
                                key={size.id}
                                onClick={() => setPaSize(size.id as typeof paSize)}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  paSize === size.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {size.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Position */}
                          <div className="flex items-center gap-1.5 bg-secondary/50 rounded px-2 py-1">
                            <span className="text-[10px] text-muted-foreground">Pos</span>
                            {[
                              { id: "top", label: "T" },
                              { id: "bottom", label: "B" },
                            ].map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => {
                                  const horizontal = paPosition.includes("left") ? "left" : 
                                                     paPosition.includes("center") ? "center" : "right";
                                  setPaPosition(`${pos.id}-${horizontal}` as typeof paPosition);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  paPosition.startsWith(pos.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                            <span className="text-muted-foreground/50 mx-0.5">|</span>
                            {[
                              { id: "left", label: "L" },
                              { id: "center", label: "C" },
                              { id: "right", label: "R" },
                            ].map(pos => (
                              <button
                                key={pos.id}
                                onClick={() => {
                                  const vertical = paPosition.startsWith("top") ? "top" : "bottom";
                                  setPaPosition(`${vertical}-${pos.id}` as typeof paPosition);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  paPosition.includes(pos.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "text-foreground/70 hover:bg-secondary"
                                }`}
                              >
                                {pos.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* Color */}
                          <button
                            onClick={() => setPaInverted(!paInverted)}
                            className={`px-3 py-1 rounded text-[10px] font-medium transition-colors ${
                              paInverted
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary/50 text-foreground/70 hover:bg-secondary"
                            }`}
                          >
                            {paInverted ? "White" : "Black"}
                          </button>
                        </div>
                      )}
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
                                loading="lazy"
                                decoding="async"
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

      {/* Mobile web: Share sheet dialog (Save to Photos / AirDrop) */}
      <Dialog
        open={shareDialogOpen}
        onOpenChange={(open) => {
          setShareDialogOpen(open);
          if (!open) {
            setShareFile(null);
            setSharePreparing(false);
          }
        }}
      >
        <DialogContent className="max-w-sm border-2 border-zinc-400/60 text-center">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Save to Photos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              {sharePreparing
                ? "Preparing your image…"
                : "Tap Save to open your phone's save options (Photos, AirDrop, etc.)."}
            </p>
            <div className="flex justify-center">
              <Button
                type="button"
                disabled={sharePreparing || !shareFile}
                onClick={async () => {
                  if (!shareFile) return;
                  try {
                    await navigator.share({ files: [shareFile], title: "Cover Art" });
                    setShareDialogOpen(false);
                    setShareFile(null);
                  } catch (e) {
                    const err = e as Error;
                    if (err?.name !== "AbortError") {
                      toast.error("Share failed", { description: "Try again or use Download" });
                    }
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
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
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
          <p className="text-white/50 text-xs mt-4">tap anywhere to exit</p>
        </div>
      )}
      
      <Footer />
    </div>
    </>
  );
};

export default EditStudio;
