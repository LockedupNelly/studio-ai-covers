import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic, Settings, Sliders } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GenreBanner } from "@/components/GenreBanner";

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
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Hip-Hop / Rap");
  const [style, setStyle] = useState("Grunge Collage");
  const [mood, setMood] = useState("Aggressive");
  const [studioMode, setStudioMode] = useState<"basic" | "advanced">("basic");
  const [coverCount, setCoverCount] = useState<"1" | "2">("1");

  const currentGenreData = useMemo(() => genreStyles[genre], [genre]);

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
      onGenerate(prompt, genre, style, mood);
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

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto bg-card rounded-2xl border border-border p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div>
                <h2 className="font-display text-2xl tracking-wide">DESIGN STUDIO</h2>
                <p className="text-sm text-foreground/60">
                  AI trained on top-selling marketplace covers.
                </p>
              </div>
            </div>

            {/* Studio Mode Toggle */}
            <Tabs value={studioMode} onValueChange={(v) => setStudioMode(v as "basic" | "advanced")}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Basic
                </TabsTrigger>
                <TabsTrigger value="advanced" className="flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  Advanced
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Cover Count Selection */}
          <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
            <Label className="text-xs font-semibold tracking-widest text-primary uppercase mb-3 block">
              Number of Covers to Generate
            </Label>
            <RadioGroup
              value={coverCount}
              onValueChange={(v) => setCoverCount(v as "1" | "2")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1" id="cover-1" />
                <Label htmlFor="cover-1" className="cursor-pointer text-foreground">1 Cover</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="2" id="cover-2" />
                <Label htmlFor="cover-2" className="cursor-pointer text-foreground">2 Covers</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Genre Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                  1. Select Genre
                </label>
                <Select value={genre} onValueChange={handleGenreChange}>
                  <SelectTrigger className="bg-secondary border-border h-12">
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
                  <label className="text-xs font-semibold tracking-widest text-foreground/60 uppercase">
                    2. Visual Style
                  </label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="bg-secondary border-border h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {currentGenreData.styles.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-foreground/50">
                    {currentGenreData.description}
                  </p>
                </div>
              )}

              {/* Mood / Vibe - Only show in Advanced mode */}
              {studioMode === "advanced" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-widest text-foreground/60 uppercase">
                    3. Mood / Vibe
                  </label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger className="bg-secondary border-border h-12">
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

              {/* Basic Mode Info */}
              {studioMode === "basic" && (
                <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                  <p className="text-sm text-foreground/70">
                    <span className="text-primary font-medium">Basic Mode:</span> Visual style and mood are automatically optimized for your selected genre.
                  </p>
                  <p className="text-xs text-foreground/50 mt-2">
                    Switch to Advanced for full control.
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Prompt */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-border pb-2">
                <button className="flex items-center gap-2 text-sm font-medium text-foreground border-b-2 border-foreground pb-2 -mb-[10px]">
                  <Type className="w-4 h-4" />
                  TEXT PROMPT
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-foreground/60 pb-2 -mb-[10px] hover:text-foreground transition-colors">
                  <Mic className="w-4 h-4" />
                  AUDIO ANALYZER
                </button>
              </div>

              {/* Prompt Input */}
              <Textarea
                placeholder={`Describe the subject matter for your ${genre} cover...\n\nExample: A shattered greek statue wearing a balaclava, holding red roses.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] bg-secondary border-border resize-none text-base placeholder:text-foreground/40"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              <Clock className="w-4 h-4" />
              <span className="font-semibold text-foreground">ESTIMATED TIME</span>
              <span>{"< 15 Seconds"}</span>
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
    </section>
  );
};