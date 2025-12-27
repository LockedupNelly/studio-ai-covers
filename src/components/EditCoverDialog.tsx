import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

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
  const [progress, setProgress] = useState(0);

  const handleEdit = async () => {
    if (!editInstructions.trim() || !imageUrl) {
      toast.error("Please describe what edits you want");
      return;
    }

    setIsEditing(true);
    setProgress(0);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("edit-cover", {
        body: {
          imageUrl,
          instructions: editInstructions.trim(),
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        clearInterval(progressInterval);
        setProgress(100);
        onEditComplete(data.imageUrl);
        toast.success("Cover edited successfully!");
        onOpenChange(false);
        setEditInstructions("");
        setProgress(0);
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Failed to edit cover:", error);
      toast.error("Failed to edit cover. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setIsEditing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            EDIT COVER
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-6">
          {/* Left side - Cover Preview (larger) */}
          <div className="flex-shrink-0 w-64">
            {imageUrl && (
              <div className="w-full aspect-square rounded-lg overflow-hidden border-2 border-border">
                <img 
                  src={imageUrl} 
                  alt="Cover to edit" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Right side - Instructions */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <p className="text-sm text-foreground/70 mb-1">
                Describe what changes you want made to your cover.
              </p>
              <p className="text-xs text-foreground/50">
                Examples: "Make the text smaller", "Add more contrast", "Make it darker", "Change the background color"
              </p>
            </div>

            <Textarea
              placeholder="Describe what changes you want..."
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              className="flex-1 min-h-[140px] resize-none"
              disabled={isEditing}
            />

            {/* Progress bar during editing */}
            {isEditing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">Applying edits...</span>
                  <span className="text-foreground/50">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
};
