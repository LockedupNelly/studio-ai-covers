import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, Coins } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type");

  useEffect(() => {
    // Refresh subscription status after successful payment
    // This would be handled by the AuthContext in a real implementation
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-lg">
          <div className="bg-card rounded-2xl border border-primary/30 p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>

            <h1 className="font-display text-3xl mb-4">
              PAYMENT <span className="text-primary">SUCCESSFUL</span>
            </h1>

            {type === "credits" ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="text-foreground/70">Credits Added</span>
                </div>
                <p className="text-foreground/60 mb-8">
                  Your credits have been added to your account. You can now generate more cover art!
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-foreground/70">Subscription Activated</span>
                </div>
                <p className="text-foreground/60 mb-8">
                  Welcome to the team! Your subscription is now active. Enjoy unlimited generations and exclusive features.
                </p>
              </>
            )}

            <div className="flex flex-col gap-3">
              <Button variant="studio" onClick={() => navigate("/")}>
                Start Creating
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")}>
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;