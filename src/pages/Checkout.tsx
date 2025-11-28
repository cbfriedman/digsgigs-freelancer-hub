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
import { getLeadCostForIndustry } from "@/config/pricing";
import SEOHead from "@/components/SEOHead";

interface LeadSelection {
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selections, setSelections] = useState<LeadSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Get profileId from URL params
  const searchParams = new URLSearchParams(location.search);
  const profileId = searchParams.get('profileId');

  useEffect(() => {
    if (!user) {
      toast.error("Please log in to continue with checkout");
      navigate("/register");
      return;
    }

    // Get lead purchase selections from sessionStorage
    const savedSelections = sessionStorage.getItem('leadPurchaseSelections');
    console.log("Checkout - savedSelections:", savedSelections);
    
    if (!savedSelections) {
      console.log("Checkout - No data in sessionStorage, redirecting to pricing");
      toast.error("No checkout data found");
      navigate("/pricing");
      return;
    }

    try {
      const parsedSelections = JSON.parse(savedSelections);
      console.log("Checkout - Parsed selections:", parsedSelections);
      setSelections(parsedSelections);
      setLoading(false);
    } catch (error) {
      console.error("Error parsing checkout data:", error);
      toast.error("Invalid checkout data");
      navigate("/pricing");
    }
  }, [user, navigate]);

  const handleCheckout = async () => {
    if (selections.length === 0 || !user) return;

    setProcessing(true);
    try {
      const totalAmount = selections.reduce((sum, sel) => {
        const pricePerLead = getLeadCostForIndustry(sel.industry, sel.exclusivity);
        return sum + (pricePerLead * sel.quantity);
      }, 0);

      const { data, error } = await supabase.functions.invoke("create-bulk-lead-checkout", {
        body: {
          selections: selections,
          totalAmount: totalAmount,
          diggerProfileId: profileId,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Redirect to Stripe checkout in same window
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

  if (!selections || selections.length === 0) {
    return null;
  }

  const calculateTotalCost = () => {
    return selections.reduce((sum, sel) => {
      const pricePerLead = getLeadCostForIndustry(sel.industry, sel.exclusivity);
      return sum + (pricePerLead * sel.quantity);
    }, 0);
  };

  const getExclusivityBadge = (exclusivity: string) => {
    switch (exclusivity) {
      case 'non-exclusive':
        return { variant: 'secondary' as const, label: 'Non-Exclusive' };
      case 'semi-exclusive':
        return { variant: 'default' as const, label: 'Semi-Exclusive (4 max)' };
      case 'exclusive-24h':
        return { variant: 'destructive' as const, label: '24hr Exclusive' };
      default:
        return { variant: 'outline' as const, label: exclusivity };
    }
  };

  const totalCost = calculateTotalCost();

  return (
    <>
      <SEOHead
        title="Checkout - Digsandgigs"
        description="Complete your lead purchase on Digsandgigs"
      />
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => {
              const backUrl = profileId 
                ? `/keyword-summary?profileId=${profileId}`
                : '/keyword-summary';
              navigate(backUrl);
            }}
            className="mb-4"
          >
            Back to Summary
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Checkout</h1>
            <p className="text-muted-foreground">
              Review and complete your lead purchase
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">Order Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    {selections.map((selection, idx) => {
                      const pricePerLead = getLeadCostForIndustry(selection.industry, selection.exclusivity);
                      const lineTotal = pricePerLead * selection.quantity;
                      const badge = getExclusivityBadge(selection.exclusivity);
                      
                      return (
                        <div key={idx} className="flex items-start justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{selection.keyword}</span>
                              <Badge variant={badge.variant}>
                                {badge.label}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {selection.quantity} leads × ${pricePerLead.toFixed(2)} per lead
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Industry: {selection.industry}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">${lineTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4">What You're Getting</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <span className="text-sm">Exclusive or shared lead access based on your selection</span>
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
                    <span className="text-sm">Instant lead award for exclusive purchases</span>
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
                    <span>${totalCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span>$0.00</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${totalCost.toFixed(2)}</span>
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
                  Secure payment powered by Stripe
                </p>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
