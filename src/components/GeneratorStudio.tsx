import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wand2, Download, RefreshCw, Clock, Type, Mic } from "lucide-react";

interface GeneratorStudioProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string) => void;
  generatedImage: string | null;
  isGenerating: boolean;
}

const genres = ["Hip-Hop", "R&B", "Pop", "Rock", "Electronic", "Jazz", "Classical", "Country"];
const styles = ["Grunge Collage", "Minimalist", "Neon Glow", "Vintage Film", "Abstract", "Photorealistic", "Anime", "3D Render"];
const moods = ["Aggressive", "Chill", "Euphoric", "Melancholic", "Mysterious", "Romantic", "Dark", "Uplifting"];

export const GeneratorStudio = ({ onGenerate, generatedImage, isGenerating }: GeneratorStudioProps) => {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Hip-Hop");
  const [style, setStyle] = useState("Grunge Collage");
  const [mood, setMood] = useState("Aggressive");

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
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 bg-primary rounded-full" />
            <div>
              <h2 className="font-display text-2xl tracking-wide">DESIGN STUDIO</h2>
              <p className="text-sm text-muted-foreground">
                AI trained on top-selling marketplace covers.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Controls */}
            <div className="space-y-6">
              {/* Genre Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-primary uppercase">
                  1. Select Genre
                </label>
                <Select value={genre} onValueChange={setGenre}>
                  <SelectTrigger className="bg-secondary border-border h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visual Style */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  2. Visual Style
                </label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="bg-secondary border-border h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Texture heavy, torn paper, xerox aesthetics.
                </p>
              </div>

              {/* Mood / Vibe */}
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  3. Mood / Vibe
                </label>
                <Select value={mood} onValueChange={setMood}>
                  <SelectTrigger className="bg-secondary border-border h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {moods.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column - Prompt */}
            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex items-center gap-4 border-b border-border pb-2">
                <button className="flex items-center gap-2 text-sm font-medium text-foreground border-b-2 border-foreground pb-2 -mb-[10px]">
                  <Type className="w-4 h-4" />
                  TEXT PROMPT
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground pb-2 -mb-[10px] hover:text-foreground transition-colors">
                  <Mic className="w-4 h-4" />
                  AUDIO ANALYZER
                </button>
              </div>

              {/* Prompt Input */}
              <Textarea
                placeholder={`Describe the subject matter for your ${genre} cover...\n\nExample: A shattered greek statue wearing a balaclava, holding red roses.`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] bg-secondary border-border resize-none text-base placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  Generate Cover Art
                </>
              )}
            </Button>
          </div>
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
              <p className="text-center text-sm text-muted-foreground mt-4">
                3000 × 3000px · Ready for Spotify, Apple Music & more
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
