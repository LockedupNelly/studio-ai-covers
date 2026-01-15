import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Music, Sparkles, X, Wand2, Edit3, Check, Image, ChevronLeft, RefreshCw, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { TextStyleVariant, getTextStyleVariants, hasVariants } from "@/lib/text-style-variants";
import { 
  genres, 
  visualStylesWithDescriptions as visualStyles, 
  moodOptions, 
  textStyleCategoryIds as textStyleCategories 
} from "@/lib/studio-config";

interface CoverOption {
  id: string;
  title: string;
  prompt: string;
  mood: string;
  style: string;
  genre: string;
  imageUrl: string | null;
  isGenerating: boolean;
}

interface AudioAnalyzerProps {
  onGenerate: (prompt: string, genre: string, style: string, mood: string, referenceImages?: string[], textStyleReferenceImage?: string) => void;
  generatedImage: string | null;
  isGenerating: boolean;
  songTitle: string;
  setSongTitle: (value: string) => void;
  artistName: string;
  setArtistName: (value: string) => void;
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

export const AudioAnalyzer = ({ 
  onGenerate, 
  generatedImage, 
  isGenerating,
  songTitle,
  setSongTitle,
  artistName,
  setArtistName,
}: AudioAnalyzerProps) => {
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<CoverOption | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{ genre: string; mood: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textStylesScrollRef = useRef<HTMLDivElement>(null);
  
  // Genre, style, mood state
  const [genre, setGenre] = useState("Hip-Hop / Rap");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  
  // Text style state
  const [selectedVariant, setSelectedVariant] = useState<TextStyleVariant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const allTextStyleVariants = useMemo(() => getAllTextStyleVariants(), []);
  
  // Progress state
  const [smoothProgress, setSmoothProgress] = useState(0);
  const generationStartTime = useRef<number | null>(null);

  // Progress animation
  useEffect(() => {
    if (isGenerating) {
      generationStartTime.current = Date.now();
      setSmoothProgress(0);
      
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - (generationStartTime.current || Date.now());
        const targetProgress = Math.min(99, 99 * (1 - Math.exp(-elapsed / 12000)));
        setSmoothProgress(targetProgress);
      }, 100);
      
      return () => clearInterval(progressInterval);
    } else if (generatedImage) {
      setSmoothProgress(100);
      generationStartTime.current = null;
    } else {
      setSmoothProgress(0);
      generationStartTime.current = null;
    }
  }, [isGenerating, generatedImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/webm'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast.error("Please upload an MP3, WAV, or M4A file");
        return;
      }
      
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return;
      }
      
      setSelectedFile(file);
      setCoverOptions([]);
      setSelectedOption(null);
      
      // Auto-analyze after file selection
      handleAnalyze(file);
    }
  };

  const handleAnalyze = async (file: File) => {
    setIsAnalyzing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const base64Audio = btoa(binary);

      const { data, error } = await supabase.functions.invoke('analyze-audio', {
        body: { 
          audio: base64Audio,
          mimeType: file.type
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      // Store analysis result and update dropdowns
      setAnalysisResult({
        genre: data.suggestedGenre,
        mood: data.detectedMood,
      });
      
      // Update genre and mood dropdowns from analysis
      if (genres.includes(data.suggestedGenre)) {
        setGenre(data.suggestedGenre);
      }
      if (moodOptions.includes(data.detectedMood)) {
        setMood(data.detectedMood);
      }

      // Create 2 different cover options from the response
      const options: CoverOption[] = [
        {
          id: "option-a",
          title: "Option A",
          prompt: data.conceptA?.prompt || data.suggestedPrompt,
          mood: data.conceptA?.mood || data.detectedMood,
          style: data.conceptA?.style || data.suggestedStyle,
          genre: data.suggestedGenre,
          imageUrl: null,
          isGenerating: false,
        },
        {
          id: "option-b",
          title: "Option B",
          prompt: data.conceptB?.prompt || `${data.suggestedPrompt} with an alternative artistic interpretation`,
          mood: data.conceptB?.mood || data.detectedMood,
          style: data.conceptB?.style || "Abstract Art",
          genre: data.suggestedGenre,
          imageUrl: null,
          isGenerating: false,
        },
      ];

      setCoverOptions(options);
      toast.success("Audio analyzed! Choose a cover concept.");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to analyze audio. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectOption = (option: CoverOption) => {
    setSelectedOption(option);
    setEditedPrompt(option.prompt);
    setIsEditingPrompt(false);
  };

  const handleRevealOptions = () => {
    setSelectedOption(null);
    setIsEditingPrompt(false);
  };

  const handleSelectTextStyle = (category: string, variant: TextStyleVariant) => {
    setSelectedCategory(category);
    setSelectedVariant(variant);
    toast.success(`Selected: ${variant.name}`);
  };

  const handleGenerateCover = () => {
    if (!selectedOption) return;
    
    if (!songTitle.trim() || !artistName.trim()) {
      toast.error("Please enter a song title and artist name.");
      return;
    }

    const promptToUse = isEditingPrompt ? editedPrompt : selectedOption.prompt;
    
    let fullPrompt = promptToUse;
    fullPrompt += ` | Song Title: ${songTitle}`;
    fullPrompt += ` | Artist: ${artistName}`;
    
    let textStyleRefImage: string | undefined = undefined;
    
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
      fullPrompt += ` | TEXT STYLING INSTRUCTIONS: Choose an appropriate and integrated text style for the song title and artist name that fits the overall cover design.`;
    }
    
    fullPrompt += ` | CRITICAL: The text must be deeply integrated into the cover design.`;

    // Use genre/style/mood from dropdowns (which may have been updated by analysis)
    const finalStyle = style || selectedOption.style;
    const finalMood = mood || selectedOption.mood;
    const finalGenre = genre || selectedOption.genre;

    onGenerate(fullPrompt, finalGenre, finalStyle, finalMood, undefined, textStyleRefImage);
  };

  const handleConfirmEdit = () => {
    if (selectedOption) {
      setSelectedOption({ ...selectedOption, prompt: editedPrompt });
    }
    setIsEditingPrompt(false);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setCoverOptions([]);
    setSelectedOption(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = songTitle ? `cover-art-${songTitle}.jpg` : 'cover-art.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const textClass = "text-foreground";
  const mutedTextClass = "text-foreground/60";
  const labelClass = "text-primary";
  const mutedLabelClass = "text-foreground/60";
  const inputBgClass = "bg-secondary border-border";
  const cardBgClass = "bg-secondary/50 border-border";

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a,audio/mp4,audio/webm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Left Column - Controls */}
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
            <Select value={genre} onValueChange={setGenre}>
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

        {/* Upload Track Area - same position as textarea in Create Cover */}
        <div className={`rounded-xl border p-4 ${cardBgClass}`}>
          {!selectedFile ? (
            /* Upload Button */
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing}
              className="w-full border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-primary/50 border-border bg-secondary/20 hover:bg-secondary/40 min-h-[120px] flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-secondary">
                <Upload className={`w-5 h-5 ${mutedTextClass}`} />
              </div>
              <p className={`font-medium text-base ${textClass}`}>
                Upload your track
              </p>
              <p className={`text-sm mt-1 ${mutedTextClass}`}>
                MP3, WAV, M4A • Max 20MB
              </p>
            </button>
          ) : isAnalyzing ? (
            /* Analyzing State */
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/20 mb-4">
                <Loader2 className="w-7 h-7 text-primary animate-spin" />
              </div>
              <p className={`font-medium ${textClass}`}>Analyzing your track...</p>
              <p className={`text-sm mt-1 ${mutedTextClass}`}>This may take a moment</p>
            </div>
          ) : !selectedOption ? (
            /* Show Cover Options */
            <div className="space-y-4">
              {/* File info header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/20">
                    <Music className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className={`font-medium text-sm truncate max-w-[200px] ${textClass}`}>
                      {selectedFile.name}
                    </p>
                    <div className="flex gap-2 mt-0.5">
                      {analysisResult && (
                        <>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                            {analysisResult.genre}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                            {analysisResult.mood}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={clearSelection}
                  className="p-1.5 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className={`w-4 h-4 ${mutedTextClass}`} />
                </button>
              </div>

              {/* Option Cards */}
              <div className="space-y-3">
                <p className={`text-sm font-medium ${textClass}`}>Choose a cover concept:</p>
                {coverOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleSelectOption(option)}
                    className="w-full text-left rounded-xl border border-border p-4 transition-all hover:border-primary/50 hover:bg-secondary/30"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={`font-medium ${textClass}`}>{option.title}</h4>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/60">
                          {option.mood}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/60">
                          {option.style}
                        </span>
                      </div>
                    </div>
                    <p className={`text-sm line-clamp-2 ${mutedTextClass}`}>
                      {option.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Selected Option - Edit Mode */
            <div className="space-y-4">
              {/* Back button */}
              <button
                onClick={handleRevealOptions}
                disabled={isGenerating}
                className={`flex items-center gap-1.5 text-sm ${mutedTextClass} hover:text-foreground transition-colors`}
              >
                <ChevronLeft className="w-4 h-4" />
                Choose different option
              </button>

              {/* Selected option header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`font-medium ${textClass}`}>{selectedOption.title}</h4>
                  <div className="flex gap-1.5 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                      {selectedOption.mood}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                      {selectedOption.style}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => isEditingPrompt ? handleConfirmEdit() : setIsEditingPrompt(true)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  {isEditingPrompt ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Edit3 className={`w-4 h-4 ${mutedTextClass}`} />
                  )}
                </button>
              </div>

              {/* Prompt display/edit */}
              {isEditingPrompt ? (
                <Textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  placeholder="Edit the concept..."
                  className="min-h-[100px] resize-none bg-secondary/50 border-border"
                />
              ) : (
                <p className={`text-sm p-3 rounded-lg bg-secondary/30 ${mutedTextClass}`}>
                  {selectedOption.prompt}
                </p>
              )}

              {/* Generate button */}
              <Button
                onClick={handleGenerateCover}
                disabled={isGenerating || !songTitle.trim() || !artistName.trim()}
                className="w-full h-12"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Generate Cover Art
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Cover Preview */}
      <div className="lg:w-1/2 lg:max-h-full lg:overflow-hidden">
        <div className={`rounded-2xl border p-4 flex flex-col h-full overflow-hidden ${cardBgClass}`}>
          {generatedImage ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-display text-lg tracking-wide ${textClass}`}>YOUR COVER</h3>
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
              
              {/* Progress bar during generation */}
              {isGenerating && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${textClass}`}>Generating...</span>
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
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCover}
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
                <Button
                  variant="studio"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate("/edit-studio", {
                    state: {
                      imageUrl: generatedImage,
                      genre: selectedOption?.genre || genre,
                      style: selectedOption?.style || style,
                      mood: selectedOption?.mood || mood,
                      songTitle: songTitle.trim(),
                      artistName: artistName.trim(),
                    }
                  })}
                  disabled={isGenerating}
                >
                  Edit Cover
                </Button>
                
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
                    <div className="transition-opacity duration-700 ease-in-out animate-fade-in">
                      <h3 className={`font-display text-sm tracking-wide mb-1 ${textClass}`}>
                        Creating your cover...
                      </h3>
                      <p className={`text-xs px-4 ${mutedTextClass}`}>
                        Our AI is crafting unique artwork
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className={`font-display text-sm tracking-wide mb-1 ${textClass}`}>
                        Cover will appear here
                      </h3>
                      <p className={`text-xs px-4 ${mutedTextClass}`}>
                        Upload audio and select a concept
                      </p>
                    </>
                  )}
                </div>
              </div>

              {isGenerating && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${textClass}`}>Generating...</span>
                    <span className={mutedTextClass}>{Math.round(smoothProgress)}%</span>
                  </div>
                  <Progress value={smoothProgress} className="h-2" />
                </div>
              )}

              <div className="pt-4 text-center">
                <button
                  onClick={() => navigate("/profile")}
                  className="text-xs font-medium transition-colors underline text-foreground/60 hover:text-foreground"
                >
                  View Past Creations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
