import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Palette, Image as ImageIcon, Sun, Layers, Zap, Check, RefreshCw, RotateCcw, History, Coins, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { ColorPickerPopover, getColorValue } from "@/components/ColorPickerPopover";
import { TextStyleVariantDialog } from "@/components/TextStyleVariantDialog";
import { hasVariants, TextStyleVariant } from "@/lib/text-style-variants";

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

// Parental Advisory sticker options with colors
const parentalAdvisoryOptions = [
  { id: "none", name: "None", color: "transparent", border: true },
  { id: "explicit-black", name: "Explicit", color: "#000000", textColor: "#FFFFFF" },
  { id: "explicit-white", name: "Explicit", color: "#FFFFFF", textColor: "#000000" },
  { id: "clean", name: "Clean", color: "#333333", textColor: "#FFFFFF" },
];

// Texture overlay options with gradient previews
const textureOptions = [
  { id: "none", name: "None", gradient: "transparent" },
  { id: "grain", name: "Grain", gradient: "repeating-linear-gradient(45deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 3px)" },
  { id: "vintage", name: "Vintage", gradient: "linear-gradient(135deg, rgba(255,220,180,0.4) 0%, rgba(200,160,120,0.3) 100%)" },
  { id: "noise", name: "Noise", gradient: "repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 2px)" },
  { id: "scratches", name: "Scratches", gradient: "repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 5px)" },
];

// Light/Lighting options with gradient previews
const lightingOptions = [
  { id: "none", name: "None", gradient: "transparent" },
  { id: "warm", name: "Warm", gradient: "linear-gradient(135deg, rgba(255,180,100,0.6) 0%, rgba(255,100,50,0.3) 100%)" },
  { id: "cool", name: "Cool", gradient: "linear-gradient(135deg, rgba(100,150,255,0.6) 0%, rgba(50,100,200,0.3) 100%)" },
  { id: "rainbow", name: "Rainbow", gradient: "linear-gradient(135deg, rgba(255,0,0,0.3) 0%, rgba(255,255,0,0.3) 25%, rgba(0,255,0,0.3) 50%, rgba(0,255,255,0.3) 75%, rgba(255,0,255,0.3) 100%)" },
  { id: "sunset", name: "Sunset", gradient: "linear-gradient(180deg, rgba(255,150,50,0.5) 0%, rgba(255,50,100,0.4) 50%, rgba(100,50,150,0.3) 100%)" },
];

const EditStudio = () => {
  const { user, loading } = useAuth();
  const { credits, refetch: refetchCredits, hasUnlimitedGenerations } = useCredits();
  const { compositeAndUpload, isCompositing } = useTextLayerCompositing();
  const navigate = useNavigate();
  const location = useLocation();
  
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
  const [parentalAdvisory, setParentalAdvisory] = useState("none");
  const [texture, setTexture] = useState("none");
  const [lighting, setLighting] = useState("none");
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
  
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  
  useEffect(() => {
    if (!passedState?.imageUrl) {
      toast.error("No cover to edit", { description: "Please select a cover first" });
      navigate("/profile");
    }
  }, [passedState, navigate]);
  
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
      instructions.push(`Apply ${getColorValue(mainColor)} as the PRIMARY color grade and lighting mood across the entire cover artwork and typography. This should behave like a cinematic color filter applied to the full composition (background imagery, lighting, atmosphere, objects, AND text together). The main color may influence: overall lighting temperature and mood, environmental tones and atmosphere, reflections and highlights on objects, typography color so it harmonizes with the scene, subtle color grading across the entire image. IMPORTANT CONSTRAINTS: Preserve contrast, depth, and readability. Do NOT flatten the image or remove dynamic lighting. Do NOT fully monochrome the image. Shadows must remain dark and grounded. Highlights must retain brightness and detail. The image should still feel realistic and cinematic. The main color should guide the mood of the cover, not override structure, composition, or legibility.`);
    }
    
    if (accentColor) {
      instructions.push(`Apply ${getColorValue(accentColor)} as a subtle accent highlight and secondary lighting influence, not a dominant or overriding color. Use it sparingly and selectively (approximately 10–25% of the image). The accent color may subtly influence elements where color would naturally appear, such as: light sources or glow-emitting areas, reflections on materials (metal, glass, water, surfaces), atmospheric depth or ambient light interaction, select decorative or secondary details, limited portions of typography or objects. This influence must feel natural, cinematic, and physically motivated (e.g. light spill, reflection, glow falloff), not graphic, outlined, or artificially overlaid. IMPORTANT CONSTRAINTS: Accent color must NOT replace the original color palette. Accent color must NOT apply uniformly across the image. Accent color must fade naturally rather than appear flat or solid. Shadows and midtones should remain largely neutral. Some areas must remain completely unaffected by the accent color. The accent color must NOT: outline all typography or elements, apply global color grading or full-scene color washes, introduce abstract lines, HUD elements, waveforms, or graphic shapes, override the base lighting, contrast, or mood. The original composition, lighting hierarchy, and base palette must remain dominant.`);
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
    
    if (parentalAdvisory !== "none") {
      const paOption = parentalAdvisoryOptions.find(p => p.id === parentalAdvisory);
      if (paOption) {
        instructions.push(`Add a ${paOption.name} parental advisory sticker in the bottom-right corner of the cover`);
      }
    }
    
    if (texture !== "none") {
      const textureOption = textureOptions.find(t => t.id === texture);
      if (textureOption) {
        instructions.push(`Apply a subtle ${textureOption.name} texture overlay across the entire image`);
      }
    }
    
    if (lighting !== "none") {
      const lightingOption = lightingOptions.find(l => l.id === lighting);
      if (lightingOption) {
        instructions.push(`Add a ${lightingOption.name} lighting effect / light leak to enhance the atmosphere`);
      }
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
      parentalAdvisory !== "none" ||
      texture !== "none" ||
      lighting !== "none" ||
      customInstructions.trim();
    
    return hasTextStyleChange && !hasVisualEdits;
  };

  // Check if we have text metadata for text layer mode
  const hasTextMetadata = !!(currentState.songTitle || currentState.artistName);

  const handleApplyEdits = async () => {
    const instructions = buildEditInstructions();
    
    if (!instructions) {
      toast.error("No changes selected", { description: "Please select at least one edit to apply" });
      return;
    }
    
    // Check and deduct credit first
    const creditOk = await deductCredit();
    if (!creditOk) return;
    
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
      
      let finalImageUrl: string;
      
      if (useTextLayerMode) {
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
      } else {
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
      setParentalAdvisory("none");
      setTexture("none");
      setLighting("none");
      setCustomInstructions("");
      
      toast.success("Edits applied!", { 
        description: textOnlyEdit 
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = upscaledImageUrl ? "cover-art-4k.png" : "cover-art-final.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded!", { description: upscaledImageUrl ? "4K HD cover saved" : "Your final cover has been saved" });
    } catch (error) {
      toast.error("Download failed");
    }
  };
  
  const handleUpscale = async () => {
    if (!imageUrl || isUpscaling) return;
    
    setIsUpscaling(true);
    try {
      const { data, error } = await supabase.functions.invoke("upscale-cover", {
        body: { imageUrl },
      });
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        setUpscaledImageUrl(data.imageUrl);
        toast.success("Cover upscaled to 4K HD!", {
          description: "Your cover is now 4096x4096 resolution.",
        });
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
    parentalAdvisory !== "none" || texture !== "none" || lighting !== "none" || 
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
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
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
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex-1">
                <h1 className="font-display text-3xl tracking-wide">EDIT STUDIO</h1>
                <p className="text-muted-foreground text-sm">Finalize your cover with custom edits</p>
              </div>
              <div className="flex items-center gap-2 text-sm bg-secondary px-3 py-1.5 rounded-lg">
                <Coins className="w-4 h-4 text-primary" />
                <span>{hasUnlimitedGenerations ? "Unlimited" : `${credits ?? 0} credits`}</span>
              </div>
            </div>
            
            {/* Main Layout: Cover on left, Options on right */}
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left: Cover Preview */}
              <div className="space-y-4">
                <div className="aspect-square bg-card rounded-xl border border-border overflow-hidden relative">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
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
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                      disabled={isEditing || isUpscaling}
                    >
                      <Download className="w-4 h-4" />
                      {upscaledImageUrl ? "Download 4K" : "Download"}
                    </Button>
                    {!upscaledImageUrl && (
                      <Button
                        onClick={handleUpscale}
                        variant="outline"
                        size="lg"
                        className="gap-2"
                        disabled={isEditing || isUpscaling}
                      >
                        <Maximize2 className="w-4 h-4" />
                        {isUpscaling ? "Upscaling..." : "Upscale to 4K"}
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
                {/* Style & Mood - Combined row */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                    <Palette className="w-4 h-4 text-primary" />
                    Style & Mood
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Visual Style</Label>
                      <Select value={style} onValueChange={setStyle} disabled={isEditing}>
                        <SelectTrigger className="bg-secondary h-9">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          {visualStyles.map(s => (
                            <SelectItem key={s} value={s}>
                              {s}
                              {s === currentState.style && s !== "None" && (
                                <span className="ml-2 text-muted-foreground text-xs">• current</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mood / Vibe</Label>
                      <Select value={mood} onValueChange={setMood} disabled={isEditing}>
                        <SelectTrigger className="bg-secondary h-9">
                          <SelectValue placeholder="Select mood" />
                        </SelectTrigger>
                        <SelectContent>
                          {moodOptions.map(m => (
                            <SelectItem key={m} value={m}>
                              {m}
                              {m === currentState.mood && m !== "None" && (
                                <span className="ml-2 text-muted-foreground text-xs">• current</span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Colors - Compact */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                    <Sun className="w-4 h-4 text-primary" />
                    Colors
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Main Color</Label>
                      <ColorPickerPopover value={mainColor} onChange={setMainColor} label="Main" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Accent Color</Label>
                      <ColorPickerPopover value={accentColor} onChange={setAccentColor} label="Accent" />
                    </div>
                  </div>
                </div>
                
                
                {/* Visual selectors row: Textures + Lighting */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Textures - Visual squares */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                      <Layers className="w-4 h-4 text-primary" />
                      Texture
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5">
                      {textureOptions.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setTexture(t.id)}
                          disabled={isEditing}
                          title={t.name}
                          className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                            texture === t.id
                              ? "border-primary ring-1 ring-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{ background: t.id === "none" ? "var(--secondary)" : t.gradient }}
                        >
                          {t.id === "none" && (
                            <span className="text-[10px] text-muted-foreground">None</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Lighting - Visual squares */}
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                      <Zap className="w-4 h-4 text-primary" />
                      Lighting
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5">
                      {lightingOptions.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setLighting(l.id)}
                          disabled={isEditing}
                          title={l.name}
                          className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                            lighting === l.id
                              ? "border-primary ring-1 ring-primary"
                              : "border-border hover:border-primary/50"
                          }`}
                          style={{ background: l.id === "none" ? "var(--secondary)" : l.gradient }}
                        >
                          {l.id === "none" && (
                            <span className="text-[10px] text-muted-foreground">None</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Parental Advisory - Visual rectangles */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                    <Check className="w-4 h-4 text-primary" />
                    Parental Advisory
                  </div>
                  
                  <div className="flex gap-2">
                    {parentalAdvisoryOptions.map(pa => (
                      <button
                        key={pa.id}
                        onClick={() => setParentalAdvisory(pa.id)}
                        disabled={isEditing}
                        title={pa.name}
                        className={`h-8 px-3 rounded border-2 transition-all flex items-center justify-center text-[9px] font-bold uppercase tracking-wide ${
                          parentalAdvisory === pa.id
                            ? "border-primary ring-1 ring-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                        style={{ 
                          backgroundColor: pa.id === "none" ? "var(--secondary)" : pa.color,
                          color: pa.textColor || "var(--muted-foreground)"
                        }}
                      >
                        {pa.id === "none" ? "None" : pa.name}
                      </button>
                    ))}
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
      
      <Footer />
    </div>
  );
};

export default EditStudio;
