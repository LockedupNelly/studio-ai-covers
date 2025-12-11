import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Coins, Sparkles, Check } from "lucide-react";

const creditPackages = [
  { credits: 5, price: 4.99, popular: false },
  { credits: 15, price: 12.99, popular: true },
  { credits: 30, price: 22.99, popular: false },
  { credits: 50, price: 34.99, popular: false },
];

const PurchaseCredits = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-8 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
              <Coins className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Credits</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              PURCHASE <span className="text-primary">CREDITS</span>
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Use credits to generate AI cover art. Each generation costs 1 credit.
            </p>
          </div>

          {/* Credit Packages */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {creditPackages.map((pkg) => (
              <div
                key={pkg.credits}
                className={`relative bg-card rounded-xl border p-6 text-center transition-all hover:border-primary ${
                  pkg.popular ? "border-primary" : "border-border"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                <div className="text-4xl font-display text-foreground mb-2">
                  {pkg.credits}
                </div>
                <div className="text-sm text-foreground/70 mb-4">Credits</div>
                <div className="text-2xl font-bold text-foreground mb-4">
                  ${pkg.price.toFixed(2)}
                </div>
                <Button variant={pkg.popular ? "default" : "outline"} className="w-full">
                  Buy Now
                </Button>
              </div>
            ))}
          </div>

          {/* Pro Access CTA */}
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl border border-primary/30 p-8 text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-display text-xl">PRO ACCESS</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl mb-4">
              UNLIMITED GENERATIONS + 10% OFF ADD-ONS
            </h2>
            <p className="text-foreground/70 max-w-lg mx-auto mb-6">
              Subscribe to Pro Access for unlimited cover art generations, priority processing, and 10% off all add-on products.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Check className="w-4 h-4 text-primary" />
                Unlimited Generations
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Check className="w-4 h-4 text-primary" />
                Priority Queue
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Check className="w-4 h-4 text-primary" />
                10% Off Add-Ons
              </div>
            </div>
            <Button 
              variant="studio" 
              size="lg"
              onClick={() => navigate("/pro-access")}
            >
              <Sparkles className="w-4 h-4" />
              View Pro Plans
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PurchaseCredits;
