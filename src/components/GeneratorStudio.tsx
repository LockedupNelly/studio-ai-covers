import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic, Settings, Sliders, Sun, Moon, Coins, Edit3, Sparkles, ZoomIn, ChevronLeft, ChevronRight, ImagePlus, Info, Image, ExternalLink } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
interface AudioSuggestion {
  title: string;
  prompt: string;
  mood: string;
  style: string;
}

interface GeneratorStudioProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string, referenceImage?: string) => void;
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

// Text/Typography style presets for AI generation with example images
const textStyles = [
  { id: "none", name: "No Text Style", description: "Let AI decide the typography", prompt: "", example: "" },
  { id: "3d-chrome", name: "3D Chrome", description: "Metallic chrome with depth", prompt: "3D chrome metallic text with reflections and depth", example: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&h=200&fit=crop" },
  { id: "neon-glow", name: "Neon Glow", description: "Vibrant neon with glow effects", prompt: "neon glowing text with bright electric colors and light bloom", example: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=200&h=200&fit=crop" },
  { id: "gothic-script", name: "Gothic Script", description: "Ornate blackletter style", prompt: "ornate gothic blackletter calligraphy typography", example: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?w=200&h=200&fit=crop" },
  { id: "grunge-distressed", name: "Grunge Distressed", description: "Worn, textured, raw", prompt: "grunge distressed worn textured typography with scratches", example: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop" },
  { id: "retro-vintage", name: "Retro Vintage", description: "Classic 70s-80s style", prompt: "retro vintage 70s 80s style typography with warm tones", example: "https://images.unsplash.com/photo-1516796181074-bf453fbfa3e6?w=200&h=200&fit=crop" },
  { id: "minimalist-sans", name: "Minimalist Sans", description: "Clean modern typography", prompt: "clean minimalist sans-serif modern typography", example: "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=200&h=200&fit=crop" },
  { id: "hand-drawn", name: "Hand Drawn", description: "Organic sketch style", prompt: "hand-drawn organic sketch style lettering", example: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=200&h=200&fit=crop" },
  { id: "graffiti", name: "Graffiti", description: "Street art spray paint", prompt: "graffiti street art spray paint style bold lettering", example: "https://images.unsplash.com/photo-1520697830682-bbb6e85e2b0b?w=200&h=200&fit=crop" },
  { id: "fire-flames", name: "Fire & Flames", description: "Burning fiery text", prompt: "text engulfed in flames and fire with embers", example: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&h=200&fit=crop" },
  { id: "ice-crystal", name: "Ice Crystal", description: "Frozen crystalline style", prompt: "frozen ice crystal typography with frost and snow effects", example: "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=200&h=200&fit=crop" },
  { id: "gold-luxury", name: "Gold Luxury", description: "Premium gold embossed", prompt: "luxury gold embossed premium metallic text", example: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=200&h=200&fit=crop" },
  { id: "glitch-digital", name: "Glitch Digital", description: "Cyberpunk glitch effect", prompt: "digital glitch cyberpunk distorted text with RGB split", example: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&h=200&fit=crop" },
  { id: "blood-horror", name: "Blood Horror", description: "Dripping horror style", prompt: "dripping blood horror style dark text", example: "https://images.unsplash.com/photo-1509248961725-aec71f3e816e?w=200&h=200&fit=crop" },
  { id: "bubble-3d", name: "Bubble 3D", description: "Playful inflated style", prompt: "3D bubble inflated playful rounded typography", example: "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=200&h=200&fit=crop" },
];

// Genre-based visual style presets
const genreStyles: Record<string, { styles: string[]; moods: string[]; description: string }> = {
  "Hip-Hop / Rap": {
    styles: ["Grunge Collage", "Dark Texture", "Street Art", "Vintage Film"],
    moods: ["Aggressive", "Dark", "Mysterious", "Raw"],
    description: "Gritty textures, torn paper, xerox aesthetics"
  },
  "Pop": {
    styles: ["Bright & Bold", "Minimalist", "Gradient Glow", "Retro Pop"],
    moods: ["Euphoric", "Uplifting", "Playful", "Vibrant"],
    description: "Clean, colorful, eye-catching visuals"
  },
  "EDM": {
    styles: ["Neon Glow", "Cyberpunk", "Abstract Waves", "Laser Grid"],
    moods: ["Euphoric", "Electric", "Intense", "Hypnotic"],
    description: "Vibrant neon, glow effects, futuristic feel"
  },
  "R&B": {
    styles: ["Smooth Gradient", "Luxury Minimal", "Soft Focus", "Night Aesthetic"],
    moods: ["Romantic", "Sensual", "Chill", "Intimate"],
    description: "Smooth gradients, elegant, intimate vibes"
  },
  "Rock": {
    styles: ["Grunge", "Distressed", "High Contrast", "Vintage Band"],
    moods: ["Aggressive", "Raw", "Rebellious", "Powerful"],
    description: "Raw textures, bold contrasts, vintage feel"
  },
  "Alternative": {
    styles: ["Abstract Art", "Surreal", "Experimental", "Mixed Media"],
    moods: ["Melancholic", "Mysterious", "Ethereal", "Introspective"],
    description: "Artistic, unconventional, thought-provoking"
  },
  "Indie": {
    styles: ["Film Grain", "Polaroid", "Hand-drawn", "Lo-fi"],
    moods: ["Nostalgic", "Dreamy", "Warm", "Authentic"],
    description: "Vintage warmth, authentic, handcrafted feel"
  },
  "Metal": {
    styles: ["Dark Gothic", "Skull Art", "Fire & Flames", "Brutal"],
    moods: ["Aggressive", "Dark", "Intense", "Chaotic"],
    description: "Dark imagery, intense, powerful visuals"
  },
  "Country": {
    styles: ["Natural Scenery", "Rustic Wood", "Golden Hour", "Americana"],
    moods: ["Warm", "Nostalgic", "Peaceful", "Down-to-earth"],
    description: "Light, scenic, calming natural aesthetics"
  },
  "Jazz": {
    styles: ["Smoky Club", "Art Deco", "Classic Noir", "Sophisticated"],
    moods: ["Smooth", "Sophisticated", "Mysterious", "Timeless"],
    description: "Classic, sophisticated, timeless elegance"
  },
  "Classical": {
    styles: ["Elegant", "Baroque", "Orchestral", "Minimalist"],
    moods: ["Grand", "Peaceful", "Dramatic", "Refined"],
    description: "Elegant, refined, artistic compositions"
  }
};

export const GeneratorStudio = ({ onGenerate, generatedImage, isGenerating }: GeneratorStudioProps) => {
  const { hasUnlimitedGenerations } = useCredits();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("Hip-Hop / Rap");
  const [style, setStyle] = useState("Grunge Collage");
  const [mood, setMood] = useState("Aggressive");
  const [studioMode, setStudioMode] = useState<"basic" | "advanced">("basic");
  const [coverCount, setCoverCount] = useState<"1" | "2">("1");
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  const [parentalAdvisory, setParentalAdvisory] = useState<"yes" | "no">("no");
  const [textStyle, setTextStyle] = useState("none");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCanvasPopup, setShowCanvasPopup] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState<"text" | "audio" | "image">("text");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const textStylesRef = useRef<HTMLDivElement>(null);
  const [previewStyle, setPreviewStyle] = useState<{ id: string; name: string; description: string; example: string } | null>(null);
  const [recentCovers, setRecentCovers] = useState<{ id: string; image_url: string }[]>([]);
  const [expandedCover, setExpandedCover] = useState<string | null>(null);

  const currentGenreData = useMemo(() => genreStyles[genre], [genre]);
  const selectedTextStyle = useMemo(() => textStyles.find(t => t.id === textStyle), [textStyle]);

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

  // Update style and mood when genre changes
  const handleGenreChange = (newGenre: string) => {
    setGenre(newGenre);
    const genreData = genreStyles[newGenre];
    if (genreData) {
      setStyle(genreData.styles[0]);
      setMood(genreData.moods[0]);
    }
  };

  const handleGenerate = () => {
    // Require core metadata first
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Please enter a song title and artist name.");
      return;
    }

    let basePrompt = "";
    let refImage: string | undefined = undefined;
    
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
    if (selectedTextStyle && selectedTextStyle.prompt) {
      fullPrompt += ` | Typography style: ${selectedTextStyle.prompt}`;
    }
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    onGenerate(fullPrompt, genre, style, mood, refImage);
  };

  const handleGenerateFromSuggestion = (suggestion: { prompt: string; mood: string; style: string }, suggestedGenre: string) => {
    // Update the state with suggestion values
    if (genres.includes(suggestedGenre)) {
      setGenre(suggestedGenre);
      const genreData = genreStyles[suggestedGenre];
      if (genreData) {
        if (genreData.styles.includes(suggestion.style)) {
          setStyle(suggestion.style);
        } else {
          setStyle(genreData.styles[0]);
        }
      }
    }
    setMood(suggestion.mood);
    
    // Build and execute generation
    let fullPrompt = suggestion.prompt;
    if (songTitle) fullPrompt += ` | Song Title: ${songTitle}`;
    if (artistName) fullPrompt += ` | Artist: ${artistName}`;
    if (selectedTextStyle && selectedTextStyle.prompt) {
      fullPrompt += ` | Typography style: ${selectedTextStyle.prompt}`;
    }
    if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
    if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
    
    onGenerate(fullPrompt, suggestedGenre, suggestion.style, suggestion.mood);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = "cover-art.png";
      link.click();
    }
  };

  const handleAudioAnalysisComplete = (result: { suggestedPrompt: string; detectedMood: string; suggestedGenre: string; suggestedStyle: string }) => {
    setPrompt(result.suggestedPrompt);
    setMood(result.detectedMood);
    
    // Update genre if it's valid
    if (genres.includes(result.suggestedGenre)) {
      setGenre(result.suggestedGenre);
      const genreData = genreStyles[result.suggestedGenre];
      if (genreData) {
        // Try to match the suggested style, otherwise use the first one
        if (genreData.styles.includes(result.suggestedStyle)) {
          setStyle(result.suggestedStyle);
        } else {
          setStyle(genreData.styles[0]);
        }
      }
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
        <div className={`max-w-6xl mx-auto rounded-2xl border p-4 md:p-8 ${
          themeMode === "light" 
            ? "bg-white border-gray-200" 
            : "bg-card border-border"
        }`}>
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
                      {/* Token Info - directly beside header */}
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
                      AI trained on top-selling marketplace covers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                {/* Covers to Generate - moved to header */}
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
            <div className="lg:w-1/2 space-y-4">
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

              {/* Basic Mode Info OR Advanced Controls */}
              {studioMode === "basic" ? (
                <div className={`p-4 rounded-lg border ${cardBgClass}`}>
                  <p className={`text-sm ${mutedTextClass}`}>
                    <span className={`font-medium ${themeMode === "light" ? "text-gray-800" : "text-primary"}`}>Basic Mode:</span> Visual style and mood are automatically optimized.
                  </p>
                  <p className={`text-xs mt-2 ${themeMode === "light" ? "text-gray-500" : "text-foreground/50"}`}>
                    Switch to Advanced for full control including text styles.
                  </p>
                </div>
              ) : (
                <>
                  {/* Visual Style */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold tracking-widest uppercase ${mutedLabelClass}`}>
                      Visual Style
                    </label>
                  <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                        <SelectValue placeholder="Select style..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {currentGenreData.styles.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Mood / Vibe */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold tracking-widest uppercase ${mutedLabelClass}`}>
                      Mood / Vibe
                    </label>
                  <Select value={mood} onValueChange={setMood}>
                      <SelectTrigger className={`h-10 ${inputBgClass} ${themeMode === "light" ? "[&>span]:text-gray-900" : ""}`}>
                        <SelectValue placeholder="Select mood..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {currentGenreData.moods.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Text Style Selector */}
                  <div className="space-y-2">
                    <label className={`text-xs font-semibold tracking-widest uppercase ${labelClass}`}>
                      Text Style
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => scrollTextStyles('left')}
                        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full ${
                          themeMode === "light" ? "bg-white shadow-md text-gray-700 border border-gray-200" : "bg-card/90 shadow-md text-foreground"
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <TooltipProvider>
                        <div
                          ref={textStylesRef}
                          className="flex gap-2 overflow-x-auto scrollbar-hide px-6 py-2"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {textStyles.map((ts) => (
                            <Tooltip key={ts.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setTextStyle(ts.id)}
                                  className={`relative flex-shrink-0 px-4 py-2 rounded-lg border transition-all ${
                                    textStyle === ts.id
                                      ? themeMode === "light"
                                        ? "bg-gray-800 text-white border-gray-800"
                                        : "bg-primary text-primary-foreground border-primary"
                                      : themeMode === "light"
                                        ? "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                                        : "bg-secondary text-foreground border-border hover:border-primary/50"
                                  }`}
                                >
                                  <span className="text-sm font-medium whitespace-nowrap">{ts.name}</span>
                                  {ts.example && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewStyle({
                                          id: ts.id,
                                          name: ts.name,
                                          description: ts.description,
                                          example: ts.example,
                                        });
                                      }}
                                      className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                                        textStyle === ts.id 
                                          ? "bg-white/10 text-white/80" 
                                          : themeMode === "light" ? "bg-gray-100 text-gray-500" : "bg-card/80 text-foreground/60"
                                      }`}
                                    >
                                      <Info className="w-3 h-3" />
                                    </button>
                                  )}
                                </button>
                              </TooltipTrigger>
                              {ts.example && (
                                <TooltipContent side="top" className="hidden" />
                              )}
                            </Tooltip>
                          ))}
                        </div>
                      </TooltipProvider>
                      <button
                        onClick={() => scrollTextStyles('right')}
                        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full ${
                          themeMode === "light" ? "bg-white shadow-md text-gray-700 border border-gray-200" : "bg-card/90 shadow-md text-foreground"
                        }`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
                    className={`h-9 text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500 text-gray-900" : "placeholder:text-foreground/40"}`}
                  />
                </div>
              </div>

              {/* Covers to Generate + Parental Advisory Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={`text-xs font-semibold tracking-wider uppercase ${labelClass}`}>
                    Parental Advisory
                  </label>
                  <RadioGroup
                    value={parentalAdvisory}
                    onValueChange={(v) => setParentalAdvisory(v as "yes" | "no")}
                    className="flex gap-3 h-9 items-center"
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
              </div>

              {/* Prompt Input Section */}
              <div className="space-y-3">
                {/* Tabs */}
                <div className={`flex items-center gap-2 md:gap-4 border-b pb-2 overflow-hidden ${borderClass}`}>
                  <button 
                    onClick={() => setActiveInputTab("text")}
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
                    onClick={() => setActiveInputTab("audio")}
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
                    onClick={() => setActiveInputTab("image")}
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
                    className={`min-h-[140px] resize-none text-base ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"}`}
                  />
                )}

                {/* Audio Analyzer */}
                {activeInputTab === "audio" && (
                  <div className="min-h-[140px]">
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
                      <div className="space-y-2">
                        <div className="relative">
                          <img
                            src={uploadedImage}
                            alt="Uploaded"
                            className={`w-full h-28 object-contain rounded-lg border ${borderClass}`}
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
                        <Textarea
                          placeholder="Describe what you want to change or add to this image..."
                          value={imagePrompt}
                          onChange={(e) => setImagePrompt(e.target.value)}
                          className={`min-h-[60px] resize-none text-sm ${inputBgClass} ${themeMode === "light" ? "placeholder:text-gray-500" : "placeholder:text-foreground/40"}`}
                        />
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
            <div className="lg:w-1/2">
              <div className={`rounded-2xl border p-4 flex flex-col ${cardBgClass}`} style={{ maxHeight: '500px' }}>
                {generatedImage ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-display text-lg tracking-wide ${textClass}`}>YOUR COVER</h3>
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)} className={`h-8 px-2 ${themeMode === "light" ? "border-gray-300" : ""}`}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating} className={`h-8 px-2 ${themeMode === "light" ? "border-gray-300" : ""}`}>
                          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="default" size="sm" onClick={handleDownload} className="h-8 px-2">
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`aspect-square rounded-lg overflow-hidden border ${borderClass} max-w-[280px] mx-auto w-full`}>
                        <img 
                          src={generatedImage} 
                          alt="Generated Cover Art" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className={`text-center text-xs ${mutedTextClass}`}>
                        3000 × 3000px · Ready for streaming
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`mt-1 ${themeMode === "light" ? "border-gray-300 text-gray-700 hover:bg-gray-100" : ""}`}
                        onClick={() => setShowEditDialog(true)}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        Request real designer edits (24h)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col h-full">
                    {/* Locked Square Placeholder */}
                    <div className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center max-w-[280px] mx-auto w-full ${
                      themeMode === "light" ? "border-gray-300 bg-gray-50" : "border-border bg-secondary/30"
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

                    {/* Divider with View Previous Link */}
                    {recentCovers.length > 0 && (
                      <>
                        <div className={`flex items-center gap-3 my-3 ${borderClass}`}>
                          <div className={`flex-1 h-px ${themeMode === "light" ? "bg-gray-200" : "bg-border"}`} />
                          <button
                            onClick={() => navigate("/profile")}
                            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                              themeMode === "light" 
                                ? "text-gray-600 hover:text-gray-900" 
                                : "text-foreground/60 hover:text-foreground"
                            }`}
                          >
                            View previous generations
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <div className={`flex-1 h-px ${themeMode === "light" ? "bg-gray-200" : "bg-border"}`} />
                        </div>

                        {/* Recent Covers Grid - Constrained with Fade */}
                        <div className="relative flex-1 min-h-0 overflow-hidden">
                          <div className="grid grid-cols-2 gap-2 overflow-hidden" style={{ maxHeight: '120px' }}>
                            {recentCovers.slice(0, 4).map((cover) => (
                              <button
                                key={cover.id}
                                type="button"
                                onClick={() => setExpandedCover(cover.image_url)}
                                className="relative aspect-square rounded-lg overflow-hidden border border-border/40 opacity-50 hover:opacity-100 transition-opacity"
                              >
                                <img
                                  src={cover.image_url}
                                  alt="Previous cover"
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                          {/* Fade overlay at bottom */}
                          <div className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none ${
                            themeMode === "light" 
                              ? "bg-gradient-to-t from-gray-50 to-transparent" 
                              : "bg-gradient-to-t from-secondary/50 to-transparent"
                          }`} />
                        </div>
                      </>
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">EDIT OPTIONS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button variant="outline" className="w-full justify-start gap-3 h-14">
              <ZoomIn className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Upscale</p>
                <p className="text-xs text-foreground/60">Enhance resolution to 4K</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14">
              <RefreshCw className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Remix</p>
                <p className="text-xs text-foreground/60">Generate variations</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-14">
              <Edit3 className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Fine-tune</p>
                <p className="text-xs text-foreground/60">Adjust colors & details</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Style Preview Popup */}
      <Dialog open={!!previewStyle} onOpenChange={() => setPreviewStyle(null)}>
        <DialogContent className="max-w-sm bg-card border-border p-0 overflow-hidden">
          {previewStyle && (
            <>
              <div className="aspect-square w-full bg-secondary/40">
                <img
                  src={previewStyle.example}
                  alt={previewStyle.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <DialogHeader className="mb-2">
                  <DialogTitle className="font-display text-base tracking-wide">
                    {previewStyle.name}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-foreground/70">{previewStyle.description}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Expanded Previous Cover */}
      <Dialog open={!!expandedCover} onOpenChange={() => setExpandedCover(null)}>
        <DialogContent className="max-w-md bg-card border-border p-4">
          {expandedCover && (
            <div className="aspect-square rounded-xl overflow-hidden border border-border">
              <img src={expandedCover} alt="Previous cover enlarged" className="w-full h-full object-cover" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Spotify Canvas Popup */}
      <Dialog open={showCanvasPopup} onOpenChange={setShowCanvasPopup}>
        <DialogContent className="max-w-md bg-gradient-to-b from-green-500/20 to-card border-green-500/30">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-center text-green-400">
              FREE SPOTIFY CANVAS
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-green-400" />
            </div>
            <p className="text-foreground/80 mb-2">
              Get a FREE Spotify Canvas with your first cover art purchase!
            </p>
            <p className="text-sm text-foreground/60">
              Animated 8-second vertical loop for Spotify.
            </p>
          </div>
          <Button 
            variant="default" 
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            onClick={() => setShowCanvasPopup(false)}
          >
            Awesome, Let's Go!
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};
