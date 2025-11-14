import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const calculateLeadPrice = (budgetMin: number | null): number => {
  if (!budgetMin || budgetMin === 0) return 50;
  return Math.max(50, budgetMin * 0.005);
};

export const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const { cartItems, removeFromCart, clearCart, totalPrice, cartCount } = useCart();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

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

      const gigIds = cartItems.map(item => item.id);
      
      const { data, error } = await supabase.functions.invoke("create-bulk-lead-purchase", {
        body: { gigIds },
      });

      if (error) throw error;

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
        description: error.message || "Failed to create checkout session",
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
            Review your selected gig leads before checkout
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
                const leadPrice = calculateLeadPrice(gig.budget_min);
                return (
                  <Card key={gig.id} className="p-4">
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
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-bold text-primary">${leadPrice.toFixed(2)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(gig.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
              
              <SheetFooter className="flex-col gap-2 sm:flex-col">
                <Button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? "Processing..." : `Checkout (${cartCount} ${cartCount === 1 ? "lead" : "leads"})`}
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
