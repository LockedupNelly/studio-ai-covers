import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CREDIT_PACKAGES } from "@/lib/stripe-config";

const PurchaseCredits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    if (!user) {
      toast.error("Please sign in to purchase credits");
      return;
    }

    setLoading(packageId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "credits", packageId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        // Use location.href for mobile compatibility (popups are often blocked)
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Purchase Credits</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              GET MORE <span className="text-primary">CREDITS</span>
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Purchase credits to generate more cover art. Each credit = one cover generation.
            </p>
          </div>

          {/* Credit Packages */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-card rounded-2xl border p-6 transition-all ${
                  pkg.popular
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    BEST VALUE
                  </Badge>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    pkg.popular ? "bg-primary" : "bg-secondary"
                  }`}>
                    <Coins className={`w-6 h-6 ${pkg.popular ? "text-primary-foreground" : "text-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl">{pkg.credits}</h3>
                    <p className="text-xs text-foreground/60">CREDITS</p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">${pkg.price}</span>
                  <span className="text-foreground/60 text-sm ml-1">
                    (${(pkg.price / pkg.credits).toFixed(2)}/credit)
                  </span>
                </div>

                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary" />
                    {pkg.credits} cover generations
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary" />
                    Never expires
                  </li>
                  <li className="flex items-center gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-primary" />
                    3000×3000px quality
                  </li>
                </ul>

                <Button
                  variant={pkg.popular ? "studio" : "outline"}
                  className="w-full"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading === pkg.id}
                >
                  {loading === pkg.id ? "Loading..." : "Purchase"}
                </Button>
              </div>
            ))}
          </div>

          {/* Subscription CTA */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 md:p-8 text-center">
            <Sparkles className="w-8 h-8 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl mb-2">WANT UNLIMITED GENERATIONS?</h3>
            <p className="text-foreground/70 mb-6 max-w-md mx-auto">
              Subscribe to Pro Access and get unlimited generations, priority processing, and exclusive discounts.
            </p>
            <Button variant="studio" onClick={() => navigate("/pro-access")}>
              <Sparkles className="w-4 h-4" />
              View Pro Access Plans
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PurchaseCredits;