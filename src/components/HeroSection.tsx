import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Main covers for hero (Yellow Guitar excluded for less visibility)
const exampleCovers = ["/examples/cover-1.jpg",
// Die For You
"/examples/cover-2.jpg",
// Heading Home
"/examples/cover-3.jpg",
// Lost Without You
"/examples/cover-4.jpg",
// Deathtome
"/examples/cover-6.jpg" // Interdimensional
];
export const HeroSection = () => {
  const navigate = useNavigate();
  return <section className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col items-center justify-center pt-8 pb-24 overflow-hidden">
      {/* Dark background with red hues */}
      <div className="absolute inset-0 bg-background" />
      
      {/* Red glow from top */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/20 rounded-full blur-[60px] md:blur-[150px]" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/15 rounded-full blur-[50px] md:blur-[120px]" />
      <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-red-700/10 rounded-full blur-[40px] md:blur-[100px]" />
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

      <div className="relative z-10 container mx-auto px-4 max-w-5xl">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left side - Text content */}
          <div className="flex-1 text-center lg:text-left max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-zinc-300">AI-Powered Cover Art</span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-display tracking-tight mb-6 leading-[1.1]">
              <span className="text-foreground">Create </span>
              <span className="relative inline-block">
                <span className="text-primary">Stunning</span>
                <svg className="absolute -bottom-2 left-0 w-full h-4 text-primary/40" viewBox="0 0 200 16" fill="none">
                  <path d="M2 14C50 2 150 2 198 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              <br />
              <span className="text-foreground">Cover Art</span>
            </h1>

            {/* Subheadline */}
            <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0">
              Professional AI-generated cover art in seconds. Describe your vision, choose a style, and watch the magic happen.
            </p>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Button size="lg" onClick={() => navigate("/design-studio")} className="gap-2 text-base px-8 py-6 rounded-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 shadow-[0_0_40px_rgba(239,68,68,0.25)] hover:shadow-[0_0_60px_rgba(239,68,68,0.4)] transition-all">
                Start Creating Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-8 justify-center lg:justify-start text-xs sm:text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                3 Free Credits
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                No Watermarks
              </div>
              <div className="flex items-center gap-2 text-primary underline underline-offset-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                No Card Required
              </div>
            </div>
          </div>

          {/* Right side - Floating covers showcase */}
          <div className="flex-1 relative w-full max-w-sm lg:max-w-md">
            <div className="relative aspect-square">
              {/* Main featured cover */}
              <div className="absolute inset-[12%] z-30 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 transform hover:scale-[1.02] transition-transform duration-500">
                <img src={exampleCovers[0]} alt="AI-generated album cover art - dark atmospheric hip-hop design with bold typography" className="w-full h-full object-cover" loading="eager" fetchPriority="high" />
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
              </div>

              {/* Floating cover 1 - top left */}
              <div className="absolute -top-2 -left-2 sm:top-0 sm:left-0 w-[32%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/40 transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                <img src={exampleCovers[1]} alt="Moody urban album cover art with neon lighting effects" className="w-full aspect-square object-cover" loading="lazy" />
              </div>

              {/* Floating cover 2 - top right */}
              <div className="absolute -top-2 -right-2 sm:top-0 sm:right-0 w-[28%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/40 transform rotate-12 hover:rotate-0 transition-transform duration-500">
                <img src={exampleCovers[2]} alt="Emotional R&B single cover with minimalist design" className="w-full aspect-square object-cover" loading="lazy" />
              </div>

              {/* Floating cover 3 - bottom left */}
              <div className="absolute -bottom-2 -left-2 sm:bottom-0 sm:left-0 w-[26%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/40 transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <img src={exampleCovers[3]} alt="Dark metal album artwork with dramatic lighting" className="w-full aspect-square object-cover" loading="lazy" />
              </div>

              {/* Floating cover 4 - bottom right */}
              <div className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 w-[30%] z-20 rounded-xl overflow-hidden shadow-xl shadow-black/40 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <img src={exampleCovers[4]} alt="Futuristic electronic music cover with abstract elements" className="w-full aspect-square object-cover" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>;
};