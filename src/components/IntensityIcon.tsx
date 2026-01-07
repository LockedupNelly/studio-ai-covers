import React from "react";

interface IntensityIconProps {
  intensity: number; // 25, 50, 75, or 100
  className?: string;
}

// Diagonal arrow icon that fills with red based on intensity level
// 25% = 1/4 filled, 50% = 1/2 filled, 75% = 3/4 filled, 100% = fully filled
export const IntensityIcon: React.FC<IntensityIconProps> = ({ intensity, className = "w-5 h-5" }) => {
  // Calculate fill percentage (0-1)
  const fillPercent = Math.min(100, Math.max(0, intensity)) / 100;
  
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Background arrow outline (gray) */}
      <defs>
        {/* Gradient mask for progressive fill from bottom-left to top-right */}
        <linearGradient id={`intensity-fill-${intensity}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset={`${fillPercent * 100}%`} stopColor="hsl(0, 84%, 60%)" />
          <stop offset={`${fillPercent * 100}%`} stopColor="transparent" />
        </linearGradient>
        <clipPath id={`arrow-clip-${intensity}`}>
          <path d="M7 17L17 7M17 7H10M17 7V14" />
        </clipPath>
      </defs>
      
      {/* Background stroke (muted) */}
      <path
        d="M7 17L17 7M17 7H10M17 7V14"
        stroke="currentColor"
        strokeOpacity="0.3"
        fill="none"
      />
      
      {/* Filled portion (red) - using stroke with gradient */}
      <path
        d="M7 17L17 7M17 7H10M17 7V14"
        stroke="hsl(0, 84%, 60%)"
        strokeWidth="2.5"
        fill="none"
        strokeDasharray={`${fillPercent * 30} 100`}
        className="transition-all duration-200"
      />
    </svg>
  );
};

// Simpler version using filled rectangles
export const IntensityBar: React.FC<IntensityIconProps> = ({ intensity, className = "w-5 h-5" }) => {
  const levels = [25, 50, 75, 100];
  
  return (
    <div className={`flex items-end gap-[2px] ${className}`}>
      {levels.map((level, i) => (
        <div
          key={level}
          className={`w-1 rounded-sm transition-colors duration-200 ${
            intensity >= level ? "bg-destructive" : "bg-muted-foreground/30"
          }`}
          style={{ height: `${40 + i * 20}%` }}
        />
      ))}
    </div>
  );
};

// Arrow version with fill overlay
export const IntensityArrow: React.FC<IntensityIconProps> = ({ intensity, className = "w-5 h-5" }) => {
  // Calculate how many quarters are filled
  const quarters = Math.floor(intensity / 25);
  
  return (
    <div className={`relative ${className}`}>
      {/* Base arrow (outline) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full"
      >
        {/* Arrow path */}
        <path
          d="M7 17L17 7M17 7H10M17 7V14"
          stroke="currentColor"
          strokeOpacity="0.25"
        />
      </svg>
      
      {/* Red fill overlay based on intensity */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0 w-full h-full"
        style={{
          clipPath: `inset(${100 - intensity}% 0 0 0)`,
        }}
      >
        <path
          d="M7 17L17 7M17 7H10M17 7V14"
          stroke="hsl(0, 84%, 60%)"
          className="transition-all duration-200"
        />
      </svg>
    </div>
  );
};

export default IntensityArrow;
