import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw, Save, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const KEY = "stripe_mode";
type Mode = "test" | "live";

export default function StripeModeSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("test");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();

      if (error) throw error;
      const v = data?.value as { mode?: string } | null;
      if (v?.mode === "live" || v?.mode === "test") {
        setMode(v.mode);
      }
    } catch (e) {
      console.error("Error loading Stripe mode settings:", e);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: { mode }, updated_at: new Date().toISOString() })
        .eq("key", KEY);

      if (error) throw error;
      toast.success(
        mode === "live"
          ? "Stripe is now in live mode. Real charges will be made."
          : "Stripe is now in test (sandbox) mode."
      );
    } catch (e) {
      console.error("Error saving Stripe mode:", e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Stripe mode</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Switch between test (sandbox) and live payments. Edge Functions use the matching keys from Supabase secrets (e.g. STRIPE_SECRET_KEY_TEST / STRIPE_SECRET_KEY_LIVE). Ensure both test and live keys are set in Dashboard → Edge Functions → Secrets.
        </p>
        <p className="mt-3 text-sm font-medium">
          Current mode:{" "}
          <span className={mode === "live" ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}>
            {mode === "live" ? "Live" : "Test (sandbox)"}
          </span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment mode
          </CardTitle>
          <CardDescription>
            In test mode, no real charges are made. In live mode, real cards are charged.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-md">
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="test" id="stripe-test" />
                <Label htmlFor="stripe-test" className="font-normal cursor-pointer">
                  Test (sandbox) — use test keys (sk_test_..., pk_test_...)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="live" id="stripe-live" />
                <Label htmlFor="stripe-live" className="font-normal cursor-pointer">
                  Live — use live keys (sk_live_..., pk_live_...)
                </Label>
              </div>
            </RadioGroup>
            {mode === "live" && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Live mode is active. All new payments will charge real cards.</span>
              </div>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
