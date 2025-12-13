import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Music, Sparkles, X, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AudioSuggestion {
  title: string;
  prompt: string;
  mood: string;
  style: string;
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

export const AudioAnalyzer = ({ themeMode, onAnalysisComplete, onGenerateSuggestion }: AudioAnalyzerProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AudioAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/webm'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        toast.error("Please upload an MP3, WAV, or M4A file");
        return;
      }
      
      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File size must be under 20MB");
        return;
      }
      
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select an audio file first");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Convert file to base64
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to base64 in chunks to avoid stack overflow
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

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      // Generate 3 suggestions based on the analysis
      const suggestions: AudioSuggestion[] = [
        {
          title: "Concept 1",
          prompt: data.suggestedPrompt,
          mood: data.detectedMood,
          style: data.suggestedStyle
        },
        {
          title: "Concept 2",
          prompt: `${data.suggestedPrompt} with abstract artistic elements and dynamic composition`,
          mood: data.detectedMood,
          style: data.suggestedStyle
        },
        {
          title: "Concept 3",
          prompt: `${data.suggestedPrompt} with minimalist approach and bold typography focus`,
          mood: data.detectedMood,
          style: data.suggestedStyle
        }
      ];

      const resultWithSuggestions = { ...data, suggestions };
      setAnalysisResult(resultWithSuggestions);
      toast.success("Audio analyzed successfully!");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to analyze audio. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateSuggestion = (suggestion: AudioSuggestion) => {
    if (analysisResult && onGenerateSuggestion) {
      onGenerateSuggestion(suggestion, analysisResult.suggestedGenre);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            themeMode === "light"
              ? "border-gray-300 hover:border-gray-400 bg-gray-50"
              : "border-border hover:border-primary/50 bg-secondary/30"
          }`}
        >
          <Upload className={`w-10 h-10 mx-auto mb-3 ${themeMode === "light" ? "text-gray-400" : "text-foreground/40"}`} />
          <p className={`font-medium ${themeMode === "light" ? "text-gray-700" : "text-foreground"}`}>
            Upload Audio File
          </p>
          <p className={`text-sm mt-1 ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
            MP3, WAV, or M4A (max 20MB)
          </p>
        </div>
      ) : (
        <div className={`rounded-lg p-4 ${themeMode === "light" ? "bg-gray-100" : "bg-secondary/50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                themeMode === "light" ? "bg-gray-200" : "bg-secondary"
              }`}>
                <Music className={`w-5 h-5 ${themeMode === "light" ? "text-gray-600" : "text-primary"}`} />
              </div>
              <div>
                <p className={`font-medium truncate max-w-[200px] ${themeMode === "light" ? "text-gray-800" : "text-foreground"}`}>
                  {selectedFile.name}
                </p>
                <p className={`text-xs ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className={themeMode === "light" ? "text-gray-500 hover:text-gray-700" : ""}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {!analysisResult && (
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full mt-4"
              variant={themeMode === "light" ? "default" : "studio"}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Analyzing Audio...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze & Generate Ideas
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {analysisResult && analysisResult.suggestions && (
        <div className="space-y-3">
          {/* Analysis Header */}
          <div className={`flex items-center gap-2 px-2 ${themeMode === "light" ? "text-green-700" : "text-green-400"}`}>
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-sm">3 Cover Concepts Generated</span>
          </div>

          {/* Genre & Mood Info */}
          <div className={`flex gap-4 px-2 text-xs ${themeMode === "light" ? "text-gray-600" : "text-foreground/60"}`}>
            <span><span className="font-medium">Genre:</span> {analysisResult.suggestedGenre}</span>
            <span><span className="font-medium">Mood:</span> {analysisResult.detectedMood}</span>
          </div>

          {/* 3 Suggestion Cards */}
          <div className="grid gap-3">
            {analysisResult.suggestions.map((suggestion, index) => (
              <div 
                key={index}
                className={`rounded-lg p-3 border ${
                  themeMode === "light" 
                    ? "bg-white border-gray-200" 
                    : "bg-secondary/30 border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm mb-1 ${themeMode === "light" ? "text-gray-800" : "text-foreground"}`}>
                      {suggestion.title}
                    </p>
                    <p className={`text-xs line-clamp-2 ${themeMode === "light" ? "text-gray-500" : "text-foreground/60"}`}>
                      {suggestion.prompt}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={themeMode === "light" ? "default" : "studio"}
                    onClick={() => handleGenerateSuggestion(suggestion)}
                    className="flex-shrink-0"
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    Generate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
