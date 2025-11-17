import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";

export const StripeConnectBanner = () => {
  const { loading, isOnboarded, canReceivePayments, creating, createConnectAccount } = useStripeConnect();

  if (loading) return null;

  if (canReceivePayments) return null;

  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Set up payments</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {!isOnboarded ? (
          <>
            <p>To receive milestone payments from escrow contracts, you need to connect your Stripe account.</p>
            <Button onClick={createConnectAccount} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect Stripe Account
            </Button>
          </>
        ) : (
          <p>Your Stripe account setup is incomplete. Please complete the onboarding process to receive payments.</p>
        )}
      </AlertDescription>
    </Alert>
  );
};