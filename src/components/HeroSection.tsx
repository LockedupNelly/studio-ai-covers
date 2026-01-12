import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import logoWhite from "@/assets/logo-white.png";

const exampleCovers = [
  "/examples/cover-1.jpg",
  "/examples/cover-2.jpg",
  "/examples/cover-3.jpg",
  "/examples/cover-4.jpg",
  "/examples/cover-5.jpg",
  "/examples/cover-6.jpg",
];

export const HeroSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-8 pb-16 overflow-hidden">
      {/* Layered background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-zinc-900/50" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="relative z-10 container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left side - Text content */}
          <div className="flex-1 text-center lg:text-left max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Cover Art</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display tracking-tight mb-6 leading-[1.1]">
              <span className="text-foreground">Create </span>
              <span className="relative inline-block">
                <span className="text-primary">Stunning</span>
                <svg className="absolute -bottom-2 left-0 w-full h-4 text-primary/40" viewBox="0 0 200 16" fill="none">
                  <path d="M2 14C50 2 150 2 198 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
              </span>
              <br />
              <span className="text-foreground">Album Covers</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0">
              Professional AI-generated cover art in seconds. Describe your vision, choose a style, and watch the magic happen.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button 
                size="lg"
                onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                className="gap-2 text-base px-8 py-6 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] transition-all"
              >
                Start Creating Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost"
                size="lg"
                className="gap-2 text-base text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const section = document.getElementById('examples');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Play className="w-4 h-4" />
                See Examples
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 mt-8 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                3 Free Credits
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                No Card Required
              </div>
            </div>
          </div>

          {/* Right side - Floating covers showcase */}
          <div className="flex-1 relative w-full max-w-xl lg:max-w-none">
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Main featured cover */}
              <div className="absolute inset-[10%] z-30 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 transform hover:scale-105 transition-transform duration-500">
                <img 
                  src={exampleCovers[0]} 
                  alt="Featured cover" 
                  className="w-full h-full object-cover"
                />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              </div>

              {/* Floating cover 1 - top left */}
              <div className="absolute top-0 left-0 w-[35%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/30 transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={exampleCovers[1]} 
                  alt="Cover example" 
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Floating cover 2 - top right */}
              <div className="absolute top-0 right-0 w-[30%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/30 transform rotate-12 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={exampleCovers[2]} 
                  alt="Cover example" 
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Floating cover 3 - bottom left */}
              <div className="absolute bottom-0 left-0 w-[28%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/30 transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={exampleCovers[3]} 
                  alt="Cover example" 
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Floating cover 4 - bottom right */}
              <div className="absolute bottom-0 right-0 w-[32%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/30 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <img 
                  src={exampleCovers[4]} 
                  alt="Cover example" 
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border-2 border-primary/20 rounded-full" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 border border-white/10 rounded-full" />
              
              {/* Floating particles */}
              <div className="absolute top-1/4 -left-8 w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-1/4 -right-4 w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '1s' }} />
              <div className="absolute top-1/2 -right-12 w-4 h-4 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground animate-bounce">
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-muted-foreground to-transparent" />
      </div>
    </section>
  );
};
