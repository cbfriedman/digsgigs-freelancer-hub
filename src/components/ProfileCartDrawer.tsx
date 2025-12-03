import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLeadCostForIndustry } from "@/config/pricing";

interface ProfileCartDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileCartItem {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  industries: string[];
  leadTierDescription: string;
  timestamp: string;
}

export const ProfileCartDrawer = ({ open, onClose }: ProfileCartDrawerProps) => {
  const [cartItems, setCartItems] = useState<ProfileCartItem[]>([]);
  const navigate = useNavigate();

  // Load cart items from localStorage
  useEffect(() => {
    if (open) {
      const items = JSON.parse(localStorage.getItem("profileCart") || "[]");
      setCartItems(items);
    }
  }, [open]);

  const removeItem = (id: string) => {
    const updatedItems = cartItems.filter(item => item.id !== id);
    setCartItems(updatedItems);
    localStorage.setItem("profileCart", JSON.stringify(updatedItems));
    window.dispatchEvent(new Event('storage'));
    toast.success("Profile configuration removed from cart");
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("profileCart");
    window.dispatchEvent(new Event('storage'));
    toast.success("Cart cleared");
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    
    // Navigate to profession checkout page with cart data
    // Store cart items in sessionStorage for checkout page
    sessionStorage.setItem("profileCartCheckout", JSON.stringify(cartItems));
    navigate("/profession-checkout", { state: { profileConfigurations: cartItems } });
    onClose();
  };

  // Calculate estimated costs
  const calculateTotalEstimate = () => {
    // This is a placeholder - actual pricing would need lead quantities
    return cartItems.length * 100; // Simplified estimate
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Profile Cart ({cartItems.length})
          </SheetTitle>
          <SheetDescription>
            Review your profile configurations before proceeding
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-2">
                Add profile configurations from the pricing page
              </p>
            </div>
          ) : (
            <>
              {cartItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.companyName}</h3>
                        <p className="text-sm text-muted-foreground">{item.fullName}</p>
                        <p className="text-xs text-muted-foreground">{item.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Industries:</span>
                        <Badge variant="secondary">{item.industries.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {item.industries.map((industry, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {industry}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Tier: {item.leadTierDescription}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Profiles:</span>
                  <span className="font-bold">{cartItems.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Final pricing will be calculated based on your selected lead quantities
                </p>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="mt-6 gap-2 sm:gap-0">
          {cartItems.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full sm:w-auto"
              >
                Clear Cart
              </Button>
              <Button
                onClick={handleCheckout}
                className="w-full sm:w-auto"
              >
                Proceed to Registration
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
