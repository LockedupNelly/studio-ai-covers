import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { WelcomeModal } from "@/components/WelcomeModal";
import { AnimatedDotsBackground } from "@/components/AnimatedDotsBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Wand2, Palette, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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
        
        {/* Features Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-display text-center mb-4 tracking-wide">
              TWO POWERFUL <span className="text-primary">STUDIOS</span>
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              Create stunning cover art with our AI-powered Design Studio, then perfect every detail in our Edit Studio
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Design Studio Card */}
              <div className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Wand2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl mb-2 tracking-wide">DESIGN STUDIO</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Generate unique cover art using AI. Describe your vision, select styles, and let our advanced AI create professional artwork in seconds.
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      AI-powered generation
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Audio analysis for inspiration
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      30+ text styles to choose from
                    </li>
                  </ul>
                  <Button 
                    onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                    className="w-full group/btn"
                  >
                    {user ? "Open Design Studio" : "Sign in to Start"}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>

              {/* Edit Studio Card */}
              <div className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Palette className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-xl mb-2 tracking-wide">EDIT STUDIO</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Perfect your covers with powerful editing tools. Add textures, lighting effects, parental advisory labels, and more.
                  </p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Textures & lighting overlays
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Parental advisory badges
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Color grading & effects
                    </li>
                  </ul>
                  <Button 
                    variant="outline"
                    onClick={() => user ? navigate("/profile") : navigate("/auth")}
                    className="w-full group/btn"
                  >
                    {user ? "View My Creations" : "Sign in to Start"}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FAQSection />
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
