import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { TextStyleVariant, getTextStyleVariants } from "@/lib/text-style-variants";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

interface TextStyleVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleName: string;
  styleId: string;
  onSelectVariant: (variant: TextStyleVariant) => void;
  selectedVariantId?: string;
}

export function TextStyleVariantDialog({
  open,
  onOpenChange,
  styleName,
  styleId,
  onSelectVariant,
  selectedVariantId
}: TextStyleVariantDialogProps) {
  const [variants, setVariants] = useState<TextStyleVariant[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && styleId) {
      // Use local variants only - simple and reliable
      const localVariants = getTextStyleVariants(styleId);
      setVariants(localVariants);
    }
  }, [open, styleId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose {styleName} Variant
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a specific style variation. The AI will generate text matching your choice exactly.
          </DialogDescription>
        </DialogHeader>

        {variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">No variants available for this style</span>
          </div>
        ) : (
          <div className="mt-4 px-8">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {variants.map((variant) => (
                  <CarouselItem 
                    key={variant.id} 
                    className={`pl-2 md:pl-4 ${isMobile ? 'basis-1/2' : 'basis-1/4'}`}
                  >
                    <button
                      onClick={() => {
                        onSelectVariant(variant);
                        onOpenChange(false);
                      }}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 text-left w-full ${
                        selectedVariantId === variant.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {/* Preview Image */}
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                        {variant.previewImage ? (
                          <img 
                            src={variant.previewImage} 
                            alt={variant.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <Sparkles className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                              <span className="text-sm text-muted-foreground">Preview</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Selected Indicator */}
                        {selectedVariantId === variant.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Variant Info */}
                      <div className="p-3 bg-card">
                        <h3 className="font-semibold text-foreground text-sm truncate">{variant.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{variant.description}</p>
                      </div>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-4 md:-left-6" />
              <CarouselNext className="-right-4 md:-right-6" />
            </Carousel>
            
            {/* Pagination indicator */}
            <div className="flex justify-center mt-4 gap-1">
              <span className="text-sm text-muted-foreground">
                Swipe or use arrows to see more • {variants.length} variants
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
