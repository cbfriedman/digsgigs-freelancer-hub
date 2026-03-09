import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, Wallet } from "lucide-react";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { isStripePayoutSupported, ALTERNATIVE_PAYOUT_PROVIDERS, type AlternativePayoutProvider } from "@/lib/stripePayoutCountries";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GetPaidSectionProps {
  /** Country from profile (name or 2-letter code). */
  country: string | null;
  /** Current payout provider from digger_profiles. */
  payoutProvider: string | null;
  /** PayPal email or contact email for alternative. */
  payoutEmail: string | null;
  /** Payoneer/Wise external ID when applicable. */
  payoutExternalId: string | null;
  /** Callback after saving alternative (e.g. refetch). */
  onSaved?: () => void;
}

export function GetPaidSection({
  country,
  payoutProvider,
  payoutEmail,
  payoutExternalId,
  onSaved,
}: GetPaidSectionProps) {
  const stripeSupported = isStripePayoutSupported(country);
  const useStripe = payoutProvider === "stripe" || !payoutProvider;
  const alternativeProvider = (payoutProvider === "paypal" || payoutProvider === "payoneer" || payoutProvider === "wise")
    ? (payoutProvider as AlternativePayoutProvider)
    : null;

  const [showAltForm, setShowAltForm] = useState(false);
  const [altProvider, setAltProvider] = useState<AlternativePayoutProvider>("paypal");
  const [altEmail, setAltEmail] = useState(payoutEmail || "");
  const [altExternalId, setAltExternalId] = useState(payoutExternalId || "");
  const [saving, setSaving] = useState(false);

  const handleSaveAlternative = async () => {
    if (altProvider === "paypal" && !altEmail.trim()) {
      toast.error("Enter your PayPal email.");
      return;
    }
    setSaving(true);
    try {
      const data = await invokeEdgeFunction<{ success?: boolean; error?: string }>(supabase, "save-alternative-payout", {
        body: {
          provider: altProvider,
          email: altEmail.trim() || undefined,
          externalId: altExternalId.trim() || undefined,
        },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("Payout method saved.");
      setShowAltForm(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save payout method");
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchToStripe = async () => {
    setSaving(true);
    try {
      const data = await invokeEdgeFunction<{ success?: boolean; error?: string }>(supabase, "save-alternative-payout", {
        body: { provider: "stripe" },
      });
      if (data?.error) throw new Error(data.error);
      toast.success("Switched to Stripe. Connect your bank below.");
      setShowAltForm(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to switch");
    } finally {
      setSaving(false);
    }
  };

  const providerLabel = (p: AlternativePayoutProvider) => ALTERNATIVE_PAYOUT_PROVIDERS.find((x) => x.value === p)?.label ?? p;

  return (
    <div className="space-y-4">
      {/* Stripe not available in your country */}
      {!stripeSupported && !alternativeProvider && (
        <Alert variant="warning" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Stripe isn&apos;t available in your country</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p>
              Bank payouts via Stripe aren&apos;t supported where you&apos;re located. You can still get paid using PayPal, Payoneer, or Wise.
            </p>
            {!showAltForm ? (
              <Button onClick={() => setShowAltForm(true)}>Set up PayPal, Payoneer, or Wise</Button>
            ) : (
              <AlternativeForm
                altProvider={altProvider}
                setAltProvider={setAltProvider}
                altEmail={altEmail}
                setAltEmail={setAltEmail}
                altExternalId={altExternalId}
                setAltExternalId={setAltExternalId}
                saving={saving}
                onSave={handleSaveAlternative}
                onCancel={() => setShowAltForm(false)}
              />
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Alternative already set */}
      {alternativeProvider && (
        <Card className="mb-4 border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Get paid via {providerLabel(alternativeProvider)}
            </CardTitle>
            <CardDescription>
              Payouts will be sent to {payoutEmail || payoutExternalId || "your account"}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            {stripeSupported && (
              <Button variant="outline" size="sm" onClick={handleSwitchToStripe} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Switch to Stripe (connect bank)
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => { setShowAltForm(true); setAltEmail(payoutEmail || ""); setAltExternalId(payoutExternalId || ""); }}>
              Change email or account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alternative form when shown (e.g. after "Change") */}
      {alternativeProvider && showAltForm && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Update payout details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <AlternativeForm
              altProvider={altProvider}
              setAltProvider={setAltProvider}
              altEmail={altEmail}
              setAltEmail={setAltEmail}
              altExternalId={altExternalId}
              setAltExternalId={setAltExternalId}
              saving={saving}
              onSave={handleSaveAlternative}
              onCancel={() => setShowAltForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {/* Stripe: show when country supported and user uses Stripe or hasn't set alternative yet */}
      {stripeSupported && (useStripe || !alternativeProvider) && (
        <>
          <StripeConnectBanner />
          {useStripe && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Prefer PayPal, Payoneer, or Wise?
                </CardTitle>
                <CardDescription>
                  If you&apos;d rather receive payouts via PayPal, Payoneer, or Wise instead of connecting your bank, you can set that below.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {!showAltForm ? (
                  <Button variant="outline" size="sm" onClick={() => setShowAltForm(true)}>
                    Set up PayPal / Payoneer / Wise
                  </Button>
                ) : (
                  <AlternativeForm
                    altProvider={altProvider}
                    setAltProvider={setAltProvider}
                    altEmail={altEmail}
                    setAltEmail={setAltEmail}
                    altExternalId={altExternalId}
                    setAltExternalId={setAltExternalId}
                    saving={saving}
                    onSave={handleSaveAlternative}
                    onCancel={() => setShowAltForm(false)}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function AlternativeForm({
  altProvider,
  setAltProvider,
  altEmail,
  setAltEmail,
  altExternalId,
  setAltExternalId,
  saving,
  onSave,
  onCancel,
}: {
  altProvider: AlternativePayoutProvider;
  setAltProvider: (p: AlternativePayoutProvider) => void;
  altEmail: string;
  setAltEmail: (s: string) => void;
  altExternalId: string;
  setAltExternalId: (s: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Payout method</Label>
        <Select value={altProvider} onValueChange={(v) => setAltProvider(v as AlternativePayoutProvider)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALTERNATIVE_PAYOUT_PROVIDERS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {altProvider === "paypal" && (
        <div>
          <Label htmlFor="alt-email">PayPal email</Label>
          <Input
            id="alt-email"
            type="email"
            placeholder="you@example.com"
            value={altEmail}
            onChange={(e) => setAltEmail(e.target.value)}
            className="mt-1"
          />
        </div>
      )}
      {(altProvider === "payoneer" || altProvider === "wise") && (
        <>
          <div>
            <Label htmlFor="alt-email-contact">Email for payouts</Label>
            <Input
              id="alt-email-contact"
              type="email"
              placeholder="you@example.com"
              value={altEmail}
              onChange={(e) => setAltEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="alt-external-id">Account or recipient ID (optional)</Label>
            <Input
              id="alt-external-id"
              placeholder={altProvider === "wise" ? "Wise recipient ID" : "Payoneer ID"}
              value={altExternalId}
              onChange={(e) => setAltExternalId(e.target.value)}
              className="mt-1"
            />
          </div>
        </>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={saving || (altProvider === "paypal" && !altEmail.trim())}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
