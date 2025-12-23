import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { TextStyleVariant, getTextStyleVariants, fetchVariantsFromGitHub } from "@/lib/text-style-variants";

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && styleId) {
      setIsLoading(true);
      
      // Try to fetch from GitHub first, fall back to local config
      fetchVariantsFromGitHub(styleId)
        .then((githubVariants) => {
          if (githubVariants && githubVariants.length > 0) {
            console.log(`Loaded ${githubVariants.length} variants from GitHub for ${styleId}`);
            setVariants(githubVariants);
          } else {
            // Fall back to local config
            const localVariants = getTextStyleVariants(styleId);
            console.log(`Using ${localVariants.length} local variants for ${styleId}`);
            setVariants(localVariants);
          }
        })
        .catch((error) => {
          console.error("Error fetching variants:", error);
          setVariants(getTextStyleVariants(styleId));
        })
        .finally(() => setIsLoading(false));
    }
  }, [open, styleId]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Choose {styleName} Variant
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a specific style variation. The AI will generate text matching your choice exactly.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading styles from registry...</span>
          </div>
        ) : variants.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-muted-foreground">No variants available for this style</span>
          </div>
        ) : (
          <>
            {variants[0]?.stylePath && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Loaded from GitHub registry
              </div>
            )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => {
                  onSelectVariant(variant);
                  onOpenChange(false);
                }}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 text-left ${
                  selectedVariantId === variant.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {/* Preview Image Placeholder */}
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 relative overflow-hidden">
                  {variant.previewImage ? (
                    <img 
                      src={variant.previewImage} 
                      alt={variant.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken images
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
                <div className="p-4 bg-card">
                  <h3 className="font-semibold text-foreground">{variant.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{variant.description}</p>
                </div>
              </button>
            ))}
          </div>
          </>
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
