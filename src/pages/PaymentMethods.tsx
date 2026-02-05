import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { toast } from "sonner";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star, 
  Loader2,
  ArrowLeft,
  Shield
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SEOHead from "@/components/SEOHead";

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
  created: number;
}

export default function PaymentMethods() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/register?mode=signin");
      return;
    }
    loadPaymentMethods();
  }, [user]);

  const loadPaymentMethods = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await invokeEdgeFunction<{ paymentMethods?: unknown[] }>(supabase, "manage-payment-methods", {
        method: "GET",
      });
      setPaymentMethods(data.paymentMethods || []);
    } catch (error: any) {
      console.error("Error loading payment methods:", error);
      toast.error(error?.message || "Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentMethodId: string) => {
    if (!confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    try {
      setDeletingId(paymentMethodId);
      await invokeEdgeFunction(supabase, "manage-payment-methods", {
        method: "DELETE",
        body: { paymentMethodId },
      });
      toast.success("Payment method deleted");
      loadPaymentMethods();
    } catch (error: any) {
      console.error("Error deleting payment method:", error);
      toast.error(error.message || "Failed to delete payment method");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      await invokeEdgeFunction(supabase, "manage-payment-methods", {
        method: "PATCH",
        body: { paymentMethodId, isDefault: true },
      });
      toast.success("Default payment method updated");
      loadPaymentMethods();
    } catch (error: any) {
      console.error("Error setting default payment method:", error);
      toast.error(error?.message || "Failed to update default payment method");
    }
  };

  const handleAddSuccess = () => {
    setShowAddDialog(false);
    loadPaymentMethods();
  };

  const getCardBrandIcon = (brand: string) => {
    const normalized = brand.toLowerCase();
    if (normalized.includes("visa")) return "💳";
    if (normalized.includes("mastercard")) return "💳";
    if (normalized.includes("amex")) return "💳";
    if (normalized.includes("discover")) return "💳";
    return "💳";
  };

  const formatExpiry = (month: number, year: number) => {
    return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
  };

  return (
    <>
      <SEOHead
        title="Payment Methods | Digs & Gigs"
        description="Manage your saved payment methods"
        canonical="/payment-methods"
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
            <p className="text-muted-foreground">
              Manage your saved payment methods for faster checkout
            </p>
          </div>

          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your payment information is securely stored and encrypted by Stripe. 
              We never store your full card details.
            </AlertDescription>
          </Alert>

          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Saved Payment Methods ({paymentMethods.length})
                </h2>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Payment Method
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Payment Method</DialogTitle>
                      <DialogDescription>
                        Add a new card to your account for faster checkout
                      </DialogDescription>
                    </DialogHeader>
                    <PaymentMethodForm
                      onSuccess={handleAddSuccess}
                      onCancel={() => setShowAddDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              {paymentMethods.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No payment methods</h3>
                      <p className="text-muted-foreground mb-4">
                        Add a payment method to speed up your future purchases
                      </p>
                      <Button onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Payment Method
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((pm) => (
                    <Card key={pm.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl">
                              {getCardBrandIcon(pm.card.brand)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">
                                  {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} •••• {pm.card.last4}
                                </span>
                                {pm.is_default && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                                    Default
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Expires {formatExpiry(pm.card.exp_month, pm.card.exp_year)}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!pm.is_default && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefault(pm.id)}
                              >
                                Set as Default
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(pm.id)}
                              disabled={deletingId === pm.id}
                            >
                              {deletingId === pm.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
