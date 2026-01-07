import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

export const CartSheet = () => {
  const { items, removeItem, clearCart, isOpen, setIsOpen, total } = useCart();
  const { user, signInWithGoogle } = useAuth();
  const { subscriptionTier } = useCredits();
  const [loading, setLoading] = useState(false);

  // Calculate discount based on subscription
  const discountPercent = subscriptionTier === "studio" ? 20 : subscriptionTier === "pro" || subscriptionTier === "starter" ? 10 : 0;
  const discountAmount = total * (discountPercent / 100);
  const finalTotal = total - discountAmount;

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Please sign in to checkout");
      signInWithGoogle();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("addon-checkout", {
        body: { items },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.url) {
        window.location.href = data.url;
        clearCart();
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="bg-card border-border w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100vh-180px)]">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="w-12 h-12 text-foreground/30 mx-auto mb-3" />
                <p className="text-foreground/60">Your cart is empty</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-secondary rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate text-foreground">{item.title}</p>
                      <p className="text-primary font-bold text-sm">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-foreground/60 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/70">Subtotal</span>
                  <span className="text-foreground">${total.toFixed(2)}</span>
                </div>
                
                {discountPercent > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {subscriptionTier?.toUpperCase()} Discount ({discountPercent}% off)
                    </span>
                    <span className="text-green-500">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-lg text-foreground">${finalTotal.toFixed(2)}</span>
                </div>
                
                <Button 
                  variant="studio" 
                  className="w-full"
                  onClick={handleCheckout}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Checkout"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-foreground/60"
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
