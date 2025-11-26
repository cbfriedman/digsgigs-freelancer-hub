import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

interface ProfessionItem {
  keyword: string;
  quantity: number;
  costPerLead: number;
  tier: 'standard' | 'pro' | 'premium';
  totalCost: number;
}

interface CheckoutData {
  profileId: string;
  companyName: string;
  professions: ProfessionItem[];
  totalCost: number;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to continue with checkout");
      navigate("/register");
      return;
    }

    // Get checkout data from navigation state or localStorage
    const data = location.state?.checkoutData || JSON.parse(localStorage.getItem("checkoutData") || "null");
    
    if (!data) {
      toast.error("No checkout data found");
      navigate("/pricing");
      return;
    }

    setCheckoutData(data);
    setLoading(false);

    // Store in localStorage as backup
    localStorage.setItem("checkoutData", JSON.stringify(data));
  }, [user, navigate, location]);

  const handleCheckout = async () => {
    if (!checkoutData || !user) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-profession-checkout", {
        body: {
          profileId: checkoutData.profileId,
          professions: checkoutData.professions,
          totalAmount: checkoutData.totalCost,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to process checkout");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!checkoutData) {
    return null;
  }

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'standard':
        return 'secondary';
      case 'pro':
        return 'default';
      case 'premium':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <SEOHead
        title="Checkout - Digsandgigs"
        description="Complete your lead purchase on Digsandgigs"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <p className="text-muted-foreground">
              Review your order and complete your purchase
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Order Summary</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Company</span>
                    <span className="font-medium">{checkoutData.companyName}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Lead Packages:</h3>
                    {checkoutData.professions.map((profession, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{profession.keyword}</span>
                            <Badge variant={getTierBadgeVariant(profession.tier)}>
                              {profession.tier.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {profession.quantity} leads × ${profession.costPerLead.toFixed(2)} per lead
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${profession.totalCost.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">What You're Getting</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">24-hour exclusive lead access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Full contact information for each lead</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Real-time notifications for new matching gigs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Volume-based pricing automatically applied</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Unused credits roll over to next month</span>
                  </li>
                </ul>
              </Card>
            </div>

            {/* Payment Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${checkoutData.totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${checkoutData.totalCost.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  disabled={processing}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Proceed to Payment
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Secure payment powered by Stripe. Your payment information is encrypted and secure.
                </p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
