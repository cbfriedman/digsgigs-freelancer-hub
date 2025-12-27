import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Users, Crown, Lock, Calendar, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";

interface FoundingDigger {
  id: string;
  business_name: string;
  founding_digger_number: number;
  lead_price_lock_expires_at: string | null;
  subscription_status: string | null;
  created_at: string;
  profile: {
    email: string;
    full_name: string;
  } | null;
}

interface ProgramSettings {
  status: string;
  limit: number;
  current_count: number;
  subscription_price_cents: number;
  lead_price_lock_months: number;
}

export const FoundingDiggerTab = () => {
  const [loading, setLoading] = useState(true);
  const [foundingDiggers, setFoundingDiggers] = useState<FoundingDigger[]>([]);
  const [programSettings, setProgramSettings] = useState<ProgramSettings | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load program settings
      const { data: settings, error: settingsError } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "founding_digger_program")
        .single();

      if (settingsError) throw settingsError;
      setProgramSettings(settings?.value as unknown as ProgramSettings);

      // Load all founding diggers
      const { data: diggers, error: diggersError } = await supabase
        .from("digger_profiles")
        .select(`
          id,
          business_name,
          founding_digger_number,
          lead_price_lock_expires_at,
          subscription_status,
          created_at,
          user_id
        `)
        .eq("is_founding_digger", true)
        .order("founding_digger_number", { ascending: true });

      if (diggersError) throw diggersError;

      // Fetch profile info for each digger
      const diggersWithProfiles = await Promise.all(
        (diggers || []).map(async (digger) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", digger.user_id)
            .single();

          return {
            ...digger,
            profile: profile || null,
          };
        })
      );

      setFoundingDiggers(diggersWithProfiles);
    } catch (error) {
      console.error("Error loading founding digger data:", error);
      toast.error("Failed to load founding digger data");
    } finally {
      setLoading(false);
    }
  };

  const toggleProgramStatus = async () => {
    if (!programSettings) return;
    
    setToggling(true);
    try {
      const newStatus = programSettings.status === "open" ? "closed" : "open";
      
      const { error } = await supabase
        .from("platform_settings")
        .update({
          value: { ...programSettings, status: newStatus },
          updated_at: new Date().toISOString(),
        })
        .eq("key", "founding_digger_program");

      if (error) throw error;

      setProgramSettings({ ...programSettings, status: newStatus });
      toast.success(`Founding Digger program ${newStatus === "open" ? "opened" : "closed"}`);
    } catch (error) {
      console.error("Error toggling program status:", error);
      toast.error("Failed to update program status");
    } finally {
      setToggling(false);
    }
  };

  const getLeadLockStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { status: "none", daysRemaining: 0 };
    
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysRemaining = differenceInDays(expiryDate, now);
    
    if (daysRemaining <= 0) {
      return { status: "expired", daysRemaining: 0 };
    } else if (daysRemaining <= 30) {
      return { status: "expiring-soon", daysRemaining };
    } else {
      return { status: "active", daysRemaining };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progressPercent = programSettings 
    ? (programSettings.current_count / programSettings.limit) * 100 
    : 0;

  const spotsRemaining = programSettings 
    ? programSettings.limit - programSettings.current_count 
    : 0;

  return (
    <div className="space-y-6">
      {/* Program Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Program Status</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge 
                variant={programSettings?.status === "open" ? "default" : "secondary"}
                className={programSettings?.status === "open" ? "bg-green-500" : ""}
              >
                {programSettings?.status === "open" ? "Open" : "Closed"}
              </Badge>
              <div className="flex items-center space-x-2">
                <Switch
                  id="program-toggle"
                  checked={programSettings?.status === "open"}
                  onCheckedChange={toggleProgramStatus}
                  disabled={toggling}
                />
                <Label htmlFor="program-toggle" className="text-xs text-muted-foreground">
                  {programSettings?.status === "open" ? "Open" : "Closed"}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Founding Diggers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {programSettings?.current_count || 0} / {programSettings?.limit || 500}
            </div>
            <Progress value={progressPercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {spotsRemaining} spots remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pricing Benefits</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subscription:</span>
                <span className="font-medium">$19/mo forever</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead Pricing:</span>
                <span className="font-medium">$10/$25 for 1 year</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Founding Diggers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Founding Diggers</CardTitle>
              <CardDescription>
                All diggers enrolled in the Founding Digger program
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {foundingDiggers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No Founding Diggers yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Lead Price Lock</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {foundingDiggers.map((digger) => {
                    const lockStatus = getLeadLockStatus(digger.lead_price_lock_expires_at);
                    
                    return (
                      <TableRow key={digger.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {digger.founding_digger_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {digger.business_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {digger.profile?.email || "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={digger.subscription_status === "active" ? "default" : "secondary"}
                          >
                            {digger.subscription_status || "None"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lockStatus.status === "active" && (
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{lockStatus.daysRemaining}d left</span>
                            </div>
                          )}
                          {lockStatus.status === "expiring-soon" && (
                            <div className="flex items-center gap-2 text-amber-500">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="text-sm">{lockStatus.daysRemaining}d left</span>
                            </div>
                          )}
                          {lockStatus.status === "expired" && (
                            <Badge variant="destructive">Expired</Badge>
                          )}
                          {lockStatus.status === "none" && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(digger.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Alert */}
      {foundingDiggers.filter(d => getLeadLockStatus(d.lead_price_lock_expires_at).status === "expiring-soon").length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-600">Lead Price Locks Expiring Soon</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {foundingDiggers.filter(d => getLeadLockStatus(d.lead_price_lock_expires_at).status === "expiring-soon").length} Founding Digger(s) have lead price locks expiring within 30 days. 
                  They will receive automatic email notifications at 30 and 7 days before expiration.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Crown className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
            <div className="space-y-2">
              <h3 className="font-semibold">About the Founding Digger Program</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>Subscription:</strong> $19/month locked in forever (never changes)</li>
                <li><strong>Lead Pricing:</strong> $10 (standard) / $25 (high-value) for the first year</li>
                <li><strong>After Year 1:</strong> Lead pricing reverts to standard rates, but subscription stays at $19/mo</li>
                <li><strong>Limit:</strong> First {programSettings?.limit || 500} diggers who sign up</li>
                <li>Program automatically closes when limit is reached</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
