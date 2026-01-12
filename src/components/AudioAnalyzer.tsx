import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Music, Sparkles, X, Wand2, Edit3, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AudioSuggestion {
  title: string;
  prompt: string;
  mood: string;
  style: string;
  isEditing?: boolean;
  editedPrompt?: string;
}

interface AudioAnalysisResult {
  suggestedPrompt: string;
  detectedMood: string;
  suggestedGenre: string;
  suggestedStyle: string;
  confidence: number;
  suggestions?: AudioSuggestion[];
}

interface AudioAnalyzerProps {
  themeMode: "dark" | "light";
  onAnalysisComplete: (result: AudioAnalysisResult) => void;
  onGenerateSuggestion?: (suggestion: AudioSuggestion, genre: string) => void;
}

const truncateWords = (text: string, maxWords: number): string => {
  const words = text.split(' ');
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

const generateDifferentConcepts = (data: AudioAnalysisResult): AudioSuggestion[] => {
  const basePrompt = data.suggestedPrompt;
  
  const conceptVariations: { title: string; modifier: string; moodTwist: string; styleTwist: string }[] = [
    {
      title: "Concept A",
      modifier: "with dramatic lighting and deep shadows, cinematic composition",
      moodTwist: data.detectedMood,
      styleTwist: data.suggestedStyle
    },
    {
      title: "Concept B", 
      modifier: "reimagined with abstract geometric shapes, vibrant colors, and surreal elements",
      moodTwist: data.detectedMood === "Dark" ? "Mysterious" : data.detectedMood === "Euphoric" ? "Dreamy" : "Ethereal",
      styleTwist: data.suggestedStyle === "Grunge" ? "Abstract Art" : data.suggestedStyle === "Neon Glow" ? "Surreal" : "Mixed Media"
    }
  ];

  return conceptVariations.map(variation => ({
    title: variation.title,
    prompt: truncateWords(`${basePrompt} ${variation.modifier}`, 30),
    mood: variation.moodTwist,
    style: variation.styleTwist,
    isEditing: false,
    editedPrompt: ""
  }));
};

export const AudioAnalyzer = ({ themeMode, onAnalysisComplete, onGenerateSuggestion }: AudioAnalyzerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<AudioSuggestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setAnalysisResult(null);
      setSuggestions([]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select an audio file first");
      return;
    }

    setIsAnalyzing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
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
          mimeType: selectedFile.type
        }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      const differentConcepts = generateDifferentConcepts(data);
      const resultWithSuggestions = { ...data, suggestions: differentConcepts };
      setAnalysisResult(resultWithSuggestions);
      setSuggestions(differentConcepts);
      toast.success("Audio analyzed successfully!");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to analyze audio. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleEdit = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => {
      if (i === index) {
        return {
          ...s,
          isEditing: !s.isEditing,
          editedPrompt: s.isEditing ? "" : s.prompt
        };
      }
      return s;
    }));
  };

  const handleUpdatePrompt = (index: number, newPrompt: string) => {
    setSuggestions(prev => prev.map((s, i) => {
      if (i === index) {
        return { ...s, editedPrompt: newPrompt };
      }
      return s;
    }));
  };

  const handleConfirmEdit = (index: number) => {
    setSuggestions(prev => prev.map((s, i) => {
      if (i === index && s.editedPrompt) {
        return { 
          ...s, 
          prompt: s.editedPrompt,
          isEditing: false,
          editedPrompt: ""
        };
      }
      return { ...s, isEditing: false };
    }));
  };

  const handleGenerateSuggestion = (suggestion: AudioSuggestion) => {
    if (analysisResult && onGenerateSuggestion) {
      onGenerateSuggestion(suggestion, analysisResult.suggestedGenre);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setSuggestions([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cardBg = themeMode === "light" ? "bg-gray-50 border-gray-200" : "bg-secondary/30 border-border";
  const textColor = themeMode === "light" ? "text-gray-900" : "text-foreground";
  const mutedText = themeMode === "light" ? "text-gray-500" : "text-foreground/60";

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/x-m4a,audio/mp4,audio/webm"
        onChange={handleFileSelect}
        className="hidden"
      />

      {!selectedFile ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all hover:border-primary/50 ${
            themeMode === "light"
              ? "border-gray-300 bg-gray-50/50 hover:bg-gray-100"
              : "border-border bg-secondary/20 hover:bg-secondary/40"
          }`}
        >
          <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${
            themeMode === "light" ? "bg-gray-200" : "bg-secondary"
          }`}>
            <Upload className={`w-5 h-5 ${mutedText}`} />
          </div>
          <p className={`font-medium text-sm ${textColor}`}>
            Upload your track
          </p>
          <p className={`text-xs mt-1 ${mutedText}`}>
            MP3, WAV, M4A • Max 20MB
          </p>
        </button>
      ) : !analysisResult ? (
        <div className={`rounded-xl border p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              themeMode === "light" ? "bg-primary/10" : "bg-primary/20"
            }`}>
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm truncate ${textColor}`}>
                {selectedFile.name}
              </p>
              <p className={`text-xs ${mutedText}`}>
                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={clearSelection}
              className={`p-1.5 rounded-full transition-colors ${
                themeMode === "light" ? "hover:bg-gray-200" : "hover:bg-secondary"
              }`}
            >
              <X className={`w-4 h-4 ${mutedText}`} />
            </button>
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full mt-4"
            size="default"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Track
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Analysis Summary */}
          <div className={`rounded-xl border p-4 ${cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  themeMode === "light" ? "bg-primary/10" : "bg-primary/20"
                }`}>
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className={`font-medium text-sm truncate ${textColor}`}>
                    {selectedFile.name}
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearSelection}
                className={`p-1.5 rounded-full transition-colors ${
                  themeMode === "light" ? "hover:bg-gray-200" : "hover:bg-secondary"
                }`}
              >
                <X className={`w-4 h-4 ${mutedText}`} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full ${
                themeMode === "light" ? "bg-gray-200 text-gray-700" : "bg-secondary text-foreground/80"
              }`}>
                {analysisResult.suggestedGenre}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                themeMode === "light" ? "bg-gray-200 text-gray-700" : "bg-secondary text-foreground/80"
              }`}>
                {analysisResult.detectedMood}
              </span>
            </div>
          </div>

          {/* Concept Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`rounded-xl border p-4 ${cardBg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-medium text-sm ${textColor}`}>
                    {suggestion.title}
                  </h4>
                  <button
                    onClick={() => suggestion.isEditing ? handleConfirmEdit(index) : handleToggleEdit(index)}
                    className={`p-1 rounded transition-colors ${
                      themeMode === "light" ? "hover:bg-gray-200" : "hover:bg-secondary"
                    }`}
                  >
                    {suggestion.isEditing ? (
                      <Check className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Edit3 className={`w-3.5 h-3.5 ${mutedText}`} />
                    )}
                  </button>
                </div>
                
                <div className="flex gap-1.5 mb-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    themeMode === "light" ? "bg-gray-200 text-gray-600" : "bg-secondary text-foreground/60"
                  }`}>
                    {suggestion.mood}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    themeMode === "light" ? "bg-gray-200 text-gray-600" : "bg-secondary text-foreground/60"
                  }`}>
                    {suggestion.style}
                  </span>
                </div>

                {suggestion.isEditing ? (
                  <Textarea
                    value={suggestion.editedPrompt}
                    onChange={(e) => handleUpdatePrompt(index, e.target.value)}
                    placeholder="Edit the concept..."
                    className={`text-xs mb-3 min-h-[60px] resize-none ${
                      themeMode === "light" ? "bg-white border-gray-200" : "bg-secondary/50 border-border"
                    }`}
                  />
                ) : (
                  <p className={`text-xs mb-3 line-clamp-3 ${mutedText}`}>
                    {suggestion.prompt}
                  </p>
                )}
                
                <Button
                  size="sm"
                  onClick={() => handleGenerateSuggestion(suggestion)}
                  className="w-full"
                  disabled={suggestion.isEditing}
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
