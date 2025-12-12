import { Music, ImageIcon, Layers, Sparkles } from "lucide-react";
import logoWhite from "@/assets/logo-white.png";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-red-glow pointer-events-none" />
      
      {/* AI Trained Badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/20 mb-4 animate-pulse-slow">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold tracking-widest text-primary uppercase">
          AI Trained Specifically on Cover Art
        </span>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">
          System Online
        </span>
      </div>

      {/* Main Logo */}
      <img 
        src={logoWhite} 
        alt="Cover Art Maker" 
        className="w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl h-auto mb-6"
      />

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-muted-foreground text-center max-w-lg mb-4 tracking-wide">
        AI-Generated Graphics for Music Artists
      </p>

      {/* Sub-tagline */}
      <p className="text-sm text-foreground/60 text-center max-w-md mb-10">
        The only AI model trained exclusively on professional album artwork. 
        That's why artists choose us.
      </p>

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