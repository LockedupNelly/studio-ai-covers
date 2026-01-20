import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AuthPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export const AuthPromptDialog = ({ 
  open, 
  onOpenChange,
  title = "Sign in to generate",
  description = "Create a free account to generate unlimited cover art. Your work will be saved automatically."
}: AuthPromptDialogProps) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate("/auth", { state: { returnTo: window.location.pathname } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-display tracking-wide">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleSignIn}
            className="w-full gap-2"
            size="lg"
          >
            <LogIn className="w-4 h-4" />
            Sign in or Create Account
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Continue exploring
          </Button>
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          Free to start • No credit card required
        </p>
      </DialogContent>
    </Dialog>
  );
};
