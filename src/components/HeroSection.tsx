import { Music, ImageIcon, Layers } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-red-glow pointer-events-none" />
      
      {/* Status Badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-8 animate-pulse-slow">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-xs font-semibold tracking-widest text-primary uppercase">
          System Online
        </span>
      </div>

      {/* Main Heading */}
      <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-center leading-none tracking-tight mb-6">
        COVER ART
        <br />
        <span className="text-primary">MAKER</span>
      </h1>

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-muted-foreground text-center max-w-lg mb-10 tracking-wide">
        AI-Generated Graphics for Music Artists
      </p>

      {/* Feature Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <FeatureBadge icon={Music} text="Spotify Ready" variant="outline" />
        <FeatureBadge icon={ImageIcon} text="3000px Resolution" variant="filled" />
        <FeatureBadge icon={Layers} text="100% Unique" variant="outline" />
      </div>
    </section>
  );
};

interface FeatureBadgeProps {
  icon: React.ElementType;
  text: string;
  variant: "outline" | "filled";
}

const FeatureBadge = ({ icon: Icon, text, variant }: FeatureBadgeProps) => {
  if (variant === "filled") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
        <Icon className="w-4 h-4 text-foreground" />
        <span className="text-xs font-semibold tracking-widest uppercase">{text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/5">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs font-semibold tracking-widest text-primary uppercase">{text}</span>
    </div>
  );
};
