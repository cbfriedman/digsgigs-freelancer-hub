import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking payout account…</span>
        </CardContent>
      </Card>
    );
  }

  // Connected and ready: show status + Reconnect option
  if (canReceivePayments) {
    return (
      <Card className="mb-6 border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Payout account connected
          </CardTitle>
          <CardDescription>
            You can receive milestone payments. Need to update bank or details? Use Reconnect to open Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="outline" size="sm" onClick={createConnectAccount} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reconnect payout account
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Onboarded but not yet verified: show pending + Reconnect
  if (isOnboarded) {
    return (
      <Alert className="mb-6 border-amber-500/30 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Payout account pending verification</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>Stripe is verifying your account. You’ll be able to receive payments once verification is done. If it’s taking long, try Reconnect to complete any missing steps.</p>
          <Button variant="outline" size="sm" onClick={createConnectAccount} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reconnect payout account
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Not connected
  return (
    <Alert className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Set up payout account</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>To receive milestone payments, connect your Stripe account. You only need to do this once.</p>
        {typeof window !== "undefined" && window !== window.top && (
          <p className="text-xs text-muted-foreground">
            You’re viewing this inside a preview or embed. Open this app in its own tab and click Connect there.
          </p>
        )}
        <Button onClick={createConnectAccount} disabled={creating}>
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Connect payout account
        </Button>
      </AlertDescription>
    </Alert>
  );
};