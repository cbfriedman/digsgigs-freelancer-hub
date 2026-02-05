import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useAuth } from "@/contexts/AuthContext";
import { getLeadCostForIndustry, calculateBulkDiscount } from "@/config/pricing";

interface LeadSelection {
  keyword: string;
  industry: string;
  exclusivity: 'non-exclusive' | 'semi-exclusive' | 'exclusive-24h';
  quantity: number;
}

export default function LeadCheckout() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selections, setSelections] = useState<LeadSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [diggerProfileId, setDiggerProfileId] = useState<string>('');

  useEffect(() => {
    // Get diggerProfileId from URL params
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get('profileId');
    if (profileId) {
      setDiggerProfileId(profileId);
    }

    const savedSelections = sessionStorage.getItem('leadPurchaseSelections');
    if (savedSelections) {
      setSelections(JSON.parse(savedSelections));
    } else {
      toast({
        title: "No selections found",
        description: "Please select leads to purchase",
        variant: "destructive"
      });
      navigate('/keyword-summary');
    }
  }, [navigate, toast]);

  const calculateSubtotal = () => {
    return selections.reduce((sum, sel) => {
      const cost = getLeadCostForIndustry(sel.industry, 'non-exclusive'); // Always non-exclusive for credits
      return sum + (cost * sel.quantity);
    }, 0);
  };

  const discountInfo = calculateBulkDiscount(calculateSubtotal());

  const handleCheckout = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your purchase",
        variant: "destructive"
      });
      navigate('/register');
      return;
    }

    // Require email verification for purchasing leads
    if (!user.email_confirmed_at) {
      toast({
        title: "Email Verification Required",
        description: "Please verify your email address to purchase leads. Check your inbox for the verification code or use the banner on your dashboard to resend it.",
        variant: "destructive"
      });
      navigate("/register?returnTo=/lead-checkout");
      return;
    }

    setLoading(true);
    try {
      console.log("Starting checkout with selections:", selections);
      console.log("Total amount:", discountInfo.finalTotal);
      
      const data = await invokeEdgeFunction<{ url?: string }>(supabase, "create-bulk-lead-checkout", {
        body: {
          selections: selections,
          totalAmount: discountInfo.originalTotal,
          diggerProfileId: diggerProfileId,
          discountInfo: {
            originalTotal: discountInfo.originalTotal,
            discountOnFirstThousand: discountInfo.discountOnFirstThousand,
            discountOnExcess: discountInfo.discountOnExcess,
            totalDiscount: discountInfo.totalDiscount,
            finalTotal: discountInfo.finalTotal
          }
        }
      });

      console.log("Edge function response:", data);

      if (data?.url) {
        console.log("Redirecting to:", data.url);
        window.location.href = data.url;
      } else {
        console.error("No URL in response:", data);
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error?.message || "Failed to create checkout session",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getExclusivityLabel = (exclusivity: string): string => {
    const labels: Record<string, string> = {
      'non-exclusive': 'Non-Exclusive',
      'semi-exclusive': 'Semi-Exclusive (4 max)',
      'exclusive-24h': '24hr Exclusive'
    };
    return labels[exclusivity] || exclusivity;
  };

  const getExclusivityVariant = (exclusivity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      'non-exclusive': 'secondary',
      'semi-exclusive': 'default',
      'exclusive-24h': 'destructive'
    };
    return variants[exclusivity] || 'default';
  };

  if (selections.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <>
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/keyword-summary')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Summary
            </Button>
            <h1 className="text-4xl font-bold mb-2">
              Checkout
            </h1>
            <p className="text-lg text-muted-foreground">
              Review and complete your lead purchase
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Order Details */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selections.map((selection, index) => (
                    <div key={index} className="border-b pb-4 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{selection.keyword}</h3>
                          <p className="text-sm text-muted-foreground">
                            {selection.industry}
                          </p>
                        </div>
                        <Badge variant="secondary">Non-Exclusive</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">
                          {selection.quantity} Credit{selection.quantity !== 1 ? 's' : ''}
                        </span>
                        <span className="font-semibold">
                          ${(getLeadCostForIndustry(selection.industry, 'non-exclusive') * selection.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🎯</span>
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                        24-Hour Priority Access
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      You'll see matching leads before pay-per-lead buyers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="font-mono">${discountInfo.originalTotal.toFixed(2)}</span>
                    </div>

                    {discountInfo.discountOnFirstThousand > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Discount (10% on first $1,000)</span>
                        <span className="font-mono">-${discountInfo.discountOnFirstThousand.toFixed(2)}</span>
                      </div>
                    )}

                    {discountInfo.discountOnExcess > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>Discount (20% on remaining)</span>
                        <span className="font-mono">-${discountInfo.discountOnExcess.toFixed(2)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-semibold pt-2">
                      <span>Total After Discount</span>
                      <span className="text-primary text-xl">${discountInfo.finalTotal.toFixed(2)}</span>
                    </div>

                    {discountInfo.totalDiscount > 0 && (
                      <div className="text-center py-2 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                        <span className="text-sm text-green-700 dark:text-green-300 font-semibold">
                          You Save: ${discountInfo.totalDiscount.toFixed(2)} ({discountInfo.savingsPercentage.toFixed(1)}%)
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                      ℹ️ Credits are for Non-Exclusive leads only • Never expire • 24hr return window
                    </div>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Secure payment powered by Stripe
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
