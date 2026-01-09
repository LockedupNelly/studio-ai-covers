import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic, Sun, Moon, Coins, Sparkles, ImagePlus, Image, Maximize2, X, Upload, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
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
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [parentalAdvisory] = useState<"yes" | "no">("no");
  
  const [activeInputTab, setActiveInputTab] = useState<"text" | "audio" | "image">("text");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const textStylesScrollRef = useRef<HTMLDivElement>(null);
  const [recentCovers, setRecentCovers] = useState<{ id: string; image_url: string }[]>([]);
  const [expandedCover, setExpandedCover] = useState<string | null>(null);
  const [showDesignerEditDialog, setShowDesignerEditDialog] = useState(false);
  const [showEditCoverDialog, setShowEditCoverDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
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
    setUpscaledImageUrl(null);
    
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Please enter a song title and artist name.");
      return;
    }

    let basePrompt = "";
    let refImage: string | undefined = undefined;
    let textStyleRefImage: string | undefined = undefined;
    
    if (activeInputTab === "image" && uploadedImage) {
      basePrompt = imagePrompt.trim() || "Use this photo as the main subject for the cover art.";
      refImage = uploadedImage;
    } else if (activeInputTab === "text" && prompt.trim()) {
      basePrompt = prompt;
    } else {
      return;
    }

    let fullPrompt = basePrompt;
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
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    fullPrompt += " | CRITICAL: The text (song title and artist name) must be deeply integrated into the cover design, not just overlaid. The text should feel like part of the artwork with effects, textures, or styling that matches the overall aesthetic.";

    const finalStyle = style === "Other" ? customStyle : (style === "None" || !style ? "" : style);
    const finalMood = mood === "None" || !mood ? "" : mood;
    onGenerate(fullPrompt, genre, finalStyle, finalMood, refImage, textStyleRefImage);
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
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    fullPrompt += " | CRITICAL: The text must be deeply integrated into the cover design.";

    onGenerate(fullPrompt, suggestedGenre, suggestion.style, suggestion.mood, undefined, textStyleRefImage);
  };

  const handleDownload = async () => {
    const imageToDownload = upscaledImageUrl || generatedImage;
    if (!imageToDownload) return;

    try {
      const res = await fetch(imageToDownload);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = upscaledImageUrl ? "cover-art-4k.png" : "cover-art.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      const link = document.createElement("a");
      link.href = imageToDownload;
      link.download = upscaledImageUrl ? "cover-art-4k.png" : "cover-art.png";
      link.click();
    }
  };

  const handleUpscale = async () => {
    if (!generatedImage || isUpscaling) return;
    
    setIsUpscaling(true);
    try {
      const { data, error } = await supabase.functions.invoke("upscale-cover", {
        body: { imageUrl: generatedImage },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

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

  const handleAudioAnalysisComplete = (result: { suggestedPrompt: string; detectedMood: string; suggestedGenre: string; suggestedStyle: string }) => {
    setPrompt(result.suggestedPrompt);
    setMood(result.detectedMood);
    
    if (genres.includes(result.suggestedGenre)) {
      setGenre(result.suggestedGenre);
    }
    if (visualStyles.some(vs => vs.id === result.suggestedStyle)) {
      setStyle(result.suggestedStyle);
    }
  };

  const handleSelectTextStyle = (category: string, variant: TextStyleVariant) => {
    setSelectedCategory(category);
    setSelectedVariant(variant);
    toast.success(`Selected: ${variant.name}`);
  };

  const estimatedTime = "~ 45 Seconds";

  const labelClass = themeMode === "light" ? "text-gray-700" : "text-primary";
  const mutedLabelClass = themeMode === "light" ? "text-gray-600" : "text-foreground/60";
  const textClass = themeMode === "light" ? "text-gray-900" : "text-foreground";
  const mutedTextClass = themeMode === "light" ? "text-gray-600" : "text-foreground/60";
  const borderClass = themeMode === "light" ? "border-gray-300" : "border-border";
  const inputBgClass = themeMode === "light" ? "bg-white border-gray-300" : "bg-secondary border-border";
  const cardBgClass = themeMode === "light" ? "bg-gray-50 border-gray-200" : "bg-secondary/50 border-border";

  return (
    <section className="py-8 relative z-10 bg-background">
      <div className="container mx-auto px-4">
        <div className={`max-w-6xl mx-auto rounded-2xl border p-4 md:p-8 transition-opacity ${
          themeMode === "light" 
            ? "bg-white border-gray-200" 
            : "bg-card border-border"
        } ${isGenerating ? "opacity-60 pointer-events-none" : ""}`}>
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${themeMode === "light" ? "bg-gray-800" : "bg-primary"}`} />
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className={`font-display text-xl md:text-2xl tracking-wide ${textClass}`}>
                        DESIGN STUDIO
                      </h2>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                        themeMode === "light" ? "bg-gray-100 border border-gray-200" : "bg-secondary"
                      }`}>
                        {hasUnlimitedGenerations ? (
                          <>
                            <Sparkles className={`w-3.5 h-3.5 ${themeMode === "light" ? "text-green-600" : "text-green-500"}`} />
                            <span className={`text-xs font-medium ${themeMode === "light" ? "text-green-700" : "text-green-400"}`}>
                              Unlimited
                            </span>
                          </>
                        ) : (
                          <>
                            <Coins className={`w-3.5 h-3.5 ${themeMode === "light" ? "text-gray-700" : "text-primary"}`} />
                            <span className={`text-xs font-medium ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
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

              {/* Theme Toggle */}
              <div className={`flex items-center gap-1 rounded-lg p-1 ${themeMode === "light" ? "bg-gray-100 border border-gray-200" : "bg-secondary"}`}>
                <button
                  onClick={() => setThemeMode("dark")}
                  className={`p-2 rounded transition-colors ${
                    themeMode === "dark" 
                      ? "bg-primary text-primary-foreground"
                      : themeMode === "light" ? "text-gray-600 hover:text-gray-900" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setThemeMode("light")}
                  className={`p-2 rounded transition-colors ${
                    themeMode === "light" 
                      ? "bg-gray-800 text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main content - Two column layout */}
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
                    className={`h-10 text-base ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500 text-gray-900" : "placeholder:text-foreground/40"}`}
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
                    className={`h-10 text-base ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500 text-gray-900" : "placeholder:text-foreground/40"}`}
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
                    <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
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
                    <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
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
                    <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
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
                      className={`text-xs ${themeMode === "light" ? "text-gray-500 hover:text-gray-700" : "text-foreground/60 hover:text-foreground"}`}
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
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                      !selectedVariant
                        ? themeMode === "light" 
                          ? "border-gray-800 bg-gray-100" 
                          : "border-primary bg-primary/10"
                        : themeMode === "light"
                          ? "border-gray-300 bg-white hover:border-gray-400"
                          : "border-border bg-secondary/50 hover:border-primary/50"
                    }`}
                  >
                    <Sparkles className={`w-5 h-5 ${!selectedVariant ? (themeMode === "light" ? "text-gray-800" : "text-primary") : mutedTextClass}`} />
                    <span className={`text-[10px] font-medium ${!selectedVariant ? textClass : mutedTextClass}`}>AI Select</span>
                  </button>
                  
                  {/* All text style variants */}
                  {allTextStyleVariants.map(({ category, variant }) => (
                    <button
                      key={`${category}-${variant.id}`}
                      onClick={() => handleSelectTextStyle(category, variant)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                        selectedVariant?.id === variant.id && selectedCategory === category
                          ? themeMode === "light" 
                            ? "border-gray-800 ring-2 ring-gray-800/20" 
                            : "border-primary ring-2 ring-primary/20"
                          : themeMode === "light"
                            ? "border-gray-200 hover:border-gray-400"
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

              {/* Upload Inspiration - Compact */}
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  themeMode === "light" 
                    ? "border-gray-300 bg-white hover:bg-gray-50" 
                    : "border-border bg-secondary/50 hover:bg-secondary"
                }`}>
                  <Upload className={`w-4 h-4 ${mutedTextClass}`} />
                  <span className={`text-sm ${textClass}`}>Upload Inspiration</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleInspirationUpload}
                  />
                </label>
                {inspirationImages.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {inspirationImages.map((img, idx) => (
                      <div key={idx} className="relative w-8 h-8">
                        <img src={img} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover rounded" />
                        <button
                          onClick={() => removeInspirationImage(idx)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <span className={`text-xs ${mutedTextClass}`}>({inspirationImages.length}/5)</span>
                  </div>
                )}
              </div>

              {/* Prompt Input Section */}
              <div className="space-y-3">
                {/* Tabs */}
                <div className={`flex items-center border-b pb-2 ${borderClass}`}>
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("text")}
                    disabled={isGenerating}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 pb-2 -mb-[10px] transition-colors ${
                      activeInputTab === "text"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    TEXT
                  </button>
                  <div className={`h-6 w-px ${themeMode === "light" ? "bg-gray-300" : "bg-border"}`} />
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("audio")}
                    disabled={isGenerating}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 pb-2 -mb-[10px] transition-colors ${
                      activeInputTab === "audio"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    AUDIO
                  </button>
                  <div className={`h-6 w-px ${themeMode === "light" ? "bg-gray-300" : "bg-border"}`} />
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("image")}
                    disabled={isGenerating}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border-b-2 pb-2 -mb-[10px] transition-colors ${
                      activeInputTab === "image"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    UPLOAD
                  </button>
                </div>

                {/* Text Prompt Input */}
                {activeInputTab === "text" && (
                  <Textarea
                    placeholder={`Describe the subject matter for your ${genre} cover...`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    className={`min-h-[100px] resize-none text-base ${inputBgClass} ${
                      themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"
                    }`}
                  />
                )}

                {/* Audio Analyzer */}
                {activeInputTab === "audio" && (
                  <div className="min-h-[100px] relative">
                    {isGenerating && (
                      <div className="absolute inset-0 z-10 rounded-lg bg-black/40 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    <AudioAnalyzer 
                      themeMode={themeMode} 
                      onAnalysisComplete={handleAudioAnalysisComplete}
                      onGenerateSuggestion={handleGenerateFromSuggestion}
                    />
                  </div>
                )}

                {/* Upload Image */}
                {activeInputTab === "image" && (
                  <div className="min-h-[100px] space-y-3">
                    {!uploadedImage ? (
                      <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        themeMode === "light"
                          ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}>
                        <div className="flex flex-col items-center justify-center py-2">
                          <ImagePlus className={`w-6 h-6 mb-1 ${themeMode === "light" ? "text-gray-400" : "text-foreground/40"}`} />
                          <p className={`text-sm ${themeMode === "light" ? "text-gray-600" : "text-foreground/60"}`}>
                            <span className="font-semibold">Click to upload</span>
                          </p>
                          <p className={`text-xs ${themeMode === "light" ? "text-gray-500" : "text-foreground/40"}`}>
                            PNG, JPG, WEBP (Max 10MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                toast.error("File size must be less than 10MB");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setUploadedImage(ev.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    ) : (
                      <div className="flex gap-3">
                        <div className="relative w-24 h-24 flex-shrink-0">
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            className={`w-full h-full object-cover rounded-lg border ${borderClass}`}
                          />
                          <button
                            onClick={() => {
                              setUploadedImage(null);
                              setImagePrompt("");
                            }}
                            className={`absolute top-1 right-1 p-1 rounded-full ${
                              themeMode === "light" ? "bg-white/90 text-gray-700 border border-gray-200" : "bg-card/90 text-foreground"
                            }`}
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex-1">
                          <Textarea
                            placeholder="Describe what you want to change or add..."
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            className={`h-24 resize-none text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Button */}
              {activeInputTab !== "audio" && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${borderClass}`}>
                  <div className={`flex items-center gap-2 text-sm ${mutedTextClass}`}>
                    <Clock className="w-4 h-4" />
                    <span>{estimatedTime}</span>
                  </div>
                  <Button 
                    variant={themeMode === "light" ? "default" : "studio"}
                    size="lg" 
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      !songTitle.trim() ||
                      !artistName.trim() ||
                      (activeInputTab === "text" && !prompt.trim()) ||
                      (activeInputTab === "image" && !uploadedImage)
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
              )}
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
                              <Button variant="outline" size="sm" onClick={() => setShowFullscreen(true)} className={`h-8 px-2 ${themeMode === "light" ? "border-gray-300" : ""}`}>
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
                          src={upscaledImageUrl || generatedImage}
                          alt="Generated cover art"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {upscaledImageUrl && (
                        <div className="absolute top-2 right-2 bg-green-500/90 text-white text-xs font-medium px-2 py-1 rounded">
                          4K HD
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {!upscaledImageUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUpscale}
                          disabled={isUpscaling}
                          className={`w-full ${themeMode === "light" ? "border-gray-300" : ""}`}
                        >
                          {isUpscaling ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              Upscaling...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-1" />
                              Upscale to 4K HD
                            </>
                          )}
                        </Button>
                      )}
                      
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
                              imageUrl: upscaledImageUrl || generatedImage,
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
                          className={`text-xs font-medium transition-colors underline ${
                            themeMode === "light" 
                              ? "text-gray-600 hover:text-gray-900" 
                              : "text-foreground/60 hover:text-foreground"
                          }`}
                        >
                          View Past Creations
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 flex items-center justify-center">
                      <div className={`aspect-square w-full max-w-[360px] rounded-lg border-2 flex flex-col items-center justify-center text-center mx-auto ${
                        themeMode === "light" ? "border-gray-300 bg-gray-50" : "border-gray-500 bg-secondary/30"
                      }`}>
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
                          themeMode === "light" ? "bg-gray-200" : "bg-secondary"
                        }`}>
                          <Image className={`w-7 h-7 ${themeMode === "light" ? "text-gray-400" : "text-foreground/30"}`} />
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
                          className={`text-xs font-medium transition-colors underline ${
                            themeMode === "light" 
                              ? "text-gray-600 hover:text-gray-900" 
                              : "text-foreground/60 hover:text-foreground"
                          }`}
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
