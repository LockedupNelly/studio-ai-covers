import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, Download, ArrowRight } from "lucide-react";

const WELCOME_DISMISSED_KEY = "coverartmaker_welcome_dismissed";

interface WelcomeStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: WelcomeStep[] = [
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "You have 3 free credits!",
    description: "Every new account gets 3 free generations to try out Cover Art Maker. No credit card needed.",
  },
  {
    icon: <Palette className="h-10 w-10 text-primary" />,
    title: "Describe your vision",
    description: "Enter your song title, artist name, and describe the artwork you imagine. Choose a genre, style, and mood to guide the AI.",
  },
  {
    icon: <Download className="h-10 w-10 text-primary" />,
    title: "Download & perfect",
    description: "Once generated, you can download your cover, or open the Edit Studio to make adjustments and try different variations.",
  },
];

export function WelcomeModal() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Only show for logged-in users
    if (!user || hasChecked) return;

    const checkIfNewUser = async () => {
      // Check if already dismissed for this user
      const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (dismissed === user.id) {
        setHasChecked(true);
        return;
      }

      // Check if user account was created recently (within last 5 minutes) 
      // This ensures modal only shows for truly new signups, not returning users
      const userCreatedAt = user.created_at ? new Date(user.created_at).getTime() : 0;
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const isNewlyCreatedAccount = userCreatedAt > fiveMinutesAgo;
      
      if (!isNewlyCreatedAccount) {
        // Not a new account, don't show welcome modal
        localStorage.setItem(WELCOME_DISMISSED_KEY, user.id);
        setHasChecked(true);
        return;
      }

      // Check if user has any generations (extra safety check)
      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) {
          console.error("Error checking generations:", error);
          setHasChecked(true);
          return;
        }

        // Only show welcome modal for newly created accounts with no generations
        if (!data || data.length === 0) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Error checking new user status:", err);
      }

      setHasChecked(true);
    };

    // Small delay to avoid flash during initial load
    const timer = setTimeout(checkIfNewUser, 1000);
    return () => clearTimeout(timer);
  }, [user, hasChecked]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(WELCOME_DISMISSED_KEY, user.id);
    }
    setIsOpen(false);
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
            {currentStepData.icon}
          </div>
          <DialogTitle className="text-xl">{currentStepData.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {isLastStep ? "Get Started" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
