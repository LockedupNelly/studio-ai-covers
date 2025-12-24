import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditCoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  onEditComplete: (newImageUrl: string) => void;
}

export const EditCoverDialog = ({ 
  open, 
  onOpenChange, 
  imageUrl,
  onEditComplete
}: EditCoverDialogProps) => {
  const [editInstructions, setEditInstructions] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = async () => {
    if (!editInstructions.trim() || !imageUrl) {
      toast.error("Please describe what edits you want");
      return;
    }

    setIsEditing(true);

    try {
      const { data, error } = await supabase.functions.invoke("edit-cover", {
        body: {
          imageUrl,
          instructions: editInstructions.trim(),
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onEditComplete(data.imageUrl);
        toast.success("Cover edited successfully!");
        onOpenChange(false);
        setEditInstructions("");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Failed to edit cover:", error);
      toast.error("Failed to edit cover. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            EDIT COVER
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cover Preview */}
          <div className="flex gap-4">
            {imageUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img 
                  src={imageUrl} 
                  alt="Cover to edit" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-foreground/70 mb-1">
                Describe what changes you want made to your cover.
              </p>
              <p className="text-xs text-foreground/50">
                Examples: "Make the text smaller", "Add more contrast", "Make it darker"
              </p>
            </div>
          </div>

          {/* Edit Instructions Input */}
          <Textarea
            placeholder="Describe what changes you want..."
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            className="min-h-[120px] resize-none"
            disabled={isEditing}
          />

          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isEditing}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleEdit}
              disabled={isEditing || !editInstructions.trim()}
            >
              {isEditing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Apply Edits
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};