import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

const KEY = "milestone_auto_release_days";
const MIN_DAYS = 7;
const MAX_DAYS = 60;
const DEFAULT_DAYS = 14;

export default function MilestoneAutoReleaseSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState(DEFAULT_DAYS);

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
      if (data?.value && typeof (data.value as { days?: number }).days === "number") {
        const d = Math.min(MAX_DAYS, Math.max(MIN_DAYS, (data.value as { days: number }).days));
        setDays(d);
      }
    } catch (e) {
      console.error("Error loading milestone auto-release settings:", e);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(Number(days) || DEFAULT_DAYS)));
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: { days: value }, updated_at: new Date().toISOString() })
        .eq("key", KEY);

      if (error) throw error;
      setDays(value);
      toast.success(`Auto-release period set to ${value} days. The cron will use this value on the next run.`);
    } catch (e) {
      console.error("Error saving milestone auto-release settings:", e);
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
        <h2 className="text-2xl font-bold tracking-tight">Milestone auto-release</h2>
        <p className="text-muted-foreground text-sm">
          Configure how many days the Gigger has to approve or dispute a submitted milestone before payment is automatically released to the Digger (charged to the Gigger’s saved card).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-release period (days)
          </CardTitle>
          <CardDescription>
            Submitted milestones older than this many days are eligible for auto-release when the daily cron runs. The Gigger must have a default saved payment method; otherwise that milestone is skipped. Allowed range: {MIN_DAYS}–{MAX_DAYS} days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="milestone-auto-release-days">Days</Label>
              <Input
                id="milestone-auto-release-days"
                type="number"
                min={MIN_DAYS}
                max={MAX_DAYS}
                value={days}
                onChange={(e) => setDays(Number(e.target.value) || DEFAULT_DAYS)}
              />
              <p className="text-xs text-muted-foreground">
                Current value: <strong>{days} days</strong>. Users see this period in the contract milestones card (e.g. “If the client doesn’t approve or dispute within {days} days…”).
              </p>
            </div>
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
