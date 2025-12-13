import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Music, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AudioAnalysisResult {
  suggestedPrompt: string;
  detectedMood: string;
  suggestedGenre: string;
  suggestedStyle: string;
  confidence: number;
}

interface AudioAnalyzerProps {
  themeMode: "dark" | "light";
  onAnalysisComplete: (result: AudioAnalysisResult) => void;
}

export const AudioAnalyzer = ({ themeMode, onAnalysisComplete }: AudioAnalyzerProps) => {
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

      setAnalysisResult(data);
      toast.success("Audio analyzed successfully!");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("Failed to analyze audio. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyResult = () => {
    if (analysisResult) {
      onAnalysisComplete(analysisResult);
      toast.success("Analysis applied to generator!");
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
                  Analyze & Generate Prompt
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {analysisResult && (
        <div className={`rounded-lg p-4 space-y-3 ${themeMode === "light" ? "bg-green-50 border border-green-200" : "bg-green-500/10 border border-green-500/30"}`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${themeMode === "light" ? "text-green-600" : "text-green-500"}`} />
            <span className={`font-medium ${themeMode === "light" ? "text-green-800" : "text-green-400"}`}>
              Analysis Complete
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <p className={themeMode === "light" ? "text-gray-700" : "text-foreground/80"}>
              <span className="font-medium">Detected Genre:</span> {analysisResult.suggestedGenre}
            </p>
            <p className={themeMode === "light" ? "text-gray-700" : "text-foreground/80"}>
              <span className="font-medium">Mood:</span> {analysisResult.detectedMood}
            </p>
            <p className={themeMode === "light" ? "text-gray-700" : "text-foreground/80"}>
              <span className="font-medium">Style:</span> {analysisResult.suggestedStyle}
            </p>
            <p className={`${themeMode === "light" ? "text-gray-600" : "text-foreground/70"} italic`}>
              "{analysisResult.suggestedPrompt}"
            </p>
          </div>

          <Button
            onClick={handleApplyResult}
            className="w-full"
            variant={themeMode === "light" ? "default" : "studio"}
          >
            Apply to Generator
          </Button>
        </div>
      )}
    </div>
  );
};
