import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LeadLimits() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [leadLimitEnabled, setLeadLimitEnabled] = useState(false);
  const [leadLimit, setLeadLimit] = useState<string>("10");
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [diggerId, setDiggerId] = useState<string | null>(null);

  useEffect(() => {
    loadLeadLimits();
  }, []);

  const loadLeadLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/register');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (profile?.user_type !== 'digger') {
        toast.error('Only diggers can access this page');
        navigate('/');
        return;
      }

      const { data: diggerProfile, error } = await supabase
        .from('digger_profiles')
        .select('id, lead_limit_enabled, lead_limit, lead_limit_period')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (diggerProfile) {
        setDiggerId((diggerProfile as any).id);
        setLeadLimitEnabled((diggerProfile as any).lead_limit_enabled || false);
        setLeadLimit((diggerProfile as any).lead_limit?.toString() || '10');
        setPeriod(((diggerProfile as any).lead_limit_period as 'daily' | 'weekly' | 'monthly') || 'monthly');
      }
    } catch (error) {
      console.error('Error loading lead limits:', error);
      toast.error('Failed to load lead limit settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (leadLimitEnabled && (!leadLimit || parseInt(leadLimit) < 1)) {
      toast.error('Please enter a valid lead limit (minimum 1)');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('digger_profiles')
        .update({
          lead_limit_enabled: leadLimitEnabled,
          lead_limit: leadLimitEnabled ? parseInt(leadLimit) : null,
          lead_limit_period: period,
        } as any)
        .eq('id', diggerId);

      if (error) throw error;

      toast.success('Lead limit settings saved successfully');
    } catch (error) {
      console.error('Error saving lead limits:', error);
      toast.error('Failed to save lead limit settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Lead Limits</h1>
          <p className="text-muted-foreground">
            Control how many leads you receive to manage your workload and budget
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set Your Lead Limit</CardTitle>
            <CardDescription>
              Limit the number of gig leads you'll be shown to control spending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                When you reach your limit, you won't be shown new gigs until the period resets. This helps you manage your lead costs and workload.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lead-limit-enabled" className="text-base">
                  Enable Lead Limit
                </Label>
                <div className="text-sm text-muted-foreground">
                  Stop receiving leads after reaching your limit
                </div>
              </div>
              <Switch
                id="lead-limit-enabled"
                checked={leadLimitEnabled}
                onCheckedChange={setLeadLimitEnabled}
              />
            </div>

            {leadLimitEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="lead-limit">Maximum Number of Leads</Label>
                  <Input
                    id="lead-limit"
                    type="number"
                    min="1"
                    value={leadLimit}
                    onChange={(e) => setLeadLimit(e.target.value)}
                    placeholder="10"
                  />
                  <p className="text-sm text-muted-foreground">
                    You'll stop seeing new gigs after purchasing this many leads
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Time Period</Label>
                  <RadioGroup value={period} onValueChange={(value: any) => setPeriod(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="daily" id="daily" />
                      <Label htmlFor="daily" className="font-normal cursor-pointer">
                        Daily - Resets every day at midnight
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="weekly" id="weekly" />
                      <Label htmlFor="weekly" className="font-normal cursor-pointer">
                        Weekly - Resets every Monday
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="monthly" id="monthly" />
                      <Label htmlFor="monthly" className="font-normal cursor-pointer">
                        Monthly - Resets on the 1st of each month
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Cost Estimate:</strong> With your current settings, you'll spend up to{' '}
                    <strong>${parseInt(leadLimit || '0') * 3}</strong> per {period} on leads 
                    (Free tier: $3/lead). Upgrade to Pro ($999/mo: $2/lead + unlimited free estimates) or Premium (FREE leads) to save more.
                  </AlertDescription>
                </Alert>
              </>
            )}

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
