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
  id: string;
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
  isConfirmed: boolean;
  pricePerLead?: number;
  subtotal?: number;
}

interface DiscountInfo {
  subtotal: number;
  discountOnFirstThousand: number;
  discountOnExcess: number;
  totalDiscount: number;
  finalTotal: number;
}

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selections, setSelections] = useState<LeadSelection[]>([]);
  const [discountInfo, setDiscountInfo] = useState<DiscountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Get profileId from URL params
  const searchParams = new URLSearchParams(location.search);
  const profileId = searchParams.get('profileId');

  useEffect(() => {
    console.log("Checkout useEffect running, user:", user);
    
    // Get lead purchase selections from sessionStorage immediately
    const savedSelections = sessionStorage.getItem('leadPurchaseSelections');
    const savedDiscount = sessionStorage.getItem('leadPurchaseDiscount');
    console.log("Checkout - savedSelections:", savedSelections);
    console.log("Checkout - savedDiscount:", savedDiscount);
    
    if (!savedSelections) {
      console.log("Checkout - No data in sessionStorage, redirecting to pricing");
      toast.error("No checkout data found");
      navigate("/pricing");
      return;
    }

    try {
      const parsedSelections = JSON.parse(savedSelections);
      console.log("Checkout - Parsed selections:", parsedSelections);
      
      if (!parsedSelections || parsedSelections.length === 0) {
        console.log("Checkout - Empty selections array");
        toast.error("No items selected");
        navigate("/pricing");
        return;
      }
      
      setSelections(parsedSelections);
      
      // Load discount info if available
      if (savedDiscount) {
        const parsedDiscount = JSON.parse(savedDiscount);
        setDiscountInfo(parsedDiscount);
        console.log("Checkout - Discount info loaded:", parsedDiscount);
      }
      
      setLoading(false);
      console.log("Checkout - Loading set to false, selections set");
    } catch (error) {
      console.error("Error parsing checkout data:", error);
      toast.error("Invalid checkout data");
      navigate("/pricing");
    }
  }, [navigate]);

  const handleCheckout = async () => {
    console.log("=== CHECKOUT STARTED ===");
    console.log("User:", user);
    console.log("Selections:", selections);
    console.log("ProfileId:", profileId);
    
    if (!user) {
      console.error("No user found");
      toast.error("Please log in to continue");
      navigate("/register");
      return;
    }
    
    if (selections.length === 0) {
      console.error("No selections");
      return;
    }

    setProcessing(true);
    try {
      // Use discount info if available, otherwise calculate raw total
      const totalAmount = discountInfo ? discountInfo.finalTotal : selections.reduce((sum, sel) => {
        const pricePerLead = getLeadCostForIndustry(sel.industry, sel.exclusivity);
        return sum + (pricePerLead * sel.quantity);
      }, 0);

      console.log("Calculated total amount:", totalAmount);
      console.log("Discount info:", discountInfo);
      console.log("Calling edge function...");

      const { data, error } = await supabase.functions.invoke("create-bulk-lead-checkout", {
        body: {
          selections: selections,
          totalAmount: totalAmount,
          diggerProfileId: profileId,
          discountInfo: discountInfo,
        },
      });

      console.log("Edge function response:", { data, error });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data) {
        console.error("No data received from edge function");
        throw new Error("No response data received");
      }

      console.log("Checkout URL:", data.url);

      if (data.url) {
        console.log("Redirecting to Stripe checkout...");
        // Redirect to Stripe checkout in same window
        window.location.href = data.url;
      } else {
        console.error("No URL in response data:", data);
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("=== CHECKOUT ERROR ===");
      console.error("Error object:", error);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
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
      // Use saved subtotal if available, otherwise calculate
      if (sel.subtotal !== undefined) {
        return sum + sel.subtotal;
      }
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
                      // Use saved pricing data, fallback to recalculation if not available
                      const pricePerLead = selection.pricePerLead ?? getLeadCostForIndustry(selection.industry, selection.exclusivity);
                      const lineTotal = selection.subtotal ?? (pricePerLead * selection.quantity);
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
                    <span>${discountInfo ? discountInfo.subtotal.toFixed(2) : totalCost.toFixed(2)}</span>
                  </div>
                  
                  {discountInfo && discountInfo.totalDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount (10% on first $1,000)</span>
                        <span>-${discountInfo.discountOnFirstThousand.toFixed(2)}</span>
                      </div>
                      {discountInfo.discountOnExcess > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount (20% on excess)</span>
                          <span>-${discountInfo.discountOnExcess.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${discountInfo ? discountInfo.finalTotal.toFixed(2) : totalCost.toFixed(2)}</span>
                  </div>
                  
                  {discountInfo && discountInfo.totalDiscount > 0 && (
                    <div className="bg-green-50 dark:bg-green-950 rounded-md p-2 text-center">
                      <span className="text-sm text-green-600 font-medium">
                        You Save: ${discountInfo.totalDiscount.toFixed(2)} ({((discountInfo.totalDiscount / discountInfo.subtotal) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  )}
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
