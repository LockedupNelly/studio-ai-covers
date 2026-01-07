import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GeneratorStudio } from "@/components/GeneratorStudio";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { WelcomeModal } from "@/components/WelcomeModal";
import { AnimatedDotsBackground } from "@/components/AnimatedDotsBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface ReturnedState {
  returnedImage?: string;
  genre?: string;
  style?: string;
  mood?: string;
  textStyle?: string;
  songTitle?: string;
  artistName?: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Check for returned state from EditStudio
  const returnedState = location.state as ReturnedState | null;
  const [generatedImage, setGeneratedImage] = useState<string | null>(
    returnedState?.returnedImage || null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Listen for cover edit events from EditCoverDialog
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
    referenceImage?: string,
    textStyleReferenceImage?: string
  ) => {
    setIsGenerating(true);

    const extractInvokeErrorMessage = async (err: unknown): Promise<string> => {
      const anyErr: any = err as any;

      // supabase-js FunctionsHttpError shape
      const body = anyErr?.context?.body;
      if (body != null) {
        try {
          // In some builds, body can be a ReadableStream.
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
            // Not JSON (or already plain text) — return as-is if meaningful.
            if (raw.trim()) return raw.trim();
          }
        } catch {
          // ignore
        }
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

    // Clear any existing timeout
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
    }
    
    // Create abort controller for this generation
    abortControllerRef.current = new AbortController();
    
    // Set 3-minute client-side timeout (covers often take 90s+)
    const GENERATION_TIMEOUT = 180000; // 180 seconds
    let timedOut = false;
    
    // Track generation start time to check for recent covers on timeout
    const generationStartedAt = Date.now();
    
    generationTimeoutRef.current = setTimeout(async () => {
      timedOut = true;
      abortControllerRef.current?.abort();
      
      // Try to recover by checking if a cover was generated recently
      try {
        const { data } = await supabase.functions.invoke("list-generations", {
          body: { limit: 1, offset: 0 },
        });
        
        const latestCover = data?.generations?.[0];
        if (latestCover?.image_url && latestCover?.created_at) {
          const coverTime = new Date(latestCover.created_at).getTime();
          // If cover was created after we started generating (within last 4 mins)
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
      } catch {
        // Recovery failed, show timeout message
      }
      
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
            body: { prompt, genre, style, mood, referenceImage, textStyleReferenceImage },
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

          // Single-pass generation - image comes back complete
          if (data?.imageUrl) {
            setGeneratedImage(data.imageUrl);
            refetchCredits();

            toast.success("Cover art generated!", {
              description: `${genre} cover with ${style} style is ready.`,
            });
          }

          // Success: stop retry loop
          return;
        } catch (e) {
          if (timedOut) break;
          
          lastError = e;
          const msg = e instanceof Error ? e.message : String(e);

          const canRetry = attempt < maxAttempts && shouldRetry(msg);
          if (!canRetry) throw e;

          // brief backoff
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }

      // If all retries failed and not timed out, throw the last error
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
      // Clear timeout on completion
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-white/80 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <WelcomeModal />
      <Header />
      
      <main className="pt-16">
        {/* Hero section with animated dots */}
        <div className="relative">
          <AnimatedDotsBackground />
          <HeroSection />
        </div>
        
        {/* Generator section without animated dots */}
        {user ? (
          <GeneratorStudio 
            onGenerate={handleGenerate}
            generatedImage={generatedImage}
            isGenerating={isGenerating}
          />
        ) : (
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-4">
              Sign in to start creating your cover art
            </p>
            <button 
              onClick={() => navigate("/auth")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Sign in to get started
            </button>
          </div>
        )}

        <FAQSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
