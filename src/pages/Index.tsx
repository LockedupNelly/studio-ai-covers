import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { FAQSection } from "@/components/FAQSection";
import { Footer } from "@/components/Footer";
import { WelcomeModal } from "@/components/WelcomeModal";
import { AnimatedDotsBackground } from "@/components/AnimatedDotsBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Wand2, Sparkles, ArrowRight, Music, Layers, Palette, Headphones, Type, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

const exampleCovers = [
  "/examples/cover-1.jpg",
  "/examples/cover-2.jpg",
  "/examples/cover-3.jpg",
  "/examples/cover-4.jpg",
  "/examples/cover-5.jpg",
  "/examples/cover-6.jpg",
];

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
        
        {/* Example Covers Section - Moved up */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-display text-center mb-4 tracking-wide">
              CREATED WITH <span className="text-primary">COVER ART MAKER</span>
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              See what's possible with our AI-powered cover art generation
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {exampleCovers.map((cover, idx) => (
                <div 
                  key={idx}
                  className="aspect-square rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:scale-105 cursor-pointer"
                >
                  <img 
                    src={cover} 
                    alt={`Example cover ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            
            <div className="text-center mt-10">
              <Button 
                size="lg"
                onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                className="gap-2"
              >
                <Wand2 className="w-5 h-5" />
                Create Your Own
              </Button>
            </div>
          </div>
        </section>

        {/* Design Studio Focus Section */}
        <section className="py-20 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl md:text-4xl font-display text-center mb-4 tracking-wide">
              DESIGN <span className="text-primary">STUDIO</span>
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto text-lg">
              Create professional album covers in seconds with AI
            </p>
            
            {/* Feature Points Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI-Powered Generation</h3>
                  <p className="text-sm text-muted-foreground">Describe your vision and watch it come to life in seconds</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Audio Analysis</h3>
                  <p className="text-sm text-muted-foreground">Upload your track and let AI suggest the perfect vibe</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Type className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">30+ Text Styles</h3>
                  <p className="text-sm text-muted-foreground">Professional typography for every genre</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multiple Genres</h3>
                  <p className="text-sm text-muted-foreground">From Hip-Hop to Classical, we've got you covered</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Edit Studio</h3>
                  <p className="text-sm text-muted-foreground">Add textures, lighting, and parental advisory badges</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Streaming Ready</h3>
                  <p className="text-sm text-muted-foreground">3000x3000px resolution, perfect for all platforms</p>
                </div>
              </div>
            </div>
            
            {/* CTA */}
            <div className="text-center">
              <Button 
                size="lg"
                onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                className="gap-2 text-lg px-8 py-6"
              >
                Open Design Studio
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                {user ? "Jump right into creating" : "Sign up free — get 3 credits to start"}
              </p>
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
