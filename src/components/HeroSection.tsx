import { Sparkles } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[50vh] flex flex-col items-center justify-center pt-20 pb-8 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-red-glow pointer-events-none" />

      {/* Main Logo */}
      <img 
        src={logoWhite} 
        alt="Cover Art Maker" 
        className="w-full max-w-xs sm:max-w-sm md:max-w-md h-auto mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
      />

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-muted-foreground text-center max-w-lg mb-4 tracking-wide">
        AI-Generated Graphics for Music Artists
      </p>

      {/* Sub-tagline */}
      <p className="text-sm text-foreground/60 text-center max-w-md mb-4 px-4">
        Professional-grade AI built for album cover creation. 
        That's why artists choose us.
      </p>

      {/* Free credit callout */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-8">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary whitespace-nowrap">
          Sign up free — get 3 credits
        </span>
      </div>

    </section>
  );
};