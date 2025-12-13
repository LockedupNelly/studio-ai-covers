import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Send, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DesignerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  songTitle?: string;
  artistName?: string;
}

export const DesignerEditDialog = ({ 
  open, 
  onOpenChange, 
  imageUrl,
  songTitle,
  artistName 
}: DesignerEditDialogProps) => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim() || !user?.email) {
      toast.error("Please describe what edits you need");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-designer-edit", {
        body: {
          imageUrl,
          feedback: feedback.trim(),
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.user_metadata?.name,
          songTitle,
          artistName,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Designer edit request submitted!");
    } catch (error: any) {
      console.error("Failed to submit designer edit request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setFeedback("");
      setIsSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wide flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-primary" />
            REQUEST DESIGNER EDITS
          </DialogTitle>
        </DialogHeader>

        {isSubmitted ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-display text-lg mb-2">Request Submitted!</h3>
            <p className="text-foreground/70 text-sm mb-4">
              Our design team will review your request and deliver the edited cover to your email within 24 hours.
            </p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cover Preview */}
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden border border-border flex-shrink-0">
                <img 
                  src={imageUrl} 
                  alt="Cover to edit" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground/70 mb-1">
                  Tell our designers what you'd like fixed or improved on your cover art.
                </p>
                <p className="text-xs text-foreground/50">
                  Examples: "Fix the text alignment", "Remove the watermark effect", "Make the colors more vibrant"
                </p>
              </div>
            </div>

            {/* Feedback Input */}
            <Textarea
              placeholder="Describe what edits you need..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[120px] resize-none"
            />

            {/* Info */}
            <div className="bg-secondary/50 rounded-lg p-3 text-sm">
              <p className="text-foreground/80">
                <strong>Delivery:</strong> Within 24 hours via email
              </p>
              <p className="text-foreground/60 text-xs mt-1">
                Your edited cover will be sent to {user?.email}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting || !feedback.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
