import { Music, ImageIcon, Layers, Sparkles } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-red-glow pointer-events-none" />
      
      {/* Status Badges - Horizontal */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold tracking-widest text-primary uppercase">
            Professional Grade AI
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-semibold tracking-widest text-primary uppercase">
            System Online
          </span>
        </div>
      </div>

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
      <p className="text-sm text-foreground/60 text-center max-w-md mb-4">
        Professional-grade AI built for album cover creation. 
        That's why artists choose us.
      </p>

      {/* Free credit callout */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/40 mb-10">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-primary">
          Sign up free and get 1 credit to create your first cover
        </span>
      </div>

      {/* Feature Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <FeatureBadge icon={Music} text="Streaming Ready" color="green" />
        <FeatureBadge icon={ImageIcon} text="3000px Resolution" color="default" />
        <FeatureBadge icon={Layers} text="100% Unique" color="yellow" />
      </div>
    </section>
  );
};

interface FeatureBadgeProps {
  icon: React.ElementType;
  text: string;
  color: "green" | "yellow" | "default";
}

const FeatureBadge = ({ icon: Icon, text, color }: FeatureBadgeProps) => {
  if (color === "default") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
        <Icon className="w-4 h-4 text-foreground" />
        <span className="text-xs font-semibold tracking-widest uppercase">{text}</span>
      </div>
    );
  }

  const colorClasses = {
    green: "border-green-500/50 bg-green-500/10 text-green-500",
    yellow: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${colorClasses[color]}`}>
      <Icon className="w-4 h-4" />
      <span className="text-xs font-semibold tracking-widest uppercase">{text}</span>
    </div>
  );
};