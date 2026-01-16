import { useState, useEffect, useRef, useCallback } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface CoverAnalysis {
  dominantColors?: string[];
  subjectPosition?: string;
  safeTextZones?: string[];
  avoidZones?: string[];
  mood?: string;
}

interface Generation {
  id: string;
  image_url: string;
  song_title?: string | null;
  artist_name?: string | null;
  genre?: string;
  style?: string;
  mood?: string;
  prompt?: string;
  cover_analysis?: CoverAnalysis | null;
}

interface CoverSelectorProps {
  onSelect: (cover: Generation) => void;
}

// Lazy-loaded thumbnail component with blur placeholder
const LazyThumbnail = ({ 
  src, 
  alt, 
  className 
}: { 
  src: string; 
  alt: string; 
  className: string;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" } // Start loading 100px before entering viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Generate optimized thumbnail URL
  // If it's a Supabase Storage URL, we can use transform parameters
  const getThumbnailUrl = (url: string): string => {
    // Check if it's a Supabase storage URL
    if (url.includes('/storage/v1/object/')) {
      // Use Supabase image transformation for smaller size
      // Add width=200 for thumbnail
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}width=200&quality=80`;
    }
    // For other URLs (like replicate), return as-is
    return url;
  };

  return (
    <div ref={imgRef} className={`${className} relative bg-secondary/50`}>
      {/* Blur placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary/50 animate-pulse" />
      )}
      
      {/* Actual image - only load when in view */}
      {isInView && (
        <img
          src={getThumbnailUrl(src)}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)} // Still show placeholder on error
        />
      )}
    </div>
  );
};

export const CoverSelector = ({ onSelect }: CoverSelectorProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [covers, setCovers] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCovers = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("list-generations", {
          body: { limit: 50, offset: 0 },
        });

        if (error) throw error;
        if (data?.generations) {
          setCovers(data.generations);
        }
      } catch (err) {
        console.error("Error fetching covers:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCovers();
  }, [user]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = isMobile ? 180 : 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Responsive cover size
  const coverSize = isMobile ? "w-24 h-24" : "w-36 h-36";

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
        <ImageIcon className="w-7 h-7 md:w-8 md:h-8 text-foreground/30" />
      </div>
      
      <h3 className="font-display text-base md:text-lg tracking-wide mb-2">SELECT A COVER TO EDIT</h3>
      <p className="text-xs md:text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Choose from your previous creations
      </p>

      {/* Covers Carousel */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your covers...</span>
        </div>
      ) : covers.length > 0 ? (
        <div className="relative w-full max-w-xl">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full bg-background/90 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 md:gap-4 overflow-x-auto px-12 py-3 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {covers.map((cover) => (
              <button
                key={cover.id}
                onClick={() => onSelect(cover)}
                className={`flex-shrink-0 ${coverSize} rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:scale-105 shadow-md hover:shadow-lg`}
              >
                <LazyThumbnail
                  src={cover.image_url}
                  alt={cover.song_title ? `${cover.song_title} cover art` : "Album cover art"}
                  className="w-full h-full"
                />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No covers yet. Create one in Design Studio first!
        </p>
      )}
    </div>
  );
};
