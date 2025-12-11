import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: 9.99,
    period: "month",
    icon: Zap,
    features: [
      "50 Generations / Month",
      "Standard Processing",
      "10% Off Add-Ons",
      "Email Support",
    ],
    popular: false,
  },
  {
    name: "Pro",
    price: 19.99,
    period: "month",
    icon: Sparkles,
    features: [
      "Unlimited Generations",
      "Priority Processing",
      "10% Off Add-Ons",
      "Priority Support",
      "Early Access Features",
    ],
    popular: true,
  },
  {
    name: "Studio",
    price: 49.99,
    period: "month",
    icon: Crown,
    features: [
      "Unlimited Generations",
      "Fastest Processing",
      "20% Off Add-Ons",
      "Dedicated Support",
      "Early Access Features",
      "Commercial License",
      "API Access",
    ],
    popular: false,
  },
];

const ProAccess = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-8 max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Pro Access</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl tracking-wide mb-4">
              UNLOCK <span className="text-primary">PRO ACCESS</span>
            </h1>
            <p className="text-foreground/70 max-w-xl mx-auto">
              Get unlimited generations, priority processing, and exclusive discounts on add-on products.
            </p>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative bg-card rounded-2xl border p-6 transition-all ${
                    plan.popular
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      MOST POPULAR
                    </Badge>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.popular ? "bg-primary" : "bg-secondary"
                    }`}>
                      <Icon className={`w-5 h-5 ${plan.popular ? "text-primary-foreground" : "text-foreground"}`} />
                    </div>
                    <h3 className="font-display text-xl">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-foreground/60">/{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "studio" : "outline"}
                    className="w-full"
                  >
                    Subscribe
                  </Button>
                </div>
              );
            })}
          </div>

          {/* FAQ or Note */}
          <div className="mt-12 text-center">
            <p className="text-sm text-foreground/60">
              All subscriptions include a 10% discount on add-on products. Cancel anytime.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProAccess;
