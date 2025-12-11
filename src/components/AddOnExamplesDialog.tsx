import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";

interface AddOnExamplesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  mainImage: string;
}

// Filler example images - these would be replaced with actual examples
const fillerImages = [
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop",
];

export const AddOnExamplesDialog = ({ 
  open, 
  onOpenChange, 
  title, 
  mainImage 
}: AddOnExamplesDialogProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = [mainImage, ...fillerImages];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-gradient-to-b from-card to-background border-primary/30 p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display text-lg tracking-wide">{title}</h3>
              <p className="text-sm text-foreground/50">Example Gallery</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)}
            className="text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative p-6">
          {/* Main Image Container */}
          <div className="relative aspect-square bg-secondary/50 rounded-xl overflow-hidden border border-border shadow-2xl">
            <img
              src={images[currentIndex]}
              alt={`${title} example ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
            
            {/* Navigation Arrows */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background text-foreground rounded-full w-12 h-12 shadow-lg border border-border"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background text-foreground rounded-full w-12 h-12 shadow-lg border border-border"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>
          </div>

          {/* Thumbnails */}
          <div className="flex justify-center gap-3 mt-4">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden transition-all ${
                  idx === currentIndex 
                    ? "ring-2 ring-primary scale-105" 
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          
          {/* Counter */}
          <div className="text-center mt-4 text-sm text-foreground/50">
            <span className="text-primary font-semibold">{currentIndex + 1}</span> / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};