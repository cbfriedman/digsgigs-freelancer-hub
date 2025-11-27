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
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
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

  const getLeadPrice = (industry: string, exclusivity: string): number => {
    // This should match your pricing logic from getLeadCostForIndustry
    const pricing: Record<string, Record<string, number>> = {
      'high-value': {
        'non-exclusive': 55.00,
        'semi-exclusive': 99.00,
        'exclusive-24h': 275.00
      },
      'mid-value': {
        'non-exclusive': 29.00,
        'semi-exclusive': 58.00,
        'exclusive-24h': 125.00
      },
      'low-value': {
        'non-exclusive': 15.00,
        'semi-exclusive': 30.00,
        'exclusive-24h': 60.00
      }
    };

    return pricing[industry]?.[exclusivity] || 15.00;
  };

  const calculateTotal = (): number => {
    return selections.reduce((total, selection) => {
      const price = getLeadPrice(selection.industry, selection.exclusivity);
      return total + (price * selection.quantity);
    }, 0);
  };

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

    setLoading(true);
    try {
      // Create checkout session for lead purchase
      const { data, error } = await supabase.functions.invoke("create-lead-purchase-checkout", {
        body: {
          selections: selections,
          totalAmount: calculateTotal()
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect to Stripe checkout
        window.open(data.url, '_blank');
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
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

  const totalAmount = calculateTotal();

  return (
    <>
      <Navigation />
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
                  {selections.map((selection, index) => {
                    const price = getLeadPrice(selection.industry, selection.exclusivity);
                    const subtotal = price * selection.quantity;

                    return (
                      <div key={index} className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{selection.keyword}</h3>
                            <Badge variant={getExclusivityVariant(selection.exclusivity)} className="mt-1">
                              {getExclusivityLabel(selection.exclusivity)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              ${subtotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selection.quantity} leads × ${price.toFixed(2)} per lead
                        </div>
                      </div>
                    );
                  })}
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
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span>$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${totalAmount.toFixed(2)}</span>
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
