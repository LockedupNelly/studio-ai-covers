import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Trash2, ShoppingBag } from "lucide-react";

export const CartSheet = () => {
  const { items, removeItem, clearCart, isOpen, setIsOpen, total } = useCart();

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

              <div className="border-t border-border pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Subtotal</span>
                  <span className="font-bold text-lg text-foreground">${total.toFixed(2)}</span>
                </div>
                <Button variant="studio" className="w-full">
                  Checkout
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