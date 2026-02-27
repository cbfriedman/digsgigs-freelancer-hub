import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

const KEY = "browse_gigs_visibility";

export default function BrowseGigsVisibilityCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAwarded, setShowAwarded] = useState(false);
  const [showInProgress, setShowInProgress] = useState(false);

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
      const v = data?.value as { show_awarded?: boolean; show_in_progress?: boolean } | null;
      if (v) {
        setShowAwarded(!!v.show_awarded);
        setShowInProgress(!!v.show_in_progress);
      }
    } catch (e) {
      console.error("Error loading browse gigs visibility:", e);
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
        .update({
          value: { show_awarded: showAwarded, show_in_progress: showInProgress },
          updated_at: new Date().toISOString(),
        })
        .eq("key", KEY);

      if (error) throw error;
      toast.success("Browse Gigs visibility updated. Diggers will see the new statuses on next load.");
    } catch (e) {
      console.error("Error saving browse gigs visibility:", e);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Browse Gigs visibility
        </CardTitle>
        <CardDescription>
          Control which gig statuses appear on the Browse Gigs page for diggers. By default only <strong>Open</strong> gigs are shown. Enabling &quot;Awarded&quot; or &quot;In progress&quot; makes those visible too.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={showAwarded}
                onCheckedChange={(c) => setShowAwarded(!!c)}
                aria-label="Show awarded gigs"
              />
              <span className="text-sm font-medium">Show Awarded gigs</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={showInProgress}
                onCheckedChange={(c) => setShowInProgress(!!c)}
                aria-label="Show in-progress gigs"
              />
              <span className="text-sm font-medium">Show In progress gigs</span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: Diggers see gigs with status{showAwarded || showInProgress ? "es" : ""} <strong>open</strong>
            {showAwarded && " , awarded"}
            {showInProgress && " , in_progress"}.
          </p>
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
  );
}
