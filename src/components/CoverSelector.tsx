import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Upload, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Generation {
  id: string;
  image_url: string;
  song_title?: string | null;
  artist_name?: string | null;
  genre?: string;
  style?: string;
  mood?: string;
  prompt?: string;
  cover_analysis?: any;
}

interface CoverSelectorProps {
  onSelect: (cover: Generation) => void;
  onUpload: (imageUrl: string) => void;
}

export const CoverSelector = ({ onSelect, onUpload }: CoverSelectorProps) => {
  const { user } = useAuth();
  const [covers, setCovers] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCovers = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("list-generations", {
          body: { limit: 20, offset: 0 },
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create image to check dimensions
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (ev) => {
        img.src = ev.target?.result as string;
      };

      img.onload = () => {
        // Check if square
        if (Math.abs(img.width - img.height) > 10) {
          toast.error("Image must be square", {
            description: `Your image is ${img.width}x${img.height}. Please upload a square image.`,
          });
          setIsUploading(false);
          return;
        }

        // Use the data URL
        onUpload(img.src);
        setIsUploading(false);
      };

      img.onerror = () => {
        toast.error("Failed to load image");
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Failed to process image");
      setIsUploading(false);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
        <ImageIcon className="w-8 h-8 text-foreground/30" />
      </div>
      
      <h3 className="font-display text-lg tracking-wide mb-2">SELECT A COVER TO EDIT</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Choose from your previous creations or upload a new square image
      </p>

      {/* Upload Button */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="gap-2"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Image
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Must be a perfect square
        </p>
      </div>

      {/* Divider */}
      {covers.length > 0 && (
        <div className="flex items-center gap-4 w-full max-w-md mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">or select</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Covers Carousel */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your covers...</span>
        </div>
      ) : covers.length > 0 ? (
        <div className="relative w-full max-w-lg">
          {/* Scroll Buttons */}
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto px-10 py-2 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {covers.map((cover) => (
              <button
                key={cover.id}
                onClick={() => onSelect(cover)}
                className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all hover:scale-105"
              >
                <img
                  src={cover.image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
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
