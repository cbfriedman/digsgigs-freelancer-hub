import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useStripeConnect } from "@/hooks/useStripeConnect";

export const StripeConnectBanner = () => {
  const [searchParams] = useSearchParams();
  const { loading, isOnboarded, canReceivePayments, creating, syncing, createConnectAccount, checkConnectStatus, syncWithStripe } = useStripeConnect();

  // After return from Stripe Connect, sync status from Stripe (webhook may have a short delay)
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      checkConnectStatus();
      // Sync from Stripe to ensure stripe_connect_charges_enabled is up to date (handles sandbox verification lag)
      syncWithStripe().catch(() => {});
      const t = setTimeout(checkConnectStatus, 3000);
      return () => clearTimeout(t);
    }
  }, [searchParams, checkConnectStatus, syncWithStripe]);

  // When loading: only show pending verification (warning) card, never green, so pending users never see a green flash
  if (loading) {
    return (
      <Alert variant="warning" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payout account pending verification</AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-amber-800/90 dark:text-amber-200/90">
          <p className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            <span>Checking current status…</span>
          </p>
          <p><span className="font-medium text-amber-700 dark:text-amber-400">Stripe verification: Pending</span></p>
          <p>Complete identity and payout details in Stripe (use Reconnect to open the form). Once Stripe finishes verifying, you can receive payments. Click <strong>Confirm payout account</strong> to refresh and check if verification is complete.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" disabled>Reconnect payout account</Button>
            <Button size="sm" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirm payout account
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Connected and ready: Stripe has fully verified the account
  if (canReceivePayments) {
    return (
      <Card className="mb-6 border-green-500/30 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Payout account connected
          </CardTitle>
          <CardDescription className="space-y-1.5">
            <span className="inline-block font-medium text-green-700 dark:text-green-400">Stripe verification: Complete</span>
            <span className="block">Your payout account is fully verified and ready to receive milestone payments from Giggers.</span>
            <span className="block text-muted-foreground">Need to change bank or payout details? Use Reconnect. Use Confirm to refresh status from Stripe.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={createConnectAccount} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reconnect payout account
          </Button>
          <Button variant="outline" size="sm" onClick={syncWithStripe} disabled={syncing}>
            {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm payout account
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Onboarded but not yet verified: Stripe still verifying
  if (isOnboarded) {
    return (
      <Alert variant="warning" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Payout account pending verification</AlertTitle>
        <AlertDescription className="mt-2 space-y-2 text-amber-800/90 dark:text-amber-200/90">
          <p><span className="font-medium text-amber-700 dark:text-amber-400">Stripe verification: Pending</span></p>
          <p>Complete identity and payout details in Stripe (use Reconnect to open the form). Once Stripe finishes verifying, you can receive payments. Click <strong>Confirm payout account</strong> to refresh and check if verification is complete.</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={createConnectAccount} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reconnect payout account
            </Button>
            <Button size="sm" onClick={syncWithStripe} disabled={syncing}>
              {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm payout account
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Not connected
  return (
    <Alert variant="warning" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Set up payout account</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>To receive milestone payments, connect your payout account via Stripe. Add any supported bank or payout details—you only need to do this once.</p>
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