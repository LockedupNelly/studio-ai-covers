import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CREDIT_PACKAGES } from "@/lib/stripe-config";
import { SEO } from "@/components/SEO";
import { ProductSchema, BreadcrumbSchema } from "@/components/StructuredData";
import { SITE_CONFIG } from "@/lib/seo-config";

const PurchaseCredits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const breadcrumbs = [
    { name: "Home", url: SITE_CONFIG.url },
    { name: "Purchase Credits", url: `${SITE_CONFIG.url}/purchase-credits` }
  ];

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
    <>
      <SEO pageKey="purchaseCredits" />
      <ProductSchema />
      <BreadcrumbSchema items={breadcrumbs} />
      
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
            <h1 className="font-display text-3xl md:text-5xl tracking-wide mb-4">
              GET MORE <span className="text-primary">CREDITS</span>
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto text-sm md:text-base">
              Purchase credits to generate more cover art. Each credit = one generation or one edit session.
            </p>
          </div>

          {/* Credit Packages */}
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-12">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-card rounded-xl md:rounded-2xl border p-4 md:p-6 transition-all ${
                  pkg.popular
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs">
                    BEST VALUE
                  </Badge>
                )}

                <div className="flex items-center justify-between md:flex-col md:items-start gap-2 md:gap-0 md:mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center ${
                      pkg.popular ? "bg-primary" : "bg-secondary"
                    }`}>
                      <Coins className={`w-5 h-5 md:w-6 md:h-6 ${pkg.popular ? "text-primary-foreground" : "text-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display text-xl md:text-2xl">{pkg.credits}</h3>
                      <p className="text-[10px] md:text-xs text-foreground/60">CREDITS</p>
                    </div>
                  </div>
                  <div className="text-right md:text-left md:mt-4">
                    <span className="text-2xl md:text-4xl font-bold text-foreground">${pkg.price}</span>
                    <span className="text-foreground/60 text-xs md:text-sm ml-1">
                      (${(pkg.price / pkg.credits).toFixed(2)}/credit)
                    </span>
                  </div>
                </div>

                <ul className="space-y-2 mb-4 md:mb-6 mt-3">
                  <li className="flex items-center gap-2 text-xs md:text-sm text-foreground/80">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span>{pkg.credits} cover generations</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs md:text-sm text-foreground/80">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span>Never expires</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs md:text-sm text-foreground/80">
                    <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                    <span>3000×3000px quality</span>
                  </li>
                </ul>

                <Button
                  variant={pkg.popular ? "studio" : "outline"}
                  className="w-full mt-3 md:mt-0"
                  size="sm"
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading === pkg.id}
                >
                  {loading === pkg.id ? "Loading..." : "Purchase"}
                </Button>
              </div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
    </>
  );
};

export default PurchaseCredits;