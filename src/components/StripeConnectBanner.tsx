import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";

export const StripeConnectBanner = () => {
  const [searchParams] = useSearchParams();
  const { loading, isOnboarded, canReceivePayments, creating, createConnectAccount, checkConnectStatus } = useStripeConnect();

  // After return from Stripe Connect, refetch status (webhook may have a short delay)
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      checkConnectStatus();
      const t = setTimeout(checkConnectStatus, 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams, checkConnectStatus]);

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
            {typeof window !== "undefined" && window !== window.top && (
              <p className="text-xs text-muted-foreground">
                You’re viewing this inside a preview or embed. For Stripe Connect to work without errors, open this app in its own tab (e.g. the app’s real URL) and click Connect there.
              </p>
            )}
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