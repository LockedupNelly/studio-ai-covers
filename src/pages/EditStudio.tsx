import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Download, Sparkles, Palette, Type, Image as ImageIcon, Sun, Layers, Zap, Check, RefreshCw } from "lucide-react";
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

// Parental Advisory sticker options (placeholders)
const parentalAdvisoryOptions = [
  { id: "none", name: "None", preview: null },
  { id: "explicit-black", name: "Explicit (Black)", preview: "/stickers/pa-explicit-black.png" },
  { id: "explicit-white", name: "Explicit (White)", preview: "/stickers/pa-explicit-white.png" },
  { id: "clean", name: "Clean Version", preview: "/stickers/pa-clean.png" },
];

// Texture overlay options (placeholders)
const textureOptions = [
  { id: "none", name: "None", preview: null },
  { id: "grain", name: "Film Grain", preview: "/textures/grain.png" },
  { id: "vintage", name: "Vintage Paper", preview: "/textures/vintage.png" },
  { id: "noise", name: "Noise", preview: "/textures/noise.png" },
  { id: "scratches", name: "Scratches", preview: "/textures/scratches.png" },
];

// Light leak options (placeholders)
const lightLeakOptions = [
  { id: "none", name: "None", preview: null },
  { id: "warm", name: "Warm Glow", preview: "/lightleaks/warm.png" },
  { id: "cool", name: "Cool Blue", preview: "/lightleaks/cool.png" },
  { id: "rainbow", name: "Rainbow", preview: "/lightleaks/rainbow.png" },
  { id: "sunset", name: "Sunset", preview: "/lightleaks/sunset.png" },
];

const EditStudio = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get passed state from navigation
  const passedState = location.state as EditState | null;
  
  const [imageUrl, setImageUrl] = useState<string>(passedState?.imageUrl || "");
  const [originalImageUrl] = useState<string>(passedState?.imageUrl || "");
  
  // Editing options
  const [style, setStyle] = useState(passedState?.style || "None");
  const [mood, setMood] = useState(passedState?.mood || "None");
  const [textStyle, setTextStyle] = useState(passedState?.textStyle || "");
  const [mainColor, setMainColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [parentalAdvisory, setParentalAdvisory] = useState("none");
  const [texture, setTexture] = useState("none");
  const [lightLeak, setLightLeak] = useState("none");
  const [customInstructions, setCustomInstructions] = useState("");
  
  // Text style variant
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [pendingStyleId, setPendingStyleId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  
  // Progress state
  const [isEditing, setIsEditing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null);
  
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
    
    if (style && style !== "None") {
      instructions.push(`Change the visual style to ${style}`);
    }
    
    if (mood && mood !== "None") {
      instructions.push(`Adjust the mood/vibe to feel more ${mood}`);
    }
    
    if (mainColor) {
      instructions.push(`Make the main/dominant color ${getColorValue(mainColor)}`);
    }
    
    if (accentColor) {
      instructions.push(`Add ${getColorValue(accentColor)} as an accent color`);
    }
    
    if (textStyle && selectedVariant) {
      instructions.push(`Restyle the text/typography to match a ${textStyle} ${selectedVariant.name} style`);
    } else if (textStyle) {
      instructions.push(`Restyle the text/typography to be more ${textStyle}`);
    }
    
    if (parentalAdvisory !== "none") {
      const paOption = parentalAdvisoryOptions.find(p => p.id === parentalAdvisory);
      if (paOption) {
        instructions.push(`Add a ${paOption.name} parental advisory sticker in the bottom corner`);
      }
    }
    
    if (texture !== "none") {
      const textureOption = textureOptions.find(t => t.id === texture);
      if (textureOption) {
        instructions.push(`Apply a ${textureOption.name} texture overlay to the entire image`);
      }
    }
    
    if (lightLeak !== "none") {
      const lightLeakOption = lightLeakOptions.find(l => l.id === lightLeak);
      if (lightLeakOption) {
        instructions.push(`Add a ${lightLeakOption.name} light leak effect`);
      }
    }
    
    if (customInstructions.trim()) {
      instructions.push(customInstructions.trim());
    }
    
    return instructions.join(". ");
  };
  
  const handleApplyEdits = async () => {
    const instructions = buildEditInstructions();
    
    if (!instructions) {
      toast.error("No changes selected", { description: "Please select at least one edit to apply" });
      return;
    }
    
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
      const { data, error } = await supabase.functions.invoke("edit-cover", {
        body: {
          imageUrl: originalImageUrl,
          instructions: instructions,
        },
      });
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        setProgress(100);
        setEditedImageUrl(data.imageUrl);
        setImageUrl(data.imageUrl);
        toast.success("Edits applied!", { description: "Your cover has been updated" });
      } else {
        throw new Error("No image returned from edit");
      }
    } catch (error) {
      console.error("Edit error:", error);
      toast.error("Edit failed", { 
        description: error instanceof Error ? error.message : "Could not apply edits" 
      });
    } finally {
      clearInterval(progressInterval);
      setIsEditing(false);
    }
  };
  
  const handleDownload = async () => {
    const downloadUrl = editedImageUrl || imageUrl;
    if (!downloadUrl) return;
    
    try {
      const res = await fetch(downloadUrl);
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
  
  const handleReset = () => {
    setStyle("None");
    setMood("None");
    setTextStyle("");
    setMainColor("");
    setAccentColor("");
    setParentalAdvisory("none");
    setTexture("none");
    setLightLeak("none");
    setCustomInstructions("");
    setSelectedVariant(null);
    setImageUrl(originalImageUrl);
    setEditedImageUrl(null);
  };
  
  const handleVariantSelect = (variant: TextStyleVariant) => {
    if (pendingStyleId) {
      setTextStyle(pendingStyleId);
      setSelectedVariant(variant);
    }
    setShowVariantDialog(false);
    setPendingStyleId(null);
  };
  
  const hasChanges = style !== "None" || mood !== "None" || textStyle || mainColor || accentColor || 
    parentalAdvisory !== "none" || texture !== "none" || lightLeak !== "none" || customInstructions.trim();
  
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
                        Apply Edits
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
                
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  disabled={isEditing}
                >
                  Reset All Changes
                </Button>
              </div>
              
              {/* Right: Editing Options */}
              <div className="space-y-6">
                {/* Style & Mood */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Palette className="w-4 h-4 text-primary" />
                    Style & Mood
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Visual Style</Label>
                      <Select value={style} onValueChange={setStyle} disabled={isEditing}>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          {visualStyles.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mood / Vibe</Label>
                      <Select value={mood} onValueChange={setMood} disabled={isEditing}>
                        <SelectTrigger className="bg-secondary">
                          <SelectValue placeholder="Select mood" />
                        </SelectTrigger>
                        <SelectContent>
                          {moodOptions.map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Colors */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Sun className="w-4 h-4 text-primary" />
                    Colors
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Main Color</Label>
                      <ColorPickerPopover
                        value={mainColor}
                        onChange={setMainColor}
                        label="Main Color"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Accent Color</Label>
                      <ColorPickerPopover
                        value={accentColor}
                        onChange={setAccentColor}
                        label="Accent Color"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Text Styling */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Type className="w-4 h-4 text-primary" />
                    Text Styling
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
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
                        className={`relative px-4 py-2 rounded-lg border transition-all ${
                          textStyle === ts.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {ts.name}
                          {selectedVariant && textStyle === ts.id && (
                            <span className="ml-1 text-xs opacity-80">({selectedVariant.name})</span>
                          )}
                        </span>
                        {hasVariants(ts.id) && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground">
                            +
                          </span>
                        )}
                      </button>
                    ))}
                    {textStyle && (
                      <button
                        onClick={() => { setTextStyle(""); setSelectedVariant(null); }}
                        className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Parental Advisory */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Check className="w-4 h-4 text-primary" />
                    Parental Advisory Sticker
                  </div>
                  
                  <RadioGroup
                    value={parentalAdvisory}
                    onValueChange={setParentalAdvisory}
                    className="grid grid-cols-2 gap-3"
                    disabled={isEditing}
                  >
                    {parentalAdvisoryOptions.map(pa => (
                      <div key={pa.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={pa.id} id={`pa-${pa.id}`} />
                        <Label htmlFor={`pa-${pa.id}`} className="cursor-pointer text-sm">
                          {pa.name}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                {/* Textures */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Layers className="w-4 h-4 text-primary" />
                    Texture Overlay
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {textureOptions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTexture(t.id)}
                        disabled={isEditing}
                        className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                          texture === t.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border hover:border-primary/50"
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Light Leaks */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Zap className="w-4 h-4 text-primary" />
                    Light Leak Effect
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {lightLeakOptions.map(l => (
                      <button
                        key={l.id}
                        onClick={() => setLightLeak(l.id)}
                        disabled={isEditing}
                        className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                          lightLeak === l.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary border-border hover:border-primary/50"
                        }`}
                      >
                        {l.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Instructions */}
                <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Custom Instructions
                  </div>
                  
                  <Textarea
                    placeholder="Describe any other edits you'd like... (e.g., 'Make the background darker', 'Add more contrast', 'Change the font to something bolder')"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    disabled={isEditing}
                    className="bg-secondary min-h-[100px]"
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
