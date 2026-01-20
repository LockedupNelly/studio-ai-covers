import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Coins, Sparkles, Image, Maximize2, X, Paperclip, Music, RotateCcw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { TextStyleThumbnail } from "@/components/TextStyleThumbnail";
import { Progress } from "@/components/ui/progress";
import { downloadImage } from "@/lib/download-utils";
import { 
  genres, 
  visualStylesWithDescriptions as visualStyles, 
  moodOptions, 
  textStyleCategoryIds as textStyleCategories,
  progressStages 
} from "@/lib/studio-config";

interface GeneratorStudioProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string, referenceImages?: string[], textStyleReferenceImage?: string) => void;
  generatedImage: string | null;
  generationId: string | null;
  isGenerating: boolean;
  initialState?: {
    genre?: string;
    style?: string;
    mood?: string;
    textStyle?: string;
    songTitle?: string;
    artistName?: string;
    prompt?: string;
    hadReferenceImages?: boolean;
  };
}

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

export const GeneratorStudio = ({ onGenerate, generatedImage, generationId, isGenerating, initialState }: GeneratorStudioProps) => {
  const { hasUnlimitedGenerations } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(initialState?.prompt || "");
  const [songTitle, setSongTitle] = useState(initialState?.songTitle || "");
  const [artistName, setArtistName] = useState(initialState?.artistName || "");
  const [genre, setGenre] = useState(initialState?.genre || "HipHop");
  const [style, setStyle] = useState(initialState?.style || "");
  const [mood, setMood] = useState(initialState?.mood || "");
  const [customStyle, setCustomStyle] = useState("");
  const [parentalAdvisory] = useState<"yes" | "no">("no");
  
  // Track if we've shown the reference image notification
  const [hasShownRefNotification, setHasShownRefNotification] = useState(false);
  
  // Set initial text style variant from initialState
  const allTextStyleVariants = useMemo(() => getAllTextStyleVariants(), []);
  
  // Effect to set initial text style variant
  useEffect(() => {
    if (initialState?.textStyle) {
      // Find the variant matching the style
      const match = allTextStyleVariants.find(
        v => v.variant.id === initialState.textStyle || v.category === initialState.textStyle
      );
      if (match) {
        setSelectedVariant(match.variant);
        setSelectedCategory(match.category);
      }
    }
    
    // Show notification about reference images if they were used
    if (initialState?.hadReferenceImages && !hasShownRefNotification) {
      setHasShownRefNotification(true);
      toast.info("Reference images not restored", {
        description: "If you used reference images, you'll need to re-upload them.",
        duration: 5000,
      });
    }
  }, [initialState, allTextStyleVariants, hasShownRefNotification]);
  
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
  
  // Track if form was modified since last generation (for Re-Generate button state)
  const [formModifiedSinceGeneration, setFormModifiedSinceGeneration] = useState(true);
  
  // Determine if we should show "Re-Generate" (has cover AND no changes made)
  const showRegenerate = generatedImage && !formModifiedSinceGeneration && !isGenerating;
  
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
        // Reach ~99% in about 35 seconds using asymptotic curve
        // Formula tuned: fast start, slows down, caps at 99
        const targetProgress = Math.min(99, 99 * (1 - Math.exp(-elapsed / 12000)));
        setSmoothProgress(targetProgress);
        
        const stageIdx = progressStages.findIndex(s => s.progress > targetProgress);
        setProgressStage(Math.max(0, stageIdx - 1));
      }, 100);
      
      return () => {
        clearInterval(progressInterval);
      };
    } else if (generatedImage) {
      // Only snap to 100% when generation actually completes
      setSmoothProgress(100);
      setProgressStage(progressStages.length - 1);
      // Reset generation timer
      generationStartTime.current = null;
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
    setFormModifiedSinceGeneration(true);
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
        setFormModifiedSinceGeneration(true);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeInspirationImage = (index: number) => {
    setInspirationImages(prev => prev.filter((_, i) => i !== index));
    setFormModifiedSinceGeneration(true);
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
    onGenerate(fullPrompt, genre, finalStyle, finalMood, inspirationImages.length > 0 ? inspirationImages : undefined, textStyleRefImage);
    
    // Mark form as unchanged after generation starts
    setFormModifiedSinceGeneration(false);
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

    onGenerate(fullPrompt, suggestedGenre, suggestion.style, suggestion.mood, inspirationImages.length > 0 ? inspirationImages : undefined, textStyleRefImage);
    
    // Mark form as unchanged after generation starts
    setFormModifiedSinceGeneration(false);
  };

  const [isDownloading, setIsDownloading] = useState(false);
  
  const handleDownload = async () => {
    if (!generatedImage) return;
    
    setIsDownloading(true);
    const filename = songTitle ? `cover-art-${songTitle}` : "cover-art";
    
    try {
      // First, upscale the image using AI to get true 3000x3000+ quality
      toast.info("Preparing high-resolution download...", { duration: 10000 });
      
      const { data, error } = await supabase.functions.invoke("upscale-cover", {
        body: { imageUrl: generatedImage },
      });
      
      if (error) {
        console.error("Upscale failed, using original:", error);
        // Fallback to canvas upscaling
        await downloadImage(generatedImage, filename);
      } else if (data?.upscaledUrl) {
        // Use the AI-upscaled image for download
        await downloadImage(data.upscaledUrl, filename);
      } else {
        // Fallback
        await downloadImage(generatedImage, filename);
      }
    } catch (err) {
      console.error("Download error:", err);
      // Fallback to canvas upscaling
      await downloadImage(generatedImage, filename);
    } finally {
      setIsDownloading(false);
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
    setFormModifiedSinceGeneration(true);
    toast.success(`Selected: ${variant.name}`);
  };

  // Reset all form fields to default state
  const handleResetForm = () => {
    setPrompt("");
    setSongTitle("");
    setArtistName("");
    setGenre("HipHop");
    setStyle("");
    setMood("");
    setCustomStyle("");
    setInspirationImages([]);
    setSelectedVariant(null);
    setSelectedCategory(null);
    toast.info("Form reset", { description: "All fields have been cleared" });
  };

  // Check if form has data that can be reset
  const hasFormData = !!(prompt || songTitle || artistName || style || mood || selectedVariant || inspirationImages.length > 0);

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
                      {/* Reset Button */}
                      {hasFormData && !isGenerating && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={handleResetForm}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-foreground/60 hover:text-foreground transition-all text-xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="font-medium">Reset</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Clear all form fields</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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
            <AudioAnalyzer 
              onGenerate={onGenerate}
              generatedImage={generatedImage}
              isGenerating={isGenerating}
              songTitle={songTitle}
              setSongTitle={(value) => { setSongTitle(value); setFormModifiedSinceGeneration(true); }}
              artistName={artistName}
              setArtistName={(value) => { setArtistName(value); setFormModifiedSinceGeneration(true); }}
            />
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
                      onChange={(e) => { setSongTitle(e.target.value); setFormModifiedSinceGeneration(true); }}
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
                      onChange={(e) => { setArtistName(e.target.value); setFormModifiedSinceGeneration(true); }}
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
                    <Select value={style} onValueChange={(v) => { setStyle(v); setFormModifiedSinceGeneration(true); }}>
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
                    <Select value={mood} onValueChange={(v) => { setMood(v); setFormModifiedSinceGeneration(true); }}>
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
                    
                    {/* All text style variants with skeleton placeholder */}
                    {allTextStyleVariants.map(({ category, variant }, index) => (
                      <TextStyleThumbnail
                        key={`${category}-${variant.id}`}
                        src={variant.previewImage}
                        alt={variant.name}
                        isSelected={selectedVariant?.id === variant.id && selectedCategory === category}
                        onClick={() => handleSelectTextStyle(category, variant)}
                        priority={index < 4}
                      />
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
                      placeholder="Describe the vision of your cover..."
                      value={prompt}
                      onChange={(e) => { setPrompt(e.target.value); setFormModifiedSinceGeneration(true); }}
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
                    ) : showRegenerate ? (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Re-Generate Cover Art
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
                        <div className={`aspect-square max-h-full mx-auto rounded-lg overflow-hidden border-2 border-gray-500 relative ${isGenerating ? 'opacity-50' : ''}`}>
                          <img
                            src={generatedImage}
                            alt="Generated cover art"
                            className="w-full h-full object-cover"
                          />
                          {isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <RefreshCw className="w-8 h-8 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Progress bar during regeneration */}
                      {isGenerating && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className={`font-medium ${textClass}`}>{progressStages[progressStage]?.label}</span>
                            <span className={mutedTextClass}>{Math.round(smoothProgress)}%</span>
                          </div>
                          <Progress value={smoothProgress} className="h-2" />
                        </div>
                      )}

                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="flex-1"
                          >
                            {isDownloading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Upscaling...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </>
                            )}
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
                                hadReferenceImages: inspirationImages.length > 0,
                                generationId: generationId,
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
                <Button variant="outline" onClick={handleDownload} disabled={isDownloading} className="border-gray-600 text-white hover:bg-gray-800">
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upscaling...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </>
                  )}
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
