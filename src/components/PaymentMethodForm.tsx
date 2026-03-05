import { useState, FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { useStripeConfig } from "@/hooks/useStripeConfig";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

interface PaymentMethodFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/** Step 1: Fetch Setup Intent client secret (no Elements yet) */
function InitStep({
  onReady,
  loading,
  setLoading,
}: {
  onReady: (secret: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const handleInit = async () => {
    setLoading(true);
    try {
      const data = await invokeEdgeFunction<{ clientSecret?: string }>(supabase, "create-setup-intent");
      if (!data?.clientSecret) throw new Error("No client secret returned");
      onReady(data.clientSecret);
    } catch (error: unknown) {
      console.error("Error creating setup intent:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load payment form");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose your payment method. You can add a card or link a bank account (US). Secure form will load next.
      </p>
      <Button type="button" onClick={handleInit} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Continue
          </>
        )}
      </Button>
    </div>
  );
}

/** Step 2: Payment Element + confirmSetup (inside Elements with clientSecret) */
function SetupFormStep({
  clientSecret,
  onSuccess,
  onCancel,
}: PaymentMethodFormProps & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setSaving(true);
    try {
      const { error } = await elements.submit();
      if (error) {
        toast.error(error.message ?? "Please complete the form");
        setSaving(false);
        return;
      }

      const { setupIntent, error: confirmError } = await (stripe as any).confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.origin + "/account",
        },
      });

      if (confirmError) {
        throw confirmError;
      }

      if (!setupIntent?.payment_method) {
        throw new Error("Setup not completed");
      }

      await invokeEdgeFunction(supabase, "manage-payment-methods", {
        body: {
          setupIntentId: setupIntent.id,
          paymentMethodId: typeof setupIntent.payment_method === "string"
            ? setupIntent.payment_method
            : setupIntent.payment_method.id,
        },
      });

      toast.success("Payment method saved.");
      onSuccess?.();
    } catch (error: unknown) {
      console.error("Error saving payment method:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg bg-card">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card", "us_bank_account"],
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={!stripe || saving} className="flex-1">
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
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export const PaymentMethodForm = (props: PaymentMethodFormProps) => {
  const { stripePromise, loading: configLoading } = useStripeConfig();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (configLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  if (!stripePromise) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Stripe is not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!clientSecret) {
    return (
      <InitStep
        onReady={setClientSecret}
        loading={loading}
        setLoading={setLoading}
      />
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { borderRadius: "6px" },
        },
      }}
      key={clientSecret}
    >
      <SetupFormStep {...props} clientSecret={clientSecret} />
    </Elements>
  );
};
