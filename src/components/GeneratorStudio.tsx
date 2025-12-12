import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic, Settings, Sliders, Sun, Moon, Coins, Edit3, Sparkles, ZoomIn, Infinity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GenreBanner } from "@/components/GenreBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

interface GeneratorStudioProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string) => void;
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
  const { hasUnlimitedGenerations, subscriptionTier } = useCredits();
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCanvasPopup, setShowCanvasPopup] = useState(false);

  const currentGenreData = useMemo(() => genreStyles[genre], [genre]);

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
    if (prompt.trim()) {
      // Include song title, artist name, and parental advisory in the prompt
      let fullPrompt = prompt;
      if (songTitle) fullPrompt += ` | Song Title: ${songTitle}`;
      if (artistName) fullPrompt += ` | Artist: ${artistName}`;
      if (parentalAdvisory === "yes") fullPrompt += " | Include Parental Advisory label";
      if (themeMode === "light") fullPrompt += " | Light/bright color scheme";
      
      onGenerate(fullPrompt, genre, style, mood);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement("a");
      link.href = generatedImage;
      link.download = "cover-art.png";
      link.click();
    }
  };

  const estimatedTime = coverCount === "2" ? "< 20 Seconds" : "< 15 Seconds";

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className={`max-w-5xl mx-auto rounded-2xl border p-4 md:p-8 ${
          themeMode === "light" 
            ? "bg-white/95 border-gray-200" 
            : "bg-card border-border"
        }`}>
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Title Row */}
            <div className="flex items-center gap-3">
              <div className={`w-1 h-8 rounded-full ${themeMode === "light" ? "bg-gray-800" : "bg-primary"}`} />
              <div>
                <h2 className={`font-display text-xl md:text-2xl tracking-wide ${themeMode === "light" ? "text-gray-900" : ""}`}>
                  DESIGN STUDIO
                </h2>
                <p className={`text-xs md:text-sm ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
                  AI trained on top-selling marketplace covers.
                </p>
              </div>
            </div>

            {/* Controls Row */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {/* Theme Toggle */}
              <div className={`flex items-center gap-1 rounded-lg p-1 ${themeMode === "light" ? "bg-gray-100" : "bg-secondary"}`}>
                <button
                  onClick={() => setThemeMode("dark")}
                  className={`p-1.5 md:p-2 rounded transition-colors ${
                    themeMode === "dark" 
                      ? "bg-primary text-primary-foreground"
                      : themeMode === "light" ? "text-gray-500 hover:text-gray-800" : "text-foreground/60 hover:text-foreground"
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
                <TabsList className={themeMode === "light" ? "bg-gray-100" : "bg-secondary"}>
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

          {/* Token Info */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            {hasUnlimitedGenerations ? (
              <>
                <Sparkles className={`w-4 h-4 ${themeMode === "light" ? "text-green-600" : "text-green-500"}`} />
                <span className={themeMode === "light" ? "text-gray-700" : "text-foreground/80"}>
                  <span className={`font-semibold ${themeMode === "light" ? "text-green-600" : "text-green-500"}`}>
                    {subscriptionTier?.toUpperCase()} - Unlimited Generations
                  </span>
                </span>
              </>
            ) : (
              <>
                <Coins className={`w-4 h-4 ${themeMode === "light" ? "text-gray-800" : "text-primary"}`} />
                <span className={themeMode === "light" ? "text-gray-700" : "text-foreground/80"}>
                  <span className={`font-semibold ${themeMode === "light" ? "text-gray-900" : "text-primary"}`}>1 Cover = 1 Token</span>
                </span>
              </>
            )}
          </div>

          {/* Cover Count Selection */}
          <div className={`mb-6 p-3 md:p-4 rounded-lg ${themeMode === "light" ? "bg-gray-100" : "bg-secondary/50"}`}>
            <Label className={`text-xs font-semibold tracking-widest uppercase mb-3 block ${themeMode === "light" ? "text-gray-700" : "text-primary"}`}>
              Number of Covers to Generate
            </Label>
            <RadioGroup
              value={coverCount}
              onValueChange={(v) => setCoverCount(v as "1" | "2")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="cover-1" />
                <Label htmlFor="cover-1" className={`cursor-pointer ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
                  1 Cover
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="cover-2" />
                <Label htmlFor="cover-2" className={`cursor-pointer ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
                  2 Covers
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Song Title & Artist Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Song Title
                  </label>
                  <Input
                    placeholder="Your song title..."
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className={`h-12 ${themeMode === "light" ? "bg-gray-100 border-gray-200" : "bg-secondary border-border"}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                    Artist Name
                  </label>
                  <Input
                    placeholder="Your artist name..."
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className={`h-12 ${themeMode === "light" ? "bg-gray-100 border-gray-200" : "bg-secondary border-border"}`}
                  />
                </div>
              </div>

              {/* Genre Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                  1. Select Genre
                </label>
                <Select value={genre} onValueChange={handleGenreChange}>
                  <SelectTrigger className={`h-12 ${themeMode === "light" ? "bg-gray-100 border-gray-200" : "bg-secondary border-border"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {genres.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visual Style - Only show in Advanced mode */}
              {studioMode === "advanced" && (
                <div className="space-y-2">
                  <label className={`text-xs font-semibold tracking-widest uppercase ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
                    2. Visual Style
                  </label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className={`h-12 ${themeMode === "light" ? "bg-gray-100 border-gray-200" : "bg-secondary border-border"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {currentGenreData.styles.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className={`text-xs ${themeMode === "light" ? "text-gray-400" : "text-foreground/50"}`}>
                    {currentGenreData.description}
                  </p>
                </div>
              )}

              {/* Mood / Vibe - Only show in Advanced mode */}
              {studioMode === "advanced" && (
                <div className="space-y-2">
                  <label className={`text-xs font-semibold tracking-widest uppercase ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
                    3. Mood / Vibe
                  </label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger className={`h-12 ${themeMode === "light" ? "bg-gray-100 border-gray-200" : "bg-secondary border-border"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {currentGenreData.moods.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Parental Advisory */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                  Parental Advisory
                </label>
                <RadioGroup
                  value={parentalAdvisory}
                  onValueChange={(v) => setParentalAdvisory(v as "yes" | "no")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="pa-yes" />
                    <Label htmlFor="pa-yes" className={`cursor-pointer ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="pa-no" />
                    <Label htmlFor="pa-no" className={`cursor-pointer ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Basic Mode Info */}
              {studioMode === "basic" && (
                <div className={`p-4 rounded-lg border ${themeMode === "light" ? "bg-gray-50 border-gray-200" : "bg-secondary/30 border-border"}`}>
                  <p className={`text-sm ${themeMode === "light" ? "text-gray-600" : "text-foreground/70"}`}>
                    <span className="text-primary font-medium">Basic Mode:</span> Visual style and mood are automatically optimized for your selected genre.
                  </p>
                  <p className={`text-xs mt-2 ${themeMode === "light" ? "text-gray-400" : "text-foreground/50"}`}>
                    Switch to Advanced for full control.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Prompt */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-border pb-2">
                <button className={`flex items-center gap-2 text-sm font-medium border-b-2 pb-2 -mb-[10px] ${
                  themeMode === "light" ? "text-gray-900 border-gray-900" : "text-foreground border-foreground"
                }`}>
                  <Type className="w-4 h-4" />
                  TEXT PROMPT
                </button>
                <button className={`flex items-center gap-2 text-sm font-medium pb-2 -mb-[10px] hover:opacity-100 transition-colors ${
                  themeMode === "light" ? "text-gray-400" : "text-foreground/60"
                }`}>
                  <Mic className="w-4 h-4" />
                  AUDIO ANALYZER
                </button>
              </div>

              {/* Prompt Input */}
              <Textarea
                placeholder={`Describe the subject matter for your ${genre} cover...\n\nExample: A shattered greek statue wearing a balaclava, holding red roses.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`min-h-[200px] resize-none text-base ${
                  themeMode === "light" 
                    ? "bg-gray-100 border-gray-200 placeholder:text-gray-400" 
                    : "bg-secondary border-border placeholder:text-foreground/40"
                }`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
            <div className={`flex items-center gap-2 text-sm ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
              <Clock className="w-4 h-4" />
              <span className={`font-semibold ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>ESTIMATED TIME</span>
              <span>{estimatedTime}</span>
            </div>
            <Button 
              variant="studio" 
              size="xl" 
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
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
        </div>

        {/* Genre Banner */}
        <div className="max-w-5xl mx-auto mt-6">
          <GenreBanner genre={genre} />
        </div>

        {/* Generated Image Display */}
        {generatedImage && (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl tracking-wide">YOUR COVER ART</h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                  <Button variant="default" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
              <div className="aspect-square rounded-lg overflow-hidden bg-secondary border border-border">
                <img 
                  src={generatedImage} 
                  alt="Generated Cover Art" 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-center text-sm text-foreground/60 mt-4">
                3000 × 3000px · Ready for Spotify, Apple Music & more
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Edit Options</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                toast.success("Upscaling started...");
                setShowEditDialog(false);
              }}
            >
              <ZoomIn className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Upscale to 4K</p>
                <p className="text-xs text-foreground/60">Enhance resolution for print</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                toast.success("Opening remix options...");
                setShowEditDialog(false);
              }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Remix / Variations</p>
                <p className="text-xs text-foreground/60">Generate similar covers</p>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => {
                toast.success("Opening editor...");
                setShowEditDialog(false);
              }}
            >
              <Edit3 className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Fine-tune Details</p>
                <p className="text-xs text-foreground/60">Edit specific elements</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Free Spotify Canvas Popup */}
      <Dialog open={showCanvasPopup} onOpenChange={setShowCanvasPopup}>
        <DialogContent className="max-w-sm bg-gradient-to-b from-card to-background border-primary/30 text-center">
          <div className="py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-display text-2xl mb-2">FREE SPOTIFY CANVAS</h3>
            <p className="text-foreground/70 mb-6">
              Get a free Spotify Canvas animation with your first order!
            </p>
            <Button 
              variant="studio" 
              className="w-full"
              onClick={() => setShowCanvasPopup(false)}
            >
              Awesome, Let's Go!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};