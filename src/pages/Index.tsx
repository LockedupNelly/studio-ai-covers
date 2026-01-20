import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { Footer } from "@/components/Footer";
import { WelcomeModal } from "@/components/WelcomeModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Layers, Palette, Sun, Wand2, Image as ImageIcon, Star, Check, Sparkles, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { HomepageStructuredData, ReviewSchema } from "@/components/StructuredData";
// All 6 covers for examples section (Yellow Guitar at end for less visibility)
const exampleCovers = [
  "/examples/cover-1.jpg", // Die For You
  "/examples/cover-2.jpg", // Heading Home
  "/examples/cover-3.jpg", // Lost Without You
  "/examples/cover-4.jpg", // Deathtome
  "/examples/cover-6.jpg", // Interdimensional
  "/examples/cover-5.jpg", // Yellow Guitar (last = less visible)
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Reviews data for structured data
  const reviews = [
    { author: "Marcus J.", reviewBody: "Finally, cover art that matches my sound. The AI understood exactly what I needed.", ratingValue: 5 },
    { author: "Luna S.", reviewBody: "Saved me hundreds on designers. The quality is insane for the price.", ratingValue: 5 },
    { author: "DJ Krave", reviewBody: "The textures and effects in Edit Studio are game-changing. My covers stand out now.", ratingValue: 5 }
  ];

  return (
    <>
      <SEO pageKey="home" />
      <HomepageStructuredData />
      <ReviewSchema reviews={reviews} />
      
      <div className="min-h-screen bg-background relative">
        
        <WelcomeModal />
        <Header />
        
        <main className="pt-16 relative z-10">
          {/* Hero section */}
          <HeroSection />
        
        {/* Example Covers Section - Flows directly from hero */}
        <section id="examples" className="relative -mt-4 md:-mt-8 py-4 md:py-6 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-background" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            {/* Centered, bold text */}
            <div className="text-center mb-4 md:mb-6">
              <h2 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-display font-bold tracking-wide mb-1 md:mb-2">
                CREATED WITH <span className="text-primary">STUDIO AI</span>
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm font-medium">
                Cover art made by artists using our AI
              </p>
            </div>
            
            {/* Desktop - Horizontal tilted overlapping covers */}
            <div className="hidden md:flex justify-center items-center relative">
              <div className="flex items-center">
                {exampleCovers.map((cover, idx) => {
                  const rotations = [-4, -2, 0, 2, 4, 6];
                  
                  return (
                    <div
                      key={idx}
                      className="w-36 lg:w-44 aspect-square rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/40 transition-all duration-500 hover:scale-110 hover:z-50 hover:rotate-0 hover:border-primary/50 -ml-5 first:ml-0"
                      style={{
                        transform: `rotate(${rotations[idx]}deg)`,
                        zIndex: idx === 2 || idx === 3 ? 3 : idx === 1 || idx === 4 ? 2 : 1,
                      }}
                    >
                    <img 
                        src={cover} 
                        alt={`Example cover ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Mobile - Scrollable horizontal row */}
            <div className="flex md:hidden gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {exampleCovers.map((cover, idx) => (
                <div 
                  key={idx}
                  className="flex-shrink-0 w-28 aspect-square rounded-xl overflow-hidden border border-white/10 shadow-lg snap-center"
                >
                  <img 
                    src={cover} 
                    alt={`Example cover ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Complete Workflow Section - Studios as Steps */}
        <section className="relative py-12 md:py-16 px-4 overflow-hidden">
          {/* Background with red glow from sides */}
          <div className="absolute inset-0 bg-background" />
          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-[300px] h-[500px] bg-red-600/10 rounded-full blur-[50px] md:blur-[120px]" />
          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-[300px] h-[500px] bg-primary/10 rounded-full blur-[50px] md:blur-[120px]" />
          
          <div className="container mx-auto max-w-5xl relative z-10">
            {/* Main headline */}
            <div className="text-center mb-8 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-display tracking-tight mb-2">
                <span className="text-foreground">Two Studios. </span>
                <span className="text-primary">One Workflow.</span>
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto">
                Generate your cover, then perfect it. No subscriptions—just pay per cover.
              </p>
            </div>
            
            {/* Connected workflow */}
            <div className="relative">
              {/* Connection line - desktop only */}
              <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-px bg-gradient-to-r from-primary/50 via-white/30 to-white/50 z-20" />
              <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 items-center justify-center w-8 h-8 rounded-full bg-background border border-white/20">
                <ArrowRight className="w-4 h-4 text-white/60" />
              </div>
              
              <div className="grid lg:grid-cols-2 gap-4 lg:gap-8">
                {/* Step 1 - Design Studio */}
                <div className="group relative flex flex-col">
                  <div className="absolute -top-3 left-6 z-10">
                    <div className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg shadow-primary/25">
                      STEP 1
                    </div>
                  </div>
                  
                  <div className="relative p-5 md:p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden flex-1 flex flex-col">
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/15 rounded-full blur-3xl group-hover:bg-primary/25 transition-colors duration-500" />
                    
                    <div className="relative flex-1 flex flex-col">
                      <h3 className="text-xl md:text-2xl font-display mb-2">
                        <span className="text-primary">Design</span> Studio
                      </h3>
                      
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        Describe your vision and let the most advanced cover art AI bring it to life.
                      </p>
                      
                      <div className="space-y-2 mb-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-foreground/80">AI trained specifically for cover art</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Wand2 className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-foreground/80">50+ professional text styles</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm text-foreground/80">3000×3000px streaming-ready</span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                        className="w-full sm:w-auto gap-2 py-4 px-5 text-sm mt-auto"
                      >
                        Open Design Studio
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Step 2 - Edit Studio */}
                <div className="group relative flex flex-col">
                  <div className="absolute -top-3 left-6 z-10">
                    <div className="px-3 py-1 bg-white text-zinc-900 text-xs font-bold rounded-full shadow-lg">
                      STEP 2
                    </div>
                  </div>
                  
                  <div className="relative p-5 md:p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-background to-background overflow-hidden flex-1 flex flex-col">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500" />
                    
                    <div className="relative flex-1 flex flex-col">
                      <h3 className="text-xl md:text-2xl font-display mb-2">
                        <span className="bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">Edit</span> Studio
                      </h3>
                      
                      <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                        Where your cover becomes release-ready. Add textures, lighting, and finishing touches.
                      </p>
                      
                      <div className="space-y-2 mb-4 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Layers className="w-3 h-3 text-white/80" />
                          </div>
                          <span className="text-sm text-foreground/80">Premium textures & overlays</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Sun className="w-3 h-3 text-white/80" />
                          </div>
                          <span className="text-sm text-foreground/80">Cinematic lighting effects</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Palette className="w-3 h-3 text-white/80" />
                          </div>
                          <span className="text-sm text-foreground/80">Parental advisory badges</span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => user ? navigate("/edit-studio") : navigate("/auth")}
                        variant="outline"
                        className="w-full sm:w-auto gap-2 py-4 px-5 text-sm border-white/20 hover:bg-white/5 mt-auto"
                      >
                        Open Edit Studio
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof & Reviews Section - Flows naturally from above */}
        <section className="relative py-8 md:py-12 px-4 overflow-hidden -mt-4">
          {/* Subtle continuation of background */}
          <div className="absolute inset-0 bg-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-[50px] md:blur-[120px]" />
          
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm text-zinc-200">Loved by Artists</span>
              </div>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-display mb-2">
                Artists <span className="text-primary">Trust</span> Studio AI
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Thousands of covers created. Zero subscriptions.
              </p>
            </div>
            
            {/* Reviews - Horizontal scroll on mobile, grid on desktop */}
            <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 mb-6 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-4 md:mx-0 px-4 md:px-0 snap-x snap-mandatory md:snap-none scrollbar-hide">
              {[
                {
                  name: "Marcus J.",
                  role: "Hip-Hop Artist",
                  text: "Finally, cover art that matches my sound. The AI understood exactly what I needed.",
                  stars: 5
                },
                {
                  name: "Luna S.",
                  role: "Indie Producer",
                  text: "Saved me hundreds on designers. The quality is insane for the price.",
                  stars: 5
                },
                {
                  name: "DJ Krave",
                  role: "EDM Producer",
                  text: "The textures and effects in Edit Studio are game-changing. My covers stand out now.",
                  stars: 5
                }
              ].map((review, idx) => (
                <div key={idx} className="flex-shrink-0 w-[280px] md:w-auto p-4 md:p-5 rounded-xl bg-white/[0.03] border border-white/15 hover:border-white/25 transition-colors backdrop-blur-sm snap-center">
                  <div className="flex gap-1 mb-2">
                    {Array.from({ length: review.stars }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-foreground/90 text-sm mb-3 leading-relaxed">"{review.text}"</p>
                  <div>
                    <p className="font-medium text-foreground text-sm">{review.name}</p>
                    <p className="text-muted-foreground text-xs">{review.role}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Stats row */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10 py-5 border-y border-white/15">
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl md:text-3xl font-display text-primary mb-1">10K+</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Covers Created</p>
              </div>
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl md:text-3xl font-display text-foreground mb-1">4.9★</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Average Rating</p>
              </div>
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl md:text-3xl font-display text-foreground mb-1">30+</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Art Styles</p>
              </div>
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl md:text-3xl font-display text-foreground mb-1">24/7</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  Support
                </p>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="flex justify-center mt-6">
              <Button
                size="lg"
                onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                className="gap-2 px-6 py-5 rounded-full bg-gradient-to-r from-primary to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Start Creating Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Visual Journey: Idea → Creation → Streaming */}
        <section className="relative py-16 md:py-24 px-4 overflow-hidden">
          {/* Natural gradient transition to lighter tones */}
          <div className="absolute inset-0 bg-gradient-to-b from-background via-zinc-900/80 to-zinc-800/60" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-white/8 rounded-full blur-[60px] md:blur-[150px]" />
          
          <div className="container mx-auto max-w-6xl relative z-10">
            {/* Visual Journey - Desktop */}
            <div className="hidden lg:flex items-center justify-center gap-6 mb-12">
              {/* Step 1: The Idea - Thought bubble */}
              <div className="flex flex-col items-center group">
                <div className="relative w-36 h-36 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-xl group-hover:border-white/20 transition-all duration-300">
                  {/* Thought bubbles */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-zinc-700 border border-white/10" />
                  <div className="absolute -top-5 right-1 w-3 h-3 rounded-full bg-zinc-700 border border-white/10" />
                  <div className="absolute -top-7 right-4 w-2 h-2 rounded-full bg-zinc-700 border border-white/10" />
                  {/* Music note idea */}
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-1">🎵</span>
                    <span className="text-[10px] text-muted-foreground/60">Your idea...</span>
                  </div>
                </div>
                <span className="mt-3 text-sm text-muted-foreground font-medium">Your Vision</span>
              </div>
              
              {/* Arrow 1 */}
              <div className="flex items-center gap-2 px-2">
                <div className="w-20 h-0.5 bg-gradient-to-r from-white/10 via-white/20 to-primary/60 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>
              
              {/* Step 2: AI Creates - Cover being generated */}
              <div className="flex flex-col items-center group">
                <div className="relative w-36 h-36 rounded-2xl bg-gradient-to-br from-primary/20 to-red-900/30 border border-primary/30 flex items-center justify-center shadow-xl overflow-hidden group-hover:border-primary/50 transition-all duration-300">
                  {/* Sparkle effects */}
                  <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse delay-300" />
                  <div className="absolute top-1/2 right-3 w-1 h-1 rounded-full bg-white/50 animate-pulse delay-500" />
                  {/* Mini cover preview with glow */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-primary/50 shadow-lg shadow-primary/30">
                    <img src={exampleCovers[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <Wand2 className="absolute -bottom-1 -right-1 w-9 h-9 text-primary p-1.5 bg-zinc-900 rounded-full border border-primary/50" />
                </div>
                <span className="mt-3 text-sm text-primary font-semibold">AI Creates</span>
              </div>
              
              {/* Arrow 2 - Red to Orange/Yellow gradient */}
              <div className="flex items-center gap-2 px-2">
                <div className="w-20 h-0.5 bg-gradient-to-r from-primary via-orange-500 to-amber-400 rounded-full" />
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              
              {/* Step 3: Streaming Services - Phone mockup with orange/yellow tones */}
              <div className="flex flex-col items-center group">
                <div className="relative">
                  {/* Phone frame - compact */}
                  <div className="w-36 h-60 rounded-[24px] border-[3px] border-zinc-500 bg-zinc-900 shadow-2xl shadow-black/50 overflow-hidden p-1 group-hover:border-amber-400/50 transition-all duration-300">
                    <div className="w-full h-full rounded-[20px] bg-zinc-950 overflow-hidden flex flex-col">
                      {/* Notch */}
                      <div className="h-4 flex items-center justify-center">
                        <div className="w-10 h-3 bg-zinc-900 rounded-full" />
                      </div>
                      {/* Streaming UI - Orange/Yellow tones */}
                      <div className="flex-1 p-2 bg-gradient-to-b from-orange-900/40 via-zinc-950 to-zinc-950">
                        {/* Album cover */}
                        <div className="aspect-square rounded-lg overflow-hidden shadow-lg mb-2 border border-amber-500/30">
                          <img src={exampleCovers[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                        {/* Track info */}
                        <div className="text-[9px] text-white truncate font-semibold">Your Track</div>
                        <div className="text-[7px] text-white/50 mb-1.5">Your Name</div>
                        {/* Progress */}
                        <div className="h-0.5 bg-white/20 rounded-full mb-2">
                          <div className="h-full w-1/3 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full" />
                        </div>
                        {/* Controls */}
                        <div className="flex justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[5px] border-l-black border-y-[3px] border-y-transparent ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Music note badge - orange/yellow */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-400 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-sm">♪</span>
                  </div>
                </div>
                <span className="mt-3 text-sm text-amber-400 font-semibold">Streaming Services</span>
              </div>
            </div>
            
            {/* Mobile: Simplified visual - Clean horizontal flow */}
            <div className="lg:hidden flex flex-col items-center gap-6 mb-8">
              <div className="flex items-center justify-center gap-1">
                {/* Vision */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-2xl shadow-lg">🎵</div>
                  <span className="text-xs text-muted-foreground mt-2 font-medium">Vision</span>
                </div>
                
                {/* Arrow 1 */}
                <div className="flex items-center px-1">
                  <div className="w-6 h-0.5 bg-gradient-to-r from-white/20 to-primary/60 rounded-full" />
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
                
                {/* AI Creates */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden shadow-lg">
                    <img src={exampleCovers[0]} alt="" className="w-12 h-12 rounded object-cover" />
                  </div>
                  <span className="text-xs text-primary mt-2 font-medium">AI Creates</span>
                </div>
                
                {/* Arrow 2 */}
                <div className="flex items-center px-1">
                  <div className="w-6 h-0.5 bg-gradient-to-r from-primary via-orange-500 to-amber-400 rounded-full" />
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </div>
                
                {/* Streaming */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-900/30 to-amber-900/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-lg">📱</div>
                  <span className="text-xs text-amber-400 mt-2 font-medium">Streaming</span>
                </div>
              </div>
            </div>
              
            {/* Text & CTA - Centered */}
            <div className="text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary">Start for Free</span>
              </div>
              
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-display mb-3">
                Ready to Create Your Cover?
              </h2>
              
              <p className="text-muted-foreground mb-6 text-sm">
                Get 3 free credits. No credit card, no subscriptions—just pay per cover when you need more.
              </p>
              
              <div className="flex justify-center mb-6">
                <Button
                  size="lg"
                  onClick={() => user ? navigate("/design-studio") : navigate("/auth")}
                  className="gap-2 px-8 py-5 rounded-full bg-gradient-to-r from-primary to-red-600 shadow-[0_0_40px_rgba(239,68,68,0.3)] hover:shadow-[0_0_60px_rgba(239,68,68,0.5)] transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
                
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  3 Free Credits
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  No Watermarks
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  High Resolution
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
    </>
  );
};

export default Index;
