import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GeneratorStudio } from "@/components/GeneratorStudio";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ReturnedState {
  returnedImage?: string;
  genre?: string;
  style?: string;
  mood?: string;
  textStyle?: string;
  songTitle?: string;
  artistName?: string;
  prompt?: string;
  hadReferenceImages?: boolean;
}

const DesignStudio = () => {
  const { user, loading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const returnedState = location.state as ReturnedState | null;
  const [generatedImage, setGeneratedImage] = useState<string | null>(
    returnedState?.returnedImage || null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const handleCoverEdited = (event: CustomEvent<{ imageUrl: string }>) => {
      setGeneratedImage(event.detail.imageUrl);
    };

    window.addEventListener('coverEdited', handleCoverEdited as EventListener);
    return () => {
      window.removeEventListener('coverEdited', handleCoverEdited as EventListener);
    };
  }, []);

  const handleGenerate = async (
    prompt: string,
    genre: string,
    style: string,
    mood: string,
    referenceImages?: string[],
    textStyleReferenceImage?: string
  ) => {
    setIsGenerating(true);

    const extractInvokeErrorMessage = async (err: unknown): Promise<string> => {
      const anyErr = err as { context?: { body?: ReadableStream | string }; message?: string };
      const body = anyErr?.context?.body;
      if (body != null) {
        try {
          const raw =
            typeof body === "string"
              ? body
              : body?.getReader
                ? await new Response(body).text()
                : JSON.stringify(body);

          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error;
          } catch {
            if (raw.trim()) return raw.trim();
          }
        } catch {}
      }

      if (anyErr?.message) return String(anyErr.message);
      return "Please try again";
    };

    const shouldRetry = (message: string) => {
      const m = message.toLowerCase();
      return (
        m.includes("failed to fetch") ||
        m.includes("network") ||
        m.includes("cors") ||
        m.includes("timeout") ||
        m.includes("timed out") ||
        m.includes("502") ||
        m.includes("503") ||
        m.includes("504")
      );
    };

    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    
    abortControllerRef.current = new AbortController();
    
    const GENERATION_TIMEOUT = 180000;
    let timedOut = false;
    const generationStartedAt = Date.now();
    
    generationTimeoutRef.current = setTimeout(async () => {
      timedOut = true;
      abortControllerRef.current?.abort();
      
      try {
        const { data } = await supabase.functions.invoke("list-generations", {
          body: { limit: 1, offset: 0 },
        });
        
        const latestCover = data?.generations?.[0];
        if (latestCover?.image_url && latestCover?.created_at) {
          const coverTime = new Date(latestCover.created_at).getTime();
          if (coverTime > generationStartedAt - 10000) {
            setGeneratedImage(latestCover.image_url);
            setIsGenerating(false);
            refetchCredits();
            toast.success("Cover generated!", {
              description: "The request took longer than expected, but your cover is ready.",
            });
            return;
          }
        }
      } catch {}
      
      setIsGenerating(false);
      toast.error("Generation timed out", {
        description: "Your cover may still be processing. Check Recent Covers in a moment.",
      });
    }, GENERATION_TIMEOUT);

    try {
      const maxAttempts = 3;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (timedOut) break;
        
        try {
          const { data, error } = await supabase.functions.invoke("generate-cover", {
            body: { prompt, genre, style, mood, referenceImages, textStyleReferenceImage },
          });

          if (timedOut) break;

          if (error) {
            throw new Error(await extractInvokeErrorMessage(error));
          }

          if (data?.error) {
            if (data.error.includes("No credits")) {
              toast.error("No credits remaining", {
                description: "Purchase more credits to continue generating.",
              });
              navigate("/purchase-credits");
              return;
            }
            throw new Error(data.error);
          }

          if (data?.imageUrl) {
            setGeneratedImage(data.imageUrl);
            refetchCredits();

            toast.success("Cover art generated!", {
              description: `${genre} cover with ${style} style is ready.`,
            });
          }

          return;
        } catch (e) {
          if (timedOut) break;
          
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e);

          const canRetry = attempt < maxAttempts && shouldRetry(msg);
          if (!canRetry) throw e;

          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }

      if (!timedOut && lastError) {
        throw lastError;
      }
    } catch (error) {
      if (!timedOut) {
        console.error("Generation error:", error);
        toast.error("Generation failed", {
          description: error instanceof Error ? error.message : "Please try again",
        });
      }
    } finally {
      if (generationTimeoutRef.current) {
        clearTimeout(generationTimeoutRef.current);
        generationTimeoutRef.current = null;
      }
      if (!timedOut) {
        setIsGenerating(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-8">
        <GeneratorStudio 
          onGenerate={handleGenerate}
          generatedImage={generatedImage}
          isGenerating={isGenerating}
          initialState={returnedState ? {
            genre: returnedState.genre,
            style: returnedState.style,
            mood: returnedState.mood,
            textStyle: returnedState.textStyle,
            songTitle: returnedState.songTitle,
            artistName: returnedState.artistName,
            prompt: returnedState.prompt,
            hadReferenceImages: returnedState.hadReferenceImages,
          } : undefined}
        />
      </main>
      <Footer />
    </div>
  );
};

export default DesignStudio;
