import { useState, FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

// Only initialize Stripe if the key is available
const getStripePromise = () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return null;
  }
  return loadStripe(publishableKey);
};

interface PaymentMethodFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PaymentMethodFormInner = ({ onSuccess, onCancel }: PaymentMethodFormProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const stripe = useStripe();
  const elements = useElements();

  const handleGetClientSecret = async () => {
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const data = await invokeEdgeFunction<{ clientSecret?: string }>(supabase, "create-setup-intent");

      if (!data?.clientSecret) throw new Error("No client secret returned");

      setClientSecret(data.clientSecret);
      toast.success("Ready to save payment method");
    } catch (error: any) {
      console.error("Error creating setup intent:", error);
      toast.error(error?.message || "Failed to initialize payment form");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      toast.error("Please initialize the form first");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card element not found");
      return;
    }

    setSaving(true);

    try {
      // Confirm the setup intent
      const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (confirmError) {
        throw confirmError;
      }

      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error("Setup Intent not completed");
      }

      await invokeEdgeFunction(supabase, "manage-payment-methods", {
        body: {
          setupIntentId: setupIntent.id,
          paymentMethodId: setupIntent.payment_method,
        },
      });

      toast.success("Payment method saved successfully!");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving payment method:", error);
      toast.error(error?.message || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: "#424770",
        "::placeholder": {
          color: "#aab7c4",
        },
      },
      invalid: {
        color: "#9e2146",
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!clientSecret ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the button below to initialize the secure payment form.
          </p>
          <Button
            type="button"
            onClick={handleGetClientSecret}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Initialize Payment Form
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="p-4 border rounded-lg bg-card">
            <CardElement options={cardElementOptions} />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!stripe || saving}
              className="flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment Method"
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </form>
  );
};

export const PaymentMethodForm = (props: PaymentMethodFormProps) => {
  const stripePromise = getStripePromise();
  
  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY environment variable.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentMethodFormInner {...props} />
    </Elements>
  );
};
