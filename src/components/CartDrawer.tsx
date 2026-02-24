import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const { cartItems, removeFromCart, removePurchasedFromCart, clearCart, getTotalPrice, cartCount } = useCart();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Remove any cart items the user has already purchased (so purchased leads don't stay in cart)
  useEffect(() => {
    if (!open || cartItems.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const { data: profile } = await supabase.from("digger_profiles").select("id").eq("user_id", session.user.id).single();
      if (!profile || cancelled) return;
      const { data: purchases } = await supabase.from("lead_purchases").select("gig_id").eq("digger_id", profile.id).eq("status", "completed");
      if (!purchases?.length || cancelled) return;
      removePurchasedFromCart(purchases.map((p) => p.gig_id));
    })();
    return () => { cancelled = true; };
  }, [open, cartItems.length, removePurchasedFromCart]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to purchase leads",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // All leads are now non-exclusive
      const purchases = cartItems.map(item => ({
        gigId: item.id,
        exclusivityType: 'non-exclusive'
      }));
      
      const data = await invokeEdgeFunction<{ url?: string }>(supabase, "create-bulk-lead-purchase", {
        body: { purchases },
      });

      if (data?.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Redirecting to Checkout",
          description: "Complete your purchase in the new tab",
        });
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error?.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Lead Cart
            {cartCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {cartCount} {cartCount === 1 ? "item" : "items"}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review your leads before checkout
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                Browse gigs and add leads to your cart
              </p>
            </div>
          ) : (
            <>
              {cartItems.map((gig) => {
                return (
                  <Card key={gig.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{gig.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{gig.location}</p>
                        {gig.budget_min && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Budget: ${gig.budget_min.toLocaleString()}
                            {gig.budget_max ? ` - $${gig.budget_max.toLocaleString()}` : "+"}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(gig.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>

        {cartItems.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing 
                    ? "Processing..." 
                    : `Checkout (${cartCount} ${cartCount === 1 ? "lead" : "leads"})`
                  }
                </Button>
                <Button
                  variant="outline"
                  onClick={clearCart}
                  disabled={isProcessing}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cart
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
