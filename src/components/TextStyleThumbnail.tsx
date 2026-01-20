import { useState, useEffect, useRef } from "react";

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
  const [shouldLoad, setShouldLoad] = useState(priority);
  const ref = useRef<HTMLButtonElement>(null);

  // Only observe non-priority items
  useEffect(() => {
    if (priority) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: "50px",
        threshold: 0
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex-shrink-0 w-28 h-16 rounded-lg border-2 overflow-hidden transition-colors bg-secondary ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
    >
      {shouldLoad && (
        <img 
          src={src} 
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-150 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          loading={priority ? "eager" : "lazy"}
        />
      )}
    </button>
  );
};
