import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const SETTINGS_ROW_ID = "a0000000-0000-0000-0000-000000000001";

export default function MessageNotificationSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [throttleMinutes, setThrottleMinutes] = useState(30);
  const [delayMinutes, setDelayMinutes] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_notification_settings")
        .select("throttle_minutes, delay_minutes")
        .eq("id", SETTINGS_ROW_ID)
        .single();

      if (error) throw error;
      if (data) {
        setThrottleMinutes(Number(data.throttle_minutes) ?? 30);
        setDelayMinutes(Number(data.delay_minutes) ?? 0);
      }
    } catch (e) {
      console.error("Error loading message notification settings:", e);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const throttle = Math.max(0, Math.min(1440, Math.round(Number(throttleMinutes) || 0)));
    const delay = Math.max(0, Math.min(60, Math.round(Number(delayMinutes) || 0)));
    setSaving(true);
    try {
      const { error } = await supabase
        .from("message_notification_settings")
        .update({
          throttle_minutes: throttle,
          delay_minutes: delay,
          updated_at: new Date().toISOString(),
        })
        .eq("id", SETTINGS_ROW_ID);

      if (error) throw error;
      setThrottleMinutes(throttle);
      setDelayMinutes(delay);
      toast.success("Settings saved. Throttle and delay apply to new message notifications.");
    } catch (e) {
      console.error("Error saving message notification settings:", e);
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
        <h2 className="text-2xl font-bold tracking-tight">Message email notifications</h2>
        <p className="text-muted-foreground text-sm">
          Configure when users receive missed-message alerts at their registered email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Throttle & delay
          </CardTitle>
          <CardDescription>
            Throttle: minimum minutes between emails to the same recipient in the same conversation. Delay: minutes to wait before sending (gives time to open the app).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="throttle_minutes">Throttle (minutes)</Label>
              <Input
                id="throttle_minutes"
                type="number"
                min={0}
                max={1440}
                value={throttleMinutes}
                onChange={(e) => setThrottleMinutes(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Min gap between emails per conversation (0–1440). e.g. 15 or 30.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay_minutes">Delay before send (minutes)</Label>
              <Input
                id="delay_minutes"
                type="number"
                min={0}
                max={60}
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Wait this many minutes before sending (0–60). Set to 0 to send instantly (within seconds).
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save settings"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
