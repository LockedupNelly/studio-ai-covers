import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg">{title} Examples</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="text-foreground/70 hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="relative">
          {/* Main Image */}
          <div className="aspect-square bg-secondary">
            <img
              src={images[currentIndex]}
              alt={`${title} example ${currentIndex + 1}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Navigation Arrows */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-primary" : "bg-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-4 text-center text-sm text-foreground/60">
          {currentIndex + 1} of {images.length}
        </div>
      </DialogContent>
    </Dialog>
  );
};
