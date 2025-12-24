import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { GeneratorStudio } from "@/components/GeneratorStudio";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { AnimatedDotsBackground } from "@/components/AnimatedDotsBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, loading, signInWithGoogle } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  const [lastGenParams, setLastGenParams] = useState<{prompt: string; genre: string; style: string; mood: string} | null>(null);

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
    setLastGenParams({ prompt, genre, style, mood });

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

    try {
      const { data, error } = await supabase.functions.invoke("generate-cover", {
        body: { prompt, genre, style, mood, referenceImage, textStyleReferenceImage },
      });

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

        // Refresh credits after generation
        refetchCredits();

        // Save to database
        if (user) {
          const { error: saveError } = await supabase.from("generations").insert({
            user_id: user.id,
            prompt,
            genre,
            style,
            mood,
            image_url: data.imageUrl,
          });

          if (saveError) {
            console.error("Error saving generation:", saveError);
          }
        }

        // Check for style mismatch warning
        if (data.warning === "TEXT_STYLE_MISMATCH") {
          toast.info("Cover generated with style variation", {
            description: "The text style may differ slightly from your selection. You were not charged.",
            duration: 6000,
          });
        } else {
          toast.success("Cover art generated!", {
            description: `${genre} cover with ${style} style is ready.`,
          });
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast.error("Generation failed", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
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
