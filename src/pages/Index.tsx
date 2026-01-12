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
        
        {/* Example Covers Section - Tighter spacing */}
        <section className="py-10 px-4">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-display text-center mb-3 tracking-wide">
              CREATED WITH <span className="text-primary">COVER ART MAKER</span>
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
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
            
            <div className="text-center mt-8">
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

        {/* Design Studio Focus Section - Premium White/Silver Theme */}
        <section className="relative py-24 px-4 overflow-hidden">
          {/* Gradient background - dark to silver/white */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-zinc-900/80 to-zinc-800/50" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
          
          {/* Top glow accent */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-white/5 to-transparent blur-3xl" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            {/* Section Header with silver accent */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-medium text-white/70 uppercase tracking-widest">The Creative Suite</span>
              </div>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-display text-center mb-6 tracking-wide">
                <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">DESIGN</span>
                <span className="text-primary ml-3">STUDIO</span>
              </h2>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
                Create professional album covers in seconds with AI
              </p>
            </div>
            
            {/* Feature Cards - Premium glassmorphism */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
              {[
                { icon: Sparkles, title: "AI-Powered Generation", desc: "Describe your vision and watch it come to life in seconds" },
                { icon: Headphones, title: "Audio Analysis", desc: "Upload your track and let AI suggest the perfect vibe" },
                { icon: Type, title: "30+ Text Styles", desc: "Professional typography for every genre" },
                { icon: Palette, title: "Multiple Genres", desc: "From Hip-Hop to Classical, we've got you covered" },
                { icon: Layers, title: "Edit Studio", desc: "Add textures, lighting, and parental advisory badges" },
                { icon: Music, title: "Streaming Ready", desc: "3000×3000px resolution, perfect for all platforms" },
              ].map((feature, idx) => (
                <div 
                  key={idx}
                  className="group relative p-5 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] hover:border-white/20 transition-all duration-300"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                      <feature.icon className="w-5 h-5 text-white/80 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm tracking-wider text-white/90 mb-1 uppercase">{feature.title}</h3>
                      <p className="text-sm text-zinc-500">{feature.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* CTA - Premium button */}
            <div className="text-center">
              <Button 
                size="lg"
                onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                className="gap-3 text-base md:text-lg px-8 md:px-12 py-6 md:py-7 rounded-full bg-gradient-to-r from-primary via-primary to-red-600 hover:from-red-600 hover:to-primary shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all duration-300"
              >
                Open Design Studio
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-sm text-zinc-500 mt-5">
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
