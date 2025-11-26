import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

interface EmailPreference {
  id: string;
  report_frequency: 'none' | 'weekly' | 'monthly' | 'quarterly';
  enabled: boolean;
}

const EmailPreferences = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreference | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState<'none' | 'weekly' | 'monthly' | 'quarterly'>('monthly');

  useEffect(() => {
    checkAuthAndLoadPreferences();
  }, []);

  const checkAuthAndLoadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/register');
        return;
      }

      await loadPreferences();
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/register');
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('email_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
        setEnabled(data.enabled);
        setFrequency(data.report_frequency);
      } else {
        // Create default preferences if none exist
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newPrefs, error: insertError } = await (supabase as any)
            .from('email_preferences')
            .insert({
              user_id: user.id,
              report_frequency: 'monthly',
              enabled: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          
          setPreferences(newPrefs);
          setEnabled(true);
          setFrequency('monthly');
        }
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load email preferences",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await (supabase as any)
        .from('email_preferences')
        .update({
          enabled,
          report_frequency: frequency,
        })
        .eq('id', preferences?.id);

      if (error) throw error;

      toast({
        title: "Preferences saved",
        description: "Your email preferences have been updated successfully",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Email Preferences</h1>
          <p className="text-muted-foreground">
            Customize your transaction report email settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>Automated Email Reports</CardTitle>
                <CardDescription className="mt-2">
                  Receive transaction reports automatically at your preferred frequency
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="enable-reports" className="text-base font-medium">
                  Enable Email Reports
                </Label>
                <p className="text-sm text-muted-foreground">
                  Turn automated transaction reports on or off
                </p>
              </div>
              <Switch
                id="enable-reports"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {/* Frequency Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Report Frequency</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how often you want to receive transaction reports
                </p>
              </div>

              <RadioGroup
                value={frequency}
                onValueChange={(value) => setFrequency(value as 'none' | 'weekly' | 'monthly' | 'quarterly')}
                disabled={!enabled}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Never</div>
                      <div className="text-sm text-muted-foreground">Don't send automated reports</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="weekly" id="weekly" />
                  <Label htmlFor="weekly" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Weekly</div>
                      <div className="text-sm text-muted-foreground">Every Monday at midnight</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Monthly</div>
                      <div className="text-sm text-muted-foreground">1st of each month at midnight</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <RadioGroupItem value="quarterly" id="quarterly" />
                  <Label htmlFor="quarterly" className="flex-1 cursor-pointer">
                    <div>
                      <div className="font-medium">Quarterly</div>
                      <div className="text-sm text-muted-foreground">Every 3 months on the 1st</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card className="mt-6 border-muted">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">About Automated Reports</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Reports include all transactions from the selected period</li>
              <li>• Diggers receive earnings breakdowns and commission details</li>
              <li>• Consumers receive payment history summaries</li>
              <li>• You can manually export reports anytime from the Transactions page</li>
              <li>• Email preferences apply to automated reports only</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailPreferences;
