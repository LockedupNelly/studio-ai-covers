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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Palette, Type, Image as ImageIcon, Sun, Layers, Zap, Check, RefreshCw, RotateCcw, History, Coins, ChevronLeft, ChevronRight } from "lucide-react";
import { ColorPickerPopover, getColorValue } from "@/components/ColorPickerPopover";
import { TextStyleVariantDialog } from "@/components/TextStyleVariantDialog";
import { hasVariants, TextStyleVariant } from "@/lib/text-style-variants";

interface EditState {
  imageUrl: string;
  genre?: string;
  style?: string;
  mood?: string;
  textStyle?: string;
  prompt?: string;
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
    genre: passedState?.genre || "",
    prompt: passedState?.prompt || "",
  });
  
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
  
  const buildEditInstructions = () => {
    const instructions: string[] = [];
    
    if (style && style !== "None" && style !== currentState.style) {
      instructions.push(`Change the visual style to ${style}`);
    }
    
    if (mood && mood !== "None" && mood !== currentState.mood) {
      instructions.push(`Adjust the mood/vibe to feel more ${mood}`);
    }
    
    if (mainColor) {
      // Be specific: only change text color, not the entire image
      instructions.push(`Change the color of ALL text and typography on the cover to ${getColorValue(mainColor)}. Keep the background imagery and artwork colors the same.`);
    }
    
    if (accentColor) {
      instructions.push(`Add subtle ${getColorValue(accentColor)} accent highlights to smaller text elements or decorative details`);
    }
    
    if (textStyle && selectedVariant && textStyle !== currentState.textStyle) {
      // Use the detailed promptInstructions from the variant for accurate styling
      const stylePrompt = selectedVariant.promptInstructions || selectedVariant.description || `${textStyle} ${selectedVariant.name} style`;
      const colorRule = mainColor
        ? `Use the explicitly requested text color (${getColorValue(mainColor)}).`
        : "Keep the EXACT same text color as the current cover text (sample it from the image); do not recolor the text.";

      instructions.push(
        `TEXT TYPOGRAPHY FULL REPLACE: First, carefully READ and identify the exact words currently shown on the album cover (artist name, song title, any other text). Then ERASE/INPAINT the existing lettering so none of the previous typography/effects remain. Then re-typeset the SAME words in this EXACT typography style: ${stylePrompt}. ${colorRule} Do not blend the old style with the new style—replace it completely.`
      );
    } else if (textStyle && textStyle !== currentState.textStyle) {
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
        return prev + Math.random() * 10;
      });
    }, 500);
    
    try {
      const styleReferenceImageUrl =
        textStyle && selectedVariant && textStyle !== currentState.textStyle
          ? new URL(selectedVariant.previewImage, window.location.origin).toString()
          : null;

      const { data, error } = await supabase.functions.invoke("edit-cover", {
        body: {
          imageUrl: imageUrl,
          instructions: instructions,
          styleReferenceImageUrl,
        },
      });
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        setProgress(100);
        
        // Update history
        const newHistory = [...editHistory.slice(0, historyIndex + 1), data.imageUrl];
        setEditHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        setImageUrl(data.imageUrl);
        
        // Update current state to reflect what was applied
        setCurrentState({
          ...currentState,
          imageUrl: data.imageUrl,
          style: style !== "None" ? style : currentState.style,
          mood: mood !== "None" ? mood : currentState.mood,
          textStyle: textStyle || currentState.textStyle,
        });
        
        // Reset single-use options
        setMainColor("");
        setAccentColor("");
        setParentalAdvisory("none");
        setTexture("none");
        setLighting("none");
        setCustomInstructions("");
        
        toast.success("Edits applied!", { description: "Your cover has been updated and saved" });
      } else {
        throw new Error("No image returned from edit");
      }
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
    if (!imageUrl) return;
    
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cover-art-final.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Downloaded!", { description: "Your final cover has been saved" });
    } catch (error) {
      toast.error("Download failed");
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
  
  const hasChanges = (style !== currentState.style && style !== "None") || 
    (mood !== currentState.mood && mood !== "None") || 
    (textStyle && textStyle !== currentState.textStyle) || 
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
              <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
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
                <div className="flex gap-3">
                  <Button
                    onClick={handleApplyEdits}
                    disabled={isEditing || !hasChanges}
                    className="flex-1 gap-2"
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
                  <Button
                    onClick={handleDownload}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
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
                
                {/* Text Styling - Compact horizontal */}
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase mb-3">
                    <Type className="w-4 h-4 text-primary" />
                    Text Styling
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {textStyles.map(ts => (
                      <button
                        key={ts.id}
                        onClick={() => {
                          if (hasVariants(ts.id)) {
                            setPendingStyleId(ts.id);
                            setShowVariantDialog(true);
                          } else {
                            setTextStyle(ts.id);
                            setSelectedVariant(null);
                          }
                        }}
                        disabled={isEditing}
                        className={`relative px-3 py-1.5 rounded-lg border transition-all text-xs ${
                          textStyle === ts.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-medium">
                          {ts.name}
                          {ts.id === currentState.textStyle && (
                            <span className="ml-1 opacity-60">• current</span>
                          )}
                        </span>
                        {hasVariants(ts.id) && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold bg-destructive text-destructive-foreground">
                            +
                          </span>
                        )}
                      </button>
                    ))}
                    {textStyle && (
                      <button
                        onClick={() => { setTextStyle(""); setSelectedVariant(null); }}
                        className="px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {selectedVariant && (
                    <p className="text-xs text-muted-foreground mt-2">Variant: {selectedVariant.name}</p>
                  )}
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
