import { useState, useMemo, useEffect, useRef, MutableRefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic, Settings, Sliders, Sun, Moon, Coins, Sparkles, ImagePlus, Image, Maximize2, X, Plus, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { TextStyleVariantDialog } from "@/components/TextStyleVariantDialog";
import { hasVariants, TextStyleVariant } from "@/lib/text-style-variants";
import { Progress } from "@/components/ui/progress";
import { ColorPickerPopover, getColorValue } from "@/components/ColorPickerPopover";

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

// Text/Typography style presets - Only 5 main categories + AI Select
const textStyles = [
  { id: "creative", name: "Creative", description: "Artistic, unique, expressive", prompt: "creative artistic unique expressive typography", example: "" },
  { id: "dark", name: "Dark", description: "Moody, shadow, gothic vibes", prompt: "dark moody gothic shadow text with dramatic lighting", example: "" },
  { id: "futuristic", name: "Futuristic", description: "Sci-fi, tech, cyber aesthetics", prompt: "futuristic sci-fi technology cyber text with holographic effects", example: "" },
  { id: "modern", name: "Modern", description: "Clean, contemporary, sharp", prompt: "modern clean contemporary sharp typography", example: "" },
  { id: "retro", name: "Retro", description: "Vintage, 70s-80s, nostalgic", prompt: "retro vintage 70s 80s nostalgic text with warm tones", example: "" },
];

// Progress stages for generation - streamlined single-call process
const progressStages = [
  { label: "Preparing your cover...", progress: 5 },
  { label: "Generating artwork...", progress: 15 },
  { label: "Creating your vision...", progress: 30 },
  { label: "Rendering details...", progress: 50 },
  { label: "Adding finishing touches...", progress: 70 },
  { label: "Almost ready...", progress: 90 },
];

// Fixed Visual Style options (same for all genres)
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
  "Other"
];

// Mood options (same for all genres)
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

// Genre descriptions
const genreDescriptions: Record<string, string> = {
  "Hip-Hop / Rap": "Gritty textures, torn paper, xerox aesthetics",
  "Pop": "Clean, colorful, eye-catching visuals",
  "EDM": "Vibrant neon, glow effects, futuristic feel",
  "R&B": "Smooth gradients, elegant, intimate vibes",
  "Rock": "Raw textures, bold contrasts, vintage feel",
  "Alternative": "Artistic, unconventional, thought-provoking",
  "Indie": "Vintage warmth, authentic, handcrafted feel",
  "Metal": "Dark imagery, intense, powerful visuals",
  "Country": "Light, scenic, calming natural aesthetics",
  "Jazz": "Classic, sophisticated, timeless elegance",
  "Classical": "Elegant, refined, artistic compositions"
};


export const GeneratorStudio = ({ onGenerate, generatedImage, isGenerating }: GeneratorStudioProps) => {
  const { hasUnlimitedGenerations, refetch: refetchCredits } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("Hip-Hop / Rap");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [studioMode, setStudioMode] = useState<"basic" | "advanced">("basic");
  const [coverCount, setCoverCount] = useState<"1" | "2">("1");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [parentalAdvisory, setParentalAdvisory] = useState<"yes" | "no">("no");
  const [textStyle, setTextStyle] = useState("");
  const [mainColor, setMainColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  
  const [showCanvasPopup, setShowCanvasPopup] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<"text" | "audio" | "image">("text");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const textStylesRef = useRef<HTMLDivElement>(null);
  const [previewStyle, setPreviewStyle] = useState<{ id: string; name: string; description: string; example: string } | null>(null);
  const [recentCovers, setRecentCovers] = useState<{ id: string; image_url: string }[]>([]);
  const [expandedCover, setExpandedCover] = useState<string | null>(null);
  const [showDesignerEditDialog, setShowDesignerEditDialog] = useState(false);
  const [showEditCoverDialog, setShowEditCoverDialog] = useState(false);
  const [showVariantDialog, setShowVariantDialog] = useState(false);
  const [pendingStyleId, setPendingStyleId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progressStage, setProgressStage] = useState(0);
  const currentGenreDescription = useMemo(() => genreDescriptions[genre] || "", [genre]);
  const selectedTextStyle = useMemo(() => textStyles.find(t => t.id === textStyle), [textStyle]);

  // Progress animation during generation - tied to actual generation state
  const [smoothProgress, setSmoothProgress] = useState(0);
  const generationStartTime = useRef<number | null>(null);
  
  useEffect(() => {
    if (isGenerating) {
      generationStartTime.current = Date.now();
      setProgressStage(0);
      setSmoothProgress(0);
      
      // Animate progress smoothly toward 95% over time (never reaches 100 until done)
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - (generationStartTime.current || Date.now());
        // Use asymptotic curve: quickly to 50%, slowly to 95% over ~45 seconds
        const targetProgress = Math.min(95, 50 * (1 - Math.exp(-elapsed / 8000)) + 45 * (1 - Math.exp(-elapsed / 25000)));
        setSmoothProgress((prev) => Math.max(prev, targetProgress));
        
        // Update stage label based on progress
        const stageIdx = progressStages.findIndex(s => s.progress > targetProgress);
        setProgressStage(Math.max(0, stageIdx - 1));
      }, 100);
      
      return () => {
        clearInterval(progressInterval);
      };
    } else if (generatedImage) {
      // When generation completes, instantly jump to 100%
      setSmoothProgress(100);
      setProgressStage(progressStages.length - 1);
    } else {
      setProgressStage(0);
      setSmoothProgress(0);
      generationStartTime.current = null;
    }
  }, [isGenerating, generatedImage]);

  const scrollTextStyles = (direction: 'left' | 'right') => {
    if (textStylesRef.current) {
      const scrollAmount = 200;
      textStylesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Show free Spotify Canvas popup on mount
  useEffect(() => {
    const hasSeenPopup = sessionStorage.getItem("seenCanvasPopup");
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setShowCanvasPopup(true);
        sessionStorage.setItem("seenCanvasPopup", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Load recent covers for placeholder grid
  useEffect(() => {
    const loadRecent = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id, image_url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);
        if (!error && data) {
          setRecentCovers(data as { id: string; image_url: string }[]);
        }
      } catch (e) {
        console.error("Failed to load recent covers", e);
      }
    };
    loadRecent();
  }, [user]);

  // Update genre (style and mood are now fixed/independent)
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
    // Require core metadata first
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Please enter a song title and artist name.");
      return;
    }

    let basePrompt = "";
    let refImage: string | undefined = undefined;
    let textStyleRefImage: string | undefined = undefined;
    
    // Handle different input modes
    if (activeInputTab === "image" && uploadedImage) {
      basePrompt = imagePrompt.trim() || "Use this photo as the main subject for the cover art.";
      refImage = uploadedImage;
    } else if (activeInputTab === "text" && prompt.trim()) {
      basePrompt = prompt;
    } else {
      return;
    }

    // Include song title, artist name, text style, and parental advisory in the prompt
    let fullPrompt = basePrompt;
    if (songTitle) fullPrompt += ` | Song Title: ${songTitle}`;
    if (artistName) fullPrompt += ` | Artist: ${artistName}`;
    
    // Add color preferences
    if (mainColor) fullPrompt += ` | Main color: ${getColorValue(mainColor)}`;
    if (accentColor) fullPrompt += ` | Accent color: ${getColorValue(accentColor)}`;

    // Add inspiration images instruction
    if (inspirationImages.length > 0) {
      fullPrompt += ` | Use the provided inspiration images for visual reference, but ignore any text in them. Only add the song title and artist name provided.`;
    }
    
    // Use variant's details if selected, otherwise fall back to base text style
    if (selectedVariant) {
      if (selectedVariant.promptInstructions) {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: ${selectedVariant.promptInstructions}`;
      } else {
        fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Match the EXACT text style shown in the provided reference image (letterforms, brush strokes, glow, colors, texture).`;
      }

      // Create complementary artist name styling
      fullPrompt += ` | ARTIST NAME STYLING: Create a text design for the artist name that complements the chosen song title text style while maintaining visual hierarchy.`;

      const rawRef = selectedVariant.previewImage || selectedVariant.referenceImages?.[0];
      if (rawRef) {
        const normalized = rawRef.startsWith("/") ? rawRef : `/${rawRef}`;
        textStyleRefImage = rawRef.startsWith("http") ? rawRef : `${window.location.origin}${normalized}`;
      }
    } else if (selectedTextStyle && selectedTextStyle.prompt) {
      fullPrompt += ` | Typography style: ${selectedTextStyle.prompt}`;
      fullPrompt += ` | ARTIST NAME STYLING: Create a complementary text design for the artist name that pairs well with the song title typography.`;
    } else {
      // AI Select mode in basic - let AI choose text design
      fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Choose an appropriate and integrated text style for the song title and artist name that fits the overall cover design. The text should feel integrated into the artwork, not just placed on top.`;
    }
    
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    // Critical: Ensure text is integrated
    fullPrompt += " | CRITICAL: The text (song title and artist name) must be deeply integrated into the cover design, not just overlaid. The text should feel like part of the artwork with effects, textures, or styling that matches the overall aesthetic.";

    // If generating 2 covers, force variation: one can be moody, one MUST be vibrant using the chosen main color
    if (coverCount === "2" && mainColor) {
      fullPrompt += ` | VARIATION RULE: Generate TWO distinct covers. Cover A can be cinematic/muted. Cover B MUST be vibrant and high-saturation, with ${getColorValue(mainColor)} as the dominant color family.`;
    }

    // Resolution is handled by backend (1024x1024), user can enhance to 2K after

    const finalStyle = style === "Other" ? customStyle : (style === "None" || !style ? "" : style);
    const finalMood = mood === "None" || !mood ? "" : mood;
    onGenerate(fullPrompt, genre, finalStyle, finalMood, refImage, textStyleRefImage);
  };

  const handleGenerateFromSuggestion = (suggestion: { prompt: string; mood: string; style: string }, suggestedGenre: string) => {
    // Update the state with suggestion values
    if (genres.includes(suggestedGenre)) {
      setGenre(suggestedGenre);
    }
    // Set style if it's in our fixed options
    if (visualStyles.includes(suggestion.style)) {
      setStyle(suggestion.style);
    }
    setMood(suggestion.mood);
    
    // Build and execute generation
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
    } else if (selectedTextStyle && selectedTextStyle.prompt) {
      fullPrompt += ` | Typography style: ${selectedTextStyle.prompt}`;
    } else {
      fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Choose an appropriate integrated text style for the song title and artist name.`;
    }
    
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    fullPrompt += " | CRITICAL: The text must be deeply integrated into the cover design.";
    
    onGenerate(fullPrompt, suggestedGenre, suggestion.style, suggestion.mood, undefined, textStyleRefImage);
  };

  const handleDownload = async () => {
    if (!generatedImage) return;

    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      // Center-crop to square (covers any landscape/portrait outputs)
      const side = Math.min(bitmap.width, bitmap.height);
      const sx = Math.floor((bitmap.width - side) / 2);
      const sy = Math.floor((bitmap.height - side) / 2);

      const outSize = 3000;
      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outSize, outSize);

      const outBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode PNG"))), "image/png");
      });

      const url = URL.createObjectURL(outBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "cover-art-3000x3000.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: direct download
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
    // Set style if it's in our fixed options
    if (visualStyles.includes(result.suggestedStyle)) {
      setStyle(result.suggestedStyle);
    }
  };

  const estimatedTime = coverCount === "2" ? "< 20 Seconds" : "< 15 Seconds";

  // Light mode specific text classes
  const labelClass = themeMode === "light" ? "text-gray-700" : "text-primary";
  const mutedLabelClass = themeMode === "light" ? "text-gray-600" : "text-foreground/60";
  const textClass = themeMode === "light" ? "text-gray-900" : "text-foreground";
  const mutedTextClass = themeMode === "light" ? "text-gray-600" : "text-foreground/60";
  const borderClass = themeMode === "light" ? "border-gray-300" : "border-border";
  const inputBgClass = themeMode === "light" ? "bg-white border-gray-300" : "bg-secondary border-border";
  const cardBgClass = themeMode === "light" ? "bg-gray-50 border-gray-200" : "bg-secondary/50 border-border";

  return (
    <section className="py-12 relative z-10 bg-background">
      <div className="container mx-auto px-4">
        <div className={`max-w-6xl mx-auto rounded-2xl border p-4 md:p-8 transition-opacity ${
          themeMode === "light" 
            ? "bg-white border-gray-200" 
            : "bg-card border-border"
        } ${isGenerating ? "opacity-60 pointer-events-none" : ""}`}>
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Title Row */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-8 rounded-full ${themeMode === "light" ? "bg-gray-800" : "bg-primary"}`} />
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className={`font-display text-xl md:text-2xl tracking-wide ${textClass}`}>
                        DESIGN STUDIO
                      </h2>
                      {/* Token Info */}
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

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                {/* Covers to Generate */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold tracking-widest uppercase ${labelClass}`}>
                    Covers
                  </span>
                  <RadioGroup
                    value={coverCount}
                    onValueChange={(v) => setCoverCount(v as "1" | "2")}
                    className="flex gap-3 items-center"
                  >
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="1" id="cover-1" className="w-4 h-4" />
                      <Label htmlFor="cover-1" className={`cursor-pointer text-xs ${textClass}`}>
                        1
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="2" id="cover-2" className="w-4 h-4" />
                      <Label htmlFor="cover-2" className={`cursor-pointer text-xs ${textClass}`}>
                        2
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Theme Toggle */}
                <div className={`flex items-center gap-1 rounded-lg p-1 ${themeMode === "light" ? "bg-gray-100 border border-gray-200" : "bg-secondary"}`}>
                  <button
                    onClick={() => setThemeMode("dark")}
                    className={`p-1.5 md:p-2 rounded transition-colors ${
                      themeMode === "dark" 
                        ? "bg-primary text-primary-foreground"
                        : themeMode === "light" ? "text-gray-600 hover:text-gray-900" : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button
                    onClick={() => setThemeMode("light")}
                    className={`p-1.5 md:p-2 rounded transition-colors ${
                      themeMode === "light" 
                        ? "bg-gray-800 text-white"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>

                {/* Studio Mode Toggle */}
                <Tabs value={studioMode} onValueChange={(v) => setStudioMode(v as "basic" | "advanced")}>
                  <TabsList className={themeMode === "light" ? "bg-gray-100 border border-gray-200" : "bg-secondary"}>
                    <TabsTrigger value="basic" className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 ${
                      themeMode === "light" && studioMode === "basic" ? "data-[state=active]:bg-gray-800 data-[state=active]:text-white" : ""
                    }`}>
                      <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 ${
                      themeMode === "light" && studioMode === "advanced" ? "data-[state=active]:bg-gray-800 data-[state=active]:text-white" : ""
                    }`}>
                      <Sliders className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Advanced</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Main content - Two column layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Controls & Prompt (50%) */}
            <div className="lg:w-1/2 space-y-4 lg:flex-shrink-0">
              {/* Basic Mode Info OR Advanced Controls */}
              {studioMode === "basic" ? (
                <>
                  {/* Genre Select */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold tracking-widest uppercase ${labelClass}`}>
                      Select Genre
                    </label>
                    <Select value={genre} onValueChange={handleGenreChange}>
                      <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                        <SelectValue placeholder="Select genre..." className={themeMode === "light" ? "text-gray-900" : ""} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {genres.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className={`p-4 rounded-lg border ${cardBgClass}`}>
                    <p className={`text-sm ${mutedTextClass}`}>
                      <span className={`font-medium ${themeMode === "light" ? "text-gray-800" : "text-primary"}`}>Basic Mode:</span> Visual style, mood, and text design are automatically optimized.
                    </p>
                    <p className={`text-xs mt-2 ${themeMode === "light" ? "text-gray-500" : "text-foreground/50"}`}>
                      Switch to Advanced for full control including text styles and colors.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Genre + Visual Style on same row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className={`text-xs font-semibold tracking-widest uppercase ${labelClass}`}>
                        Genre
                      </label>
                      <Select value={genre} onValueChange={handleGenreChange}>
                        <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                          <SelectValue placeholder="Select genre..." />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {genres.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className={`text-xs font-semibold tracking-widest uppercase ${mutedLabelClass}`}>
                        Visual Style
                      </label>
                      <Select value={style} onValueChange={setStyle}>
                        <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {visualStyles.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {style === "Other" && (
                        <Input
                          placeholder="Describe your style..."
                          value={customStyle}
                          onChange={(e) => setCustomStyle(e.target.value)}
                          className={`h-9 mt-2 ${inputBgClass}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Mood / Vibe + Main Color + Accent Color on same row - equal widths */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2 min-w-0">
                      <label className={`text-xs font-semibold tracking-widest uppercase ${mutedLabelClass}`}>
                        Mood / Vibe
                      </label>
                      <Select value={mood} onValueChange={setMood}>
                        <SelectTrigger className={`h-10 w-full ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {moodOptions.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className={`text-xs font-semibold tracking-widest uppercase truncate ${mutedLabelClass}`}>
                        Main Color
                      </label>
                      <ColorPickerPopover
                        label="Color"
                        value={mainColor}
                        onChange={setMainColor}
                        themeMode={themeMode}
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className={`text-xs font-semibold tracking-widest uppercase truncate ${mutedLabelClass}`}>
                        Accent Color
                      </label>
                      <ColorPickerPopover
                        label="Color"
                        value={accentColor}
                        onChange={setAccentColor}
                        themeMode={themeMode}
                      />
                    </div>
                  </div>

                  {/* Text Style Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className={`text-xs font-semibold tracking-widest uppercase ${labelClass}`}>
                        Text Style
                      </label>
                      <span className={`text-xs ${mutedTextClass}`}>
                        click to choose over 50 styles
                      </span>
                    </div>
                    <div className="relative">
                      <TooltipProvider>
                        <div
                          ref={textStylesRef}
                          className="flex gap-2 overflow-x-auto scrollbar-hide py-2"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {/* Reorder: selected style goes to the end (right) */}
                          {textStyles
                            .slice()
                            .sort((a, b) => {
                              if (a.id === textStyle) return 1;
                              if (b.id === textStyle) return -1;
                              return 0;
                            })
                            .map((ts) => (
                            <Tooltip key={ts.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => {
                                    if (hasVariants(ts.id)) {
                                      setPendingStyleId(ts.id);
                                      setShowVariantDialog(true);
                                    } else {
                                      setTextStyle(ts.id);
                                      setSelectedVariant(null);
                                    }
                                  }}
                   className={`relative flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                                     textStyle === ts.id
                                       ? "bg-destructive text-destructive-foreground border-destructive"
                                       : themeMode === "light"
                                         ? "bg-white text-gray-900 border-gray-200 hover:border-gray-400"
                                         : "bg-secondary text-foreground border-border hover:border-primary/50"
                                   } ${textStyle !== "" && textStyle !== ts.id ? "opacity-50" : ""}`}
                                >
                                  <span className="text-sm font-medium whitespace-nowrap">
                                    {ts.name}
                                    {selectedVariant && textStyle === ts.id && (
                                      <span className="ml-1">({selectedVariant.name})</span>
                                    )}
                                  </span>
                                  {hasVariants(ts.id) && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground">
                                      +
                                    </span>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="hidden" />
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Parental Advisory - single row */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                      Parental Advisory
                    </label>
                    <RadioGroup
                      value={parentalAdvisory}
                      onValueChange={(v) => setParentalAdvisory(v as "yes" | "no")}
                      className="flex gap-3 h-10 items-center"
                      disabled={isGenerating}
                    >
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="yes" id="pa-yes" className="w-4 h-4" />
                        <Label htmlFor="pa-yes" className={`cursor-pointer text-sm ${textClass}`}>
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="no" id="pa-no" className="w-4 h-4" />
                        <Label htmlFor="pa-no" className={`cursor-pointer text-sm ${textClass}`}>
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </>
              )}

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
                    className={`h-9 text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500 text-gray-900" : "placeholder:text-foreground/40"}`}
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
                    className={`h-9 text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500 text-gray-900" : "placeholder:text-foreground/40"}`}
                  />
                </div>
              </div>

              {/* Upload Inspiration - 5 clickable boxes with + icons */}
              <div className={`p-4 rounded-lg border ${cardBgClass}`}>
                <label className={`text-xs font-semibold tracking-wider uppercase mb-3 block ${labelClass}`}>
                  Upload Inspiration ({inspirationImages.length}/5)
                </label>
                <div className="flex items-start gap-3">
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const img = inspirationImages[idx];
                    return (
                      <div key={idx} className="relative">
                        {img ? (
                          <>
                            <div className="w-16 h-16 rounded-lg border-2 border-transparent overflow-hidden">
                              <img src={img} alt={`Inspiration ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <button
                              onClick={() => removeInspirationImage(idx)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md z-10"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <label className={`w-16 h-16 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors ${
                            themeMode === "light" 
                              ? "border-gray-400 bg-gray-100 hover:bg-gray-200" 
                              : "border-border/70 bg-secondary/30 hover:bg-secondary/50"
                          }`}>
                            <Plus className="w-5 h-5 text-primary" />
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
                                    setInspirationImages(prev => [...prev, ev.target?.result as string]);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prompt Input Section */}
              <div className="space-y-3">
                {/* Tabs */}
                <div className={`flex items-center gap-2 md:gap-4 border-b pb-2 overflow-hidden ${borderClass}`}>
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("text")}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium border-b-2 pb-2 -mb-[10px] transition-colors whitespace-nowrap ${
                      activeInputTab === "text"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    TEXT PROMPT
                  </button>
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("audio")}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium border-b-2 pb-2 -mb-[10px] transition-colors whitespace-nowrap ${
                      activeInputTab === "audio"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    AUDIO ANALYZER
                  </button>
                  <button 
                    onClick={() => !isGenerating && setActiveInputTab("image")}
                    disabled={isGenerating}
                    className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium border-b-2 pb-2 -mb-[10px] transition-colors whitespace-nowrap ${
                      activeInputTab === "image"
                        ? themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                        : themeMode === "light" ? "text-gray-500 border-transparent hover:text-gray-700" : "text-foreground/60 border-transparent hover:text-foreground/80"
                    }`}
                  >
                    <ImagePlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    UPLOAD IMAGE
                  </button>
                </div>

                {/* Text Prompt Input */}
                {activeInputTab === "text" && (
                  <Textarea
                    placeholder={`Describe the subject matter for your ${genre} cover...\n\nExample: A shattered greek statue wearing a balaclava, holding red roses.`}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={isGenerating}
                    className={`min-h-[140px] resize-none text-base ${inputBgClass} ${
                      themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"
                    }`}
                  />
                )}

                {/* Audio Analyzer */}
                {activeInputTab === "audio" && (
                  <div className="min-h-[140px] relative">
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
                  <div className="min-h-[140px] space-y-3">
                    {!uploadedImage ? (
                      <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                        themeMode === "light"
                          ? "border-gray-300 bg-gray-50 hover:bg-gray-100"
                          : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}>
                        <div className="flex flex-col items-center justify-center py-4">
                          <ImagePlus className={`w-8 h-8 mb-2 ${themeMode === "light" ? "text-gray-400" : "text-foreground/40"}`} />
                          <p className={`text-sm ${themeMode === "light" ? "text-gray-600" : "text-foreground/60"}`}>
                            <span className="font-semibold">Click to upload</span> or drag and drop
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
                        {/* Image on left */}
                        <div className="relative w-32 h-32 flex-shrink-0">
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
                            className={`absolute top-2 right-2 p-1.5 rounded-full ${
                              themeMode === "light" ? "bg-white/90 text-gray-700 border border-gray-200" : "bg-card/90 text-foreground"
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Text box on right */}
                        <div className="flex-1">
                          <Textarea
                            placeholder="Describe what you want to change or add to this image..."
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            className={`h-32 resize-none text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate Button - hidden for audio mode */}
              {activeInputTab !== "audio" && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t ${borderClass}`}>
                  <div className={`flex items-center gap-2 text-sm ${mutedTextClass}`}>
                    <Clock className="w-4 h-4" />
                    <span className={`font-semibold ${textClass}`}>ESTIMATED</span>
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
                        Generate {coverCount === "2" ? "2 Covers" : "Cover Art"}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Right Column - Generated Image or Placeholder (50%) */}
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
                            <TooltipContent>Expand</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className={`h-8 px-2 ${themeMode === "light" ? "border-gray-300" : ""}`}>
                                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Re-Generate</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                      <div className={`relative aspect-square rounded-lg overflow-hidden w-full border-2 ${
                        themeMode === "light" ? "border-gray-300" : "border-gray-500"
                      }`}>
                        <img 
                          src={generatedImage} 
                          alt="Generated Cover Art" 
                          className="w-full h-full object-cover"
                        />
                        {isGenerating && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <p className={`text-center text-xs ${mutedTextClass}`}>
                        1024 × 1024px · Ready for streaming
                      </p>
                      <div className="flex flex-col gap-2 mt-2">
                        {/* Enhance to 3K button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!generatedImage) return;
                            setIsEnhancing(true);
                            try {
                              const { data, error } = await supabase.functions.invoke("enhance-cover", {
                                body: { imageUrl: generatedImage },
                              });
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              if (data?.imageUrl) {
                                window.dispatchEvent(new CustomEvent('coverEdited', { detail: { imageUrl: data.imageUrl } }));
                                toast.success("Cover enhanced to 3000×3000!", {
                                  description: "Ready for Spotify upload.",
                                });
                                refetchCredits();
                              }
                            } catch (err) {
                              toast.error("Enhancement failed", {
                                description: err instanceof Error ? err.message : "Please try again",
                              });
                            } finally {
                              setIsEnhancing(false);
                            }
                          }}
                          disabled={isEnhancing || isGenerating}
                          className={`w-full ${themeMode === "light" ? "border-gray-300 text-gray-700 hover:bg-gray-100" : ""}`}
                        >
                          {isEnhancing ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                              Enhancing...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-1" />
                              Enhance to 3K for Spotify (1 credit)
                            </>
                          )}
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={themeMode === "light" ? "border-gray-300 text-gray-700 hover:bg-gray-100" : ""}
                            onClick={() => setShowEditCoverDialog(true)}
                            disabled={isGenerating}
                          >
                            Edit Cover
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleDownload}
                          >
                            Download
                          </Button>
                        </div>
                        {/* Professional Edits + View Past Creations on same line */}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setShowDesignerEditDialog(true)}
                            className={`text-xs font-medium transition-colors ${
                              themeMode === "light" 
                                ? "text-primary hover:text-primary/80" 
                                : "text-primary hover:text-primary/80"
                            }`}
                          >
                            Send for free professional edits
                          </button>
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
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Locked Square Placeholder fills most of card */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className={`aspect-square w-full max-w-[360px] rounded-lg border-2 flex flex-col items-center justify-center text-center mx-auto ${
                        themeMode === "light" ? "border-gray-300 bg-gray-50" : "border-gray-500 bg-secondary/30"
                      }`}>
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${
                          themeMode === "light" ? "bg-gray-200" : "bg-secondary"
                        }`}>
                          <Image className={`w-7 h-7 ${themeMode === "light" ? "text-gray-400" : "text-foreground/30"}`} />
                        </div>
                        <h3 className={`font-display text-sm tracking-wide mb-1 ${textClass}`}>
                          Cover(s) will appear here
                        </h3>
                        <p className={`text-xs px-4 ${mutedTextClass}`}>
                          Generate to see your cover
                        </p>
                      </div>
                    </div>

                    {/* Progress bar during generation - below the placeholder */}
                    {isGenerating && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${textClass}`}>{progressStages[progressStage]?.label}</span>
                          <span className={mutedTextClass}>{Math.round(smoothProgress)}%</span>
                        </div>
                        <Progress value={smoothProgress} className="h-2" />
                      </div>
                    )}

                    {/* View Past Creations link */}
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

      {/* Text Style Preview Dialog */}
      <Dialog open={!!previewStyle} onOpenChange={() => setPreviewStyle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewStyle?.name}</DialogTitle>
          </DialogHeader>
          {previewStyle && (
            <div className="space-y-3">
              <div className="aspect-square w-full rounded-lg overflow-hidden">
                <img
                  src={previewStyle.example}
                  alt={previewStyle.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground">{previewStyle.description}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Cover Dialog (AI-powered) */}
      <EditCoverDialog
        open={showEditCoverDialog}
        onOpenChange={setShowEditCoverDialog}
        imageUrl={generatedImage}
        onEditComplete={(newImageUrl) => {
          // Update the parent component's generated image state via a workaround
          // Since onGenerate sets the image, we need to use a different approach
          // For now, we'll trigger a state update that passes the new image
          window.dispatchEvent(new CustomEvent('coverEdited', { detail: { imageUrl: newImageUrl } }));
        }}
      />

      {/* Designer Edit Dialog (Professional edits via email) */}
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

      {/* Free Spotify Canvas Popup */}
      <Dialog open={showCanvasPopup} onOpenChange={setShowCanvasPopup}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="w-5 h-5 text-primary" />
              Free Spotify Canvas Offer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              For a limited time, get a <span className="font-semibold text-primary">free Spotify Canvas</span> when you
              purchase any motion upgrade add-on.
            </p>
            <p>
              Perfect for bringing your new cover art to life on Spotify with looping motion visuals.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setShowCanvasPopup(false)} size="sm" variant="outline">
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Style Variant Selection Dialog */}
      <TextStyleVariantDialog
        open={showVariantDialog}
        onOpenChange={setShowVariantDialog}
        styleName={textStyles.find(t => t.id === pendingStyleId)?.name || ""}
        styleId={pendingStyleId || ""}
        selectedVariantId={selectedVariant?.id}
        onSelectVariant={(variant) => {
          setTextStyle(pendingStyleId || "");
          setSelectedVariant(variant);
          setPendingStyleId(null);
          toast.success(`Selected: ${variant.name}`);
        }}
      />
    </section>
  );
};
