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
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLButtonElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  return (
    <button
      ref={imgRef}
      onClick={onClick}
      className={`flex-shrink-0 w-28 h-16 rounded-lg border-2 overflow-hidden transition-all relative ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
    >
      {/* Skeleton placeholder */}
      <div 
        className={`absolute inset-0 bg-secondary animate-pulse transition-opacity duration-300 ${
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
      />
      
      {/* Actual image */}
      {isInView && (
        <img 
          src={src} 
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
        />
      )}
    </button>
  );
};
