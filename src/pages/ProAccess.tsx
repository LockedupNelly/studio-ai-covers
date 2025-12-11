import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Palette, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SUBSCRIPTION_TIERS } from "@/lib/stripe-config";

const plans = [
  {
    ...SUBSCRIPTION_TIERS.starter,
    icon: Zap,
    popular: false,
  },
  {
    ...SUBSCRIPTION_TIERS.pro,
    icon: Sparkles,
    popular: true,
  },
  {
    ...SUBSCRIPTION_TIERS.studio,
    icon: Crown,
    popular: false,
  },
];

const ProAccess = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    tier: string | null;
    subscription_end: string | null;
  }>({ subscribed: false, tier: null, subscription_end: null });
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setCheckingSubscription(false);
    }
  }, [user]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoading(tier);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "subscription", tier },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading("manage");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to open customer portal");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
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

          {/* Current Subscription Status */}
          {subscription.subscribed && (
            <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-green-500 font-semibold">Active Subscription</p>
                    <p className="text-foreground/70 text-sm">
                      You're on the <span className="capitalize font-medium">{subscription.tier}</span> plan
                      {subscription.subscription_end && (
                        <> · Renews {new Date(subscription.subscription_end).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={loading === "manage"}
                >
                  <Settings className="w-4 h-4" />
                  {loading === "manage" ? "Loading..." : "Manage Subscription"}
                </Button>
              </div>
            </div>
          )}

          {/* Real Designer Edits Feature */}
          <div className="mb-12 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-display text-xl mb-2">REAL DESIGNER EDITS</h3>
                <p className="text-foreground/70">
                  Pro and Studio subscribers get access to our professional design team. 
                  Request touch-ups, imperfection fixes, and enhancements on any generated cover. 
                  Our designers will refine your artwork to perfection.
                </p>
              </div>
            </div>
          </div>

          {/* Plans */}
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = subscription.tier === plan.id;
              return (
                <div
                  key={plan.name}
                  className={`relative bg-card rounded-2xl border p-6 transition-all ${
                    isCurrentPlan
                      ? "border-green-500 ring-2 ring-green-500/20"
                      : plan.popular
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white">
                      YOUR PLAN
                    </Badge>
                  )}
                  {!isCurrentPlan && plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                      MOST POPULAR
                    </Badge>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isCurrentPlan ? "bg-green-500" : plan.popular ? "bg-primary" : "bg-secondary"
                    }`}>
                      <Icon className={`w-5 h-5 ${isCurrentPlan || plan.popular ? "text-white" : "text-foreground"}`} />
                    </div>
                    <h3 className="font-display text-xl">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-foreground/60">/month</span>
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
                    variant={isCurrentPlan ? "outline" : plan.popular ? "studio" : "outline"}
                    className="w-full"
                    onClick={() => isCurrentPlan ? handleManageSubscription() : handleSubscribe(plan.id)}
                    disabled={loading === plan.id || loading === "manage"}
                  >
                    {loading === plan.id ? "Loading..." : isCurrentPlan ? "Manage" : "Subscribe"}
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