import { useState } from "react";

interface TextStyleThumbnailProps {
  src: string;
  alt: string;
  isSelected: boolean;
  onClick: () => void;
  priority?: boolean;
}

export const TextStyleThumbnail = ({ 
  src, 
  alt, 
  isSelected, 
  onClick,
  priority = false 
}: TextStyleThumbnailProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 w-28 h-16 rounded-lg border-2 overflow-hidden transition-colors bg-secondary ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
    >
      <img 
        src={src} 
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setIsLoaded(true)}
        loading={priority ? "eager" : "lazy"}
      />
    </button>
  );
};
