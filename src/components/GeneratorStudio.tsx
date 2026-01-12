import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Coins, Sparkles, Image, Maximize2, X, Paperclip, Music } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenreBanner } from "@/components/GenreBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { AudioAnalyzer } from "@/components/AudioAnalyzer";
import { DesignerEditDialog } from "@/components/DesignerEditDialog";
import { EditCoverDialog } from "@/components/EditCoverDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TextStyleVariant, getTextStyleVariants, hasVariants } from "@/lib/text-style-variants";
import { Progress } from "@/components/ui/progress";

interface GeneratorStudioProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string, referenceImage?: string, textStyleReferenceImage?: string) => void;
  generatedImage: string | null;
  isGenerating: boolean;
}

const genres = [
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

// Progress stages for generation
const progressStages = [
  { label: "Preparing your cover...", progress: 5 },
  { label: "Generating artwork...", progress: 20 },
  { label: "Creating your vision...", progress: 40 },
  { label: "Rendering details...", progress: 60 },
  { label: "Adding finishing touches...", progress: 80 },
  { label: "Almost ready...", progress: 95 },
];

// Fixed Visual Style options with descriptions
const visualStyles = [
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

// Text style categories for horizontal scroll
const textStyleCategories = ["creative", "dark", "futuristic"];

// Get all variants for all categories
const getAllTextStyleVariants = () => {
  const allVariants: { category: string; variant: TextStyleVariant }[] = [];
  textStyleCategories.forEach(category => {
    if (hasVariants(category)) {
      const variants = getTextStyleVariants(category);
      variants.forEach(variant => {
        allVariants.push({ category, variant });
      });
    }
  });
  return allVariants;
};

export const GeneratorStudio = ({ onGenerate, generatedImage, isGenerating }: GeneratorStudioProps) => {
  const { hasUnlimitedGenerations } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("Hip-Hop / Rap");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [parentalAdvisory] = useState<"yes" | "no">("no");
  
  const [studioMode, setStudioMode] = useState<"create" | "audio">("create");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const textStylesScrollRef = useRef<HTMLDivElement>(null);
  const inspirationInputRef = useRef<HTMLInputElement>(null);
  const [recentCovers, setRecentCovers] = useState<{ id: string; image_url: string }[]>([]);
  const [expandedCover, setExpandedCover] = useState<string | null>(null);
  const [showDesignerEditDialog, setShowDesignerEditDialog] = useState(false);
  const [showEditCoverDialog, setShowEditCoverDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  const allTextStyleVariants = useMemo(() => getAllTextStyleVariants(), []);
  
  const placeholderMessages = [
    { title: "Cover will appear here", subtitle: "Generate to see your cover" },
  ];
  
  const generatingMessages = [
    { title: "Quality takes time", subtitle: "Our advanced AI creates stunning, unique artwork" },
    { title: "Crafting perfection", subtitle: "Every cover is carefully generated for maximum quality" },
    { title: "Almost there", subtitle: "Adding finishing touches to your cover" },
  ];
  
  useEffect(() => {
    if (!isGenerating) {
      setPlaceholderIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % generatingMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isGenerating, generatingMessages.length]);

  const [smoothProgress, setSmoothProgress] = useState(0);
  const generationStartTime = useRef<number | null>(null);
  
  useEffect(() => {
    if (isGenerating) {
      generationStartTime.current = Date.now();
      setProgressStage(0);
      setSmoothProgress(0);
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - (generationStartTime.current || Date.now());
        const targetProgress = Math.min(95, 50 * (1 - Math.exp(-elapsed / 8000)) + 45 * (1 - Math.exp(-elapsed / 25000)));
        setSmoothProgress((prev) => Math.max(prev, targetProgress));
        
        const stageIdx = progressStages.findIndex(s => s.progress > targetProgress);
        setProgressStage(Math.max(0, stageIdx - 1));
      }, 100);
      
      return () => {
        clearInterval(progressInterval);
      };
    } else if (generatedImage) {
      setSmoothProgress(100);
      setProgressStage(progressStages.length - 1);
    } else {
      setProgressStage(0);
      setSmoothProgress(0);
      generationStartTime.current = null;
    }
  }, [isGenerating, generatedImage]);

  useEffect(() => {
    const loadRecent = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke("list-generations", {
          body: { limit: 6, offset: 0 },
        });

        if (error) {
          console.error("Failed to load recent covers (function)", error);
          return;
        }

        const rows = (data?.generations ?? []) as { id: string; image_url: string }[];
        setRecentCovers(
          rows
            .filter((r) => !!r.image_url)
            .map((r) => ({ id: r.id, image_url: r.image_url }))
            .slice(0, 6)
        );
      } catch (e) {
        console.error("Failed to load recent covers", e);
      }
    };
    loadRecent();
  }, [user]);

  const handleGenreChange = (newGenre: string) => {
    setGenre(newGenre);
  };

  const handleInspirationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = 5 - inspirationImages.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Each file must be less than 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setInspirationImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Please enter a song title and artist name.");
      return;
    }

    if (!prompt.trim()) {
      toast.error("Please describe your cover idea.");
      return;
    }

    let textStyleRefImage: string | undefined = undefined;
    
    let fullPrompt = prompt;
    if (songTitle) fullPrompt += ` | Song Title: ${songTitle}`;
    if (artistName) fullPrompt += ` | Artist: ${artistName}`;

    if (inspirationImages.length > 0) {
      fullPrompt += ` | Use the provided inspiration images for visual reference, but ignore any text in them. Only add the song title and artist name provided.`;
    }
    
    if (selectedVariant) {
      if (selectedVariant.promptInstructions) {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: ${selectedVariant.promptInstructions}`;
      } else {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Match the EXACT text style shown in the provided reference image (letterforms, brush strokes, glow, colors, texture).`;
      }

      fullPrompt += ` | ARTIST NAME STYLING: Create a text design for the artist name that complements the chosen song title text style while maintaining visual hierarchy.`;

      const rawRef = selectedVariant.previewImage || selectedVariant.referenceImages?.[0];
      if (rawRef) {
        const normalized = rawRef.startsWith("/") ? rawRef : `/${rawRef}`;
        textStyleRefImage = rawRef.startsWith("http") ? rawRef : `${window.location.origin}${normalized}`;
      }
    } else {
      fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Choose an appropriate and integrated text style for the song title and artist name that fits the overall cover design. The text should feel integrated into the artwork, not just placed on top.`;
    }
    
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    
    fullPrompt += " | CRITICAL: The text (song title and artist name) must be deeply integrated into the cover design, not just overlaid. The text should feel like part of the artwork with effects, textures, or styling that matches the overall aesthetic.";

    const finalStyle = style === "Other" ? customStyle : (style === "None" || !style ? "" : style);
    const finalMood = mood === "None" || !mood ? "" : mood;
    onGenerate(fullPrompt, genre, finalStyle, finalMood, undefined, textStyleRefImage);
  };

  const handleGenerateFromSuggestion = (suggestion: { prompt: string; mood: string; style: string }, suggestedGenre: string) => {
    if (genres.includes(suggestedGenre)) {
      setGenre(suggestedGenre);
    }
    if (visualStyles.some(vs => vs.id === suggestion.style)) {
      setStyle(suggestion.style);
    }
    setMood(suggestion.mood);
    
    let fullPrompt = suggestion.prompt;
    if (songTitle) fullPrompt += ` | Song Title: ${songTitle}`;
    if (artistName) fullPrompt += ` | Artist: ${artistName}`;
    
    let textStyleRefImage: string | undefined = undefined;
    
    if (selectedVariant) {
      if (selectedVariant.promptInstructions) {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: ${selectedVariant.promptInstructions}`;
      } else {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Match the EXACT text style shown in the provided reference image.`;
      }

      fullPrompt += ` | ARTIST NAME STYLING: Create a complementary text design for the artist name.`;

      const rawRef = selectedVariant.previewImage || selectedVariant.referenceImages?.[0];
      if (rawRef) {
        const normalized = rawRef.startsWith("/") ? rawRef : `/${rawRef}`;
        textStyleRefImage = rawRef.startsWith("http") ? rawRef : `${window.location.origin}${normalized}`;
      }
    } else {
      fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Choose an appropriate integrated text style for the song title and artist name.`;
    }
    
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    
    fullPrompt += " | CRITICAL: The text must be deeply integrated into the cover design.";

    onGenerate(fullPrompt, suggestedGenre, suggestion.style, suggestion.mood, undefined, textStyleRefImage);
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cover-art.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = "cover-art.png";
      link.click();
    }
  };

  const handleAudioAnalysisComplete = (result: { suggestedPrompt: string; detectedMood: string; suggestedGenre: string; suggestedStyle: string }) => {
    setPrompt(result.suggestedPrompt);
    setMood(result.detectedMood);
    
    if (genres.includes(result.suggestedGenre)) {
      setGenre(result.suggestedGenre);
    }
    if (visualStyles.some(vs => vs.id === result.suggestedStyle)) {
      setStyle(result.suggestedStyle);
    }
    // Switch to create mode after analysis
    setStudioMode("create");
  };

  const handleSelectTextStyle = (category: string, variant: TextStyleVariant) => {
    setSelectedCategory(category);
    setSelectedVariant(variant);
    toast.success(`Selected: ${variant.name}`);
  };

  const estimatedTime = "~ 45 Seconds";

  const labelClass = "text-primary";
  const mutedLabelClass = "text-foreground/60";
  const textClass = "text-foreground";
  const mutedTextClass = "text-foreground/60";
  const borderClass = "border-border";
  const inputBgClass = "bg-secondary border-border";
  const cardBgClass = "bg-secondary/50 border-border";

  return (
    <section className="py-8 relative z-10 bg-background">
      <div className="container mx-auto px-4">
        {/* Mode Tabs - Centered Above Studio */}
        <div className="max-w-6xl mx-auto mb-6 flex justify-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStudioMode("create")}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                studioMode === "create"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Create Cover
            </button>
            <button
              onClick={() => setStudioMode("audio")}
              disabled={isGenerating}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                studioMode === "audio"
                  ? "bg-foreground text-background"
                  : "text-foreground/60 hover:text-foreground bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <Music className="w-4 h-4" />
              Audio Analyzer
            </button>
          </div>
        </div>

        <div className={`max-w-6xl mx-auto rounded-2xl border p-4 md:p-8 transition-opacity bg-card border-border ${isGenerating ? "opacity-60 pointer-events-none" : ""}`}>
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className={`font-display text-xl md:text-2xl tracking-wide ${textClass}`}>
                        DESIGN STUDIO
                      </h2>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary">
                        {hasUnlimitedGenerations ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-xs font-medium text-green-400">
                              Unlimited
                            </span>
                          </>
                        ) : (
                          <>
                            <Coins className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-foreground">
                              1 Token = 1 Cover
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs md:text-sm ${mutedTextClass}`}>
                      Professional album artwork generation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Analyzer Mode */}
          {studioMode === "audio" && (
            <div className="space-y-6">
              {/* Song Title + Artist Name for Audio Mode */}
              <div className="grid grid-cols-2 gap-3 max-w-xl">
                <div className="space-y-1">
                  <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                    Song Title
                  </label>
                  <Input
                    placeholder="Song title..."
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    disabled={isGenerating}
                    className={`h-10 text-base ${inputBgClass} placeholder:text-foreground/40`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                    Artist Name
                  </label>
                  <Input
                    placeholder="Artist name..."
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    disabled={isGenerating}
                    className={`h-10 text-base ${inputBgClass} placeholder:text-foreground/40`}
                  />
                </div>
              </div>

              {/* Audio Analyzer Component */}
              <div className={`rounded-xl border p-6 ${cardBgClass}`}>
                <AudioAnalyzer 
                  themeMode="dark" 
                  onAnalysisComplete={handleAudioAnalysisComplete}
                  onGenerateSuggestion={handleGenerateFromSuggestion}
                />
              </div>
            </div>
          )}

          {/* Create Cover Mode */}
          {studioMode === "create" && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column - Controls & Prompt */}
              <div className="lg:w-1/2 space-y-4 lg:flex-shrink-0">
                {/* Song Title + Artist Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                      Song Title
                    </label>
                    <Input
                      placeholder="Song title..."
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      disabled={isGenerating}
                      className={`h-10 text-base ${inputBgClass} placeholder:text-foreground/40`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                      Artist Name
                    </label>
                    <Input
                      placeholder="Artist name..."
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      disabled={isGenerating}
                      className={`h-10 text-base ${inputBgClass} placeholder:text-foreground/40`}
                    />
                  </div>
                </div>

                {/* Genre + Visual Style + Mood Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${mutedLabelClass}`}>
                      Genre
                    </label>
                    <Select value={genre} onValueChange={handleGenreChange}>
                      <SelectTrigger className={`h-10 ${inputBgClass}`}>
                        <SelectValue placeholder="Genre" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {genres.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${mutedLabelClass}`}>
                      Style
                    </label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className={`h-10 ${inputBgClass}`}>
                        <SelectValue placeholder="Style" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {visualStyles.map((vs) => (
                          <SelectItem key={vs.id} value={vs.id}>{vs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${mutedLabelClass}`}>
                      Mood
                    </label>
                    <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className={`h-10 ${inputBgClass}`}>
                        <SelectValue placeholder="Mood" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {moodOptions.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {style === "Other" && (
                  <Input
                    placeholder="Describe your custom style..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className={`h-10 ${inputBgClass}`}
                  />
                )}

                {/* Text Style Horizontal Scroll */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                      Text Style
                    </label>
                    {selectedVariant && (
                      <button
                        onClick={() => {
                          setSelectedVariant(null);
                          setSelectedCategory(null);
                        }}
                        className="text-xs text-foreground/60 hover:text-foreground"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                  <div 
                    ref={textStylesScrollRef}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {/* AI Select option */}
                    <button
                      onClick={() => {
                        setSelectedVariant(null);
                        setSelectedCategory(null);
                        toast.success("AI will choose the best text style");
                      }}
                      className={`flex-shrink-0 w-28 h-16 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                        !selectedVariant
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 ${!selectedVariant ? "text-primary" : mutedTextClass}`} />
                      <span className={`text-[10px] font-medium ${!selectedVariant ? textClass : mutedTextClass}`}>AI Select</span>
                    </button>
                    
                    {/* All text style variants */}
                    {allTextStyleVariants.map(({ category, variant }) => (
                      <button
                        key={`${category}-${variant.id}`}
                        onClick={() => handleSelectTextStyle(category, variant)}
                        className={`flex-shrink-0 w-28 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                          selectedVariant?.id === variant.id && selectedCategory === category
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <img 
                          src={variant.previewImage} 
                          alt={variant.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  {selectedVariant && (
                    <p className={`text-xs ${mutedTextClass}`}>
                      Selected: <span className={textClass}>{selectedVariant.name}</span>
                    </p>
                  )}
                </div>

                {/* Prompt Input with Upload Reference inside */}
                <div className="space-y-2">
                  <div className="relative">
                    <Textarea
                      placeholder={`Describe the vibe, imagery, or story of your album...`}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isGenerating}
                      className={`min-h-[120px] resize-none text-base pr-32 ${inputBgClass} placeholder:text-foreground/40`}
                    />
                    {/* Upload Reference link inside textarea */}
                    <button
                      onClick={() => inspirationInputRef.current?.click()}
                      disabled={isGenerating || inspirationImages.length >= 5}
                      className={`absolute bottom-3 right-3 flex items-center gap-1.5 text-sm transition-colors text-foreground/50 hover:text-foreground/80 ${inspirationImages.length >= 5 ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      <Paperclip className="w-4 h-4" />
                      Upload Reference
                    </button>
                    <input
                      ref={inspirationInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={handleInspirationUpload}
                    />
                  </div>
                  
                  {/* Uploaded inspiration images */}
                  {inspirationImages.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      {inspirationImages.map((img, idx) => (
                        <div key={idx} className="relative w-10 h-10">
                          <img src={img} alt={`Reference ${idx + 1}`} className={`w-full h-full object-cover rounded-lg border ${borderClass}`} />
                          <button
                            onClick={() => removeInspirationImage(idx)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <span className={`text-xs ${mutedTextClass}`}>({inspirationImages.length}/5)</span>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${borderClass}`}>
                  <div className={`flex items-center gap-2 text-sm ${mutedTextClass}`}>
                    <Clock className="w-4 h-4" />
                    <span>{estimatedTime}</span>
                  </div>
                  <Button 
                    variant="studio"
                    size="lg" 
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      !songTitle.trim() ||
                      !artistName.trim() ||
                      !prompt.trim()
                    }
                    className="w-full sm:w-auto"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Generate Cover Art
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Right Column - Generated Image or Placeholder */}
              <div className="lg:w-1/2 lg:max-h-full lg:overflow-hidden">
                <div className={`rounded-2xl border p-4 flex flex-col h-full overflow-hidden ${cardBgClass}`}>
                  {generatedImage ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`font-display text-lg tracking-wide ${textClass}`}>YOUR COVER</h3>
                        <div className="flex items-center gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => setShowFullscreen(true)} className="h-8 px-2">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View fullscreen</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <div className="relative flex-1 min-h-0">
                        <div className="aspect-square max-h-full mx-auto rounded-lg overflow-hidden border-2 border-gray-500">
                          <img
                            src={generatedImage}
                            alt="Generated cover art"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="studio"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate("/edit-studio", {
                              state: {
                                imageUrl: generatedImage,
                                genre,
                                style,
                                mood,
                                songTitle: songTitle.trim(),
                                artistName: artistName.trim(),
                              }
                            })}
                            disabled={isGenerating}
                          >
                            Edit Cover
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-center pt-1">
                          <button
                            onClick={() => navigate("/profile")}
                            className="text-xs font-medium transition-colors underline text-foreground/60 hover:text-foreground"
                          >
                            View Past Creations
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex-1 flex items-center justify-center">
                        <div className="aspect-square w-full max-w-[360px] rounded-lg border-2 flex flex-col items-center justify-center text-center mx-auto border-gray-500 bg-secondary/30">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 bg-secondary">
                            <Image className="w-7 h-7 text-foreground/30" />
                          </div>
                          {isGenerating ? (
                            <div className="transition-opacity duration-700 ease-in-out animate-fade-in" key={placeholderIndex}>
                              <h3 className={`font-display text-sm tracking-wide mb-1 ${textClass}`}>
                                {generatingMessages[placeholderIndex]?.title}
                              </h3>
                              <p className={`text-xs px-4 ${mutedTextClass}`}>
                                {generatingMessages[placeholderIndex]?.subtitle}
                              </p>
                            </div>
                          ) : (
                            <>
                              <h3 className={`font-display text-sm tracking-wide mb-1 ${textClass}`}>
                                {placeholderMessages[0].title}
                              </h3>
                              <p className={`text-xs px-4 ${mutedTextClass}`}>
                                {placeholderMessages[0].subtitle}
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {isGenerating && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${textClass}`}>{progressStages[progressStage]?.label}</span>
                            <span className={mutedTextClass}>{Math.round(smoothProgress)}%</span>
                          </div>
                          <Progress value={smoothProgress} className="h-2" />
                        </div>
                      )}

                      {recentCovers.length > 0 && !isGenerating && (
                        <div className="pt-4 text-center">
                          <button
                            onClick={() => navigate("/profile")}
                            className="text-xs font-medium transition-colors underline text-foreground/60 hover:text-foreground"
                          >
                            View Past Creations
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Genre Banner */}
        <div className="max-w-6xl mx-auto mt-6">
          <GenreBanner genre={genre} />
        </div>
      </div>

      {/* Edit Cover Dialog (AI-powered) */}
      <EditCoverDialog
        open={showEditCoverDialog}
        onOpenChange={setShowEditCoverDialog}
        imageUrl={generatedImage}
        onEditComplete={(newImageUrl) => {
          window.dispatchEvent(new CustomEvent('coverEdited', { detail: { imageUrl: newImageUrl } }));
        }}
      />

      {/* Designer Edit Dialog */}
      <DesignerEditDialog
        open={showDesignerEditDialog}
        onOpenChange={setShowDesignerEditDialog}
        imageUrl={generatedImage}
        songTitle={songTitle}
        artistName={artistName}
      />

      {/* Expanded Previous Cover Dialog */}
      <Dialog open={!!expandedCover} onOpenChange={() => setExpandedCover(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Previous Cover</DialogTitle>
          </DialogHeader>
          {expandedCover && (
            <div className="aspect-square w-full rounded-lg overflow-hidden">
              <img
                src={expandedCover}
                alt="Previous cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Cover View */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-4xl bg-black/95 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Your Cover Art</DialogTitle>
          </DialogHeader>
          {generatedImage && (
            <div className="flex flex-col items-center gap-4">
              <div className="aspect-square w-full max-w-2xl rounded-lg overflow-hidden border-2 border-gray-500">
                <img
                  src={generatedImage}
                  alt="Generated cover art"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownload} className="border-gray-600 text-white hover:bg-gray-800">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => setShowFullscreen(false)} className="border-gray-600 text-white hover:bg-gray-800">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
