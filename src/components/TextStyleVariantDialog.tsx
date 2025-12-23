import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { TextStyleVariant, getTextStyleVariants } from "@/lib/text-style-variants";
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
  const [pendingVariant, setPendingVariant] = useState<TextStyleVariant | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const isMobile = useIsMobile();

  const itemsPerPage = isMobile ? 2 : 4;
  const totalPages = Math.ceil(variants.length / itemsPerPage);

  useEffect(() => {
    if (open && styleId) {
      const localVariants = getTextStyleVariants(styleId);
      setVariants(localVariants);
      setCurrentPage(0);
      // Pre-select the currently selected variant if any
      const currentSelected = localVariants.find(v => v.id === selectedVariantId);
      setPendingVariant(currentSelected || null);
    }
  }, [open, styleId, selectedVariantId]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const handleConfirm = () => {
    if (pendingVariant) {
      onSelectVariant(pendingVariant);
      onOpenChange(false);
    }
  };

  const currentVariants = variants.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {styleName} Styles
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              Click to choose from {variants.length} styles
            </span>
          </div>
          <DialogDescription className="text-muted-foreground">
            Select a specific style variation. The AI will generate text matching your choice exactly.
          </DialogDescription>
        </DialogHeader>

        {variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">No variants available for this style</span>
          </div>
        ) : (
          <div className="mt-4">
            {/* Variant Grid */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              {currentVariants.map((variant) => (
                <button
                  key={variant.id}
                  onClick={() => setPendingVariant(variant)}
                  className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 text-left w-full ${
                    pendingVariant?.id === variant.id
                      ? "border-destructive ring-2 ring-destructive/30"
                      : "border-border hover:border-muted-foreground/50"
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
                    {pendingVariant?.id === variant.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-destructive-foreground" />
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Variant Info */}
                  <div className="p-3 bg-card">
                    <h3 className="font-semibold text-foreground text-sm">{variant.name}</h3>
                  </div>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!pendingVariant}
            className={pendingVariant ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
