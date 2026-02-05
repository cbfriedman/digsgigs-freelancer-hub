import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Play, Clock, Users, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface SystemStatus {
  queueCount: number;
  queueByStatus: Record<string, number>;
  queueByType: Record<string, number>;
  purchasesCount: number;
  recentGigs: any[];
  gigsCount: number;
  diggerProfiles: any[];
  diggersCount: number;
}

interface PreviewResult {
  gig: any;
  matchingDiggers: any[];
  matchCount: number;
  existingPurchases: any[];
  existingQueue: any[];
}

interface QueueEntry {
  id: string;
  gig_id: string;
  digger_id: string;
  exclusivity_type: string;
  status: string;
  queue_position: number;
  created_at: string;
  exclusivity_ends_at: string | null;
  digger_profiles?: { id: string; business_name: string; profession: string };
  gigs?: { id: string; title: string; status: string };
}

export default function AdminLeadDistributionTest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedGig, setSelectedGig] = useState<string>("");
  const [selectedExclusivity, setSelectedExclusivity] = useState<string>("exclusive");
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        navigate("/register");
        return;
      }

      // Check if user is admin (using user_app_roles table)
      const { data: roles } = await supabase
        .from("user_app_roles")
        .select("app_role")
        .eq("user_id", user.id)
        .eq("app_role", "admin")
        .eq("is_active", true)
        .maybeSingle();

      if (!roles) {
        toast.error("Admin access required");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadSystemStatus();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const callAdminFunction = async (action: string, params: Record<string, any> = {}) => {
    return invokeEdgeFunction(supabase, "admin-test-lead-distribution", {
      body: { action, ...params }
    });
  };

  const loadSystemStatus = async () => {
    try {
      const result = await callAdminFunction("get-system-status");
      setSystemStatus(result.data);
    } catch (error: any) {
      toast.error("Failed to load system status: " + (error?.message ?? "Unknown error"));
    }
  };

  const loadQueueDetails = async () => {
    try {
      const result = await callAdminFunction("get-queue-details");
      setQueueEntries(result.data.entries);
    } catch (error: any) {
      toast.error("Failed to load queue: " + (error?.message ?? "Unknown error"));
    }
  };

  const loadPurchaseDetails = async () => {
    try {
      const result = await callAdminFunction("get-purchase-details");
      setPurchases(result.data.purchases);
    } catch (error: any) {
      toast.error("Failed to load purchases: " + error.message);
    }
  };

  const handlePreviewMatching = async () => {
    if (!selectedGig) {
      toast.error("Please select a gig");
      return;
    }
    
    setActionLoading("preview");
    try {
      const result = await callAdminFunction("preview-matching", { gigId: selectedGig });
      setPreviewResult(result.data);
      toast.success(`Found ${result.data.matchCount} matching diggers`);
    } catch (error: any) {
      toast.error("Preview failed: " + (error?.message ?? "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerMatching = async () => {
    if (!selectedGig || !selectedExclusivity) {
      toast.error("Please select a gig and exclusivity type");
      return;
    }
    
    setActionLoading("matching");
    try {
      const result = await callAdminFunction("trigger-matching", { 
        gigId: selectedGig, 
        exclusivityType: selectedExclusivity 
      });
      toast.success("Lead matching triggered successfully");
      console.log("Matching result:", result);
      await loadSystemStatus();
      await loadQueueDetails();
    } catch (error: any) {
      toast.error("Matching failed: " + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerExpiration = async () => {
    setActionLoading("expiration");
    try {
      const result = await callAdminFunction("trigger-expiration-check");
      toast.success("Expiration check completed");
      console.log("Expiration result:", result);
      await loadSystemStatus();
      await loadQueueDetails();
    } catch (error: any) {
      toast.error("Expiration check failed: " + (error?.message ?? "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerSemiExpiration = async () => {
    setActionLoading("semi-expiration");
    try {
      const result = await callAdminFunction("trigger-semi-exclusive-expiration");
      toast.success("Semi-exclusive expiration check completed");
      console.log("Semi-expiration result:", result);
      await loadSystemStatus();
      await loadQueueDetails();
    } catch (error: any) {
      toast.error("Semi-exclusive expiration check failed: " + (error?.message ?? "Unknown error"));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      expired: "destructive",
      completed: "outline",
      converted_to_nonexclusive: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Lead Distribution Test Interface</h1>
          <Button variant="outline" onClick={loadSystemStatus}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Queue Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus?.queueCount || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {Object.entries(systemStatus?.queueByStatus || {}).map(([status, count]) => (
                  <span key={status} className="mr-2">{status}: {count}</span>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lead Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus?.purchasesCount || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Available Gigs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus?.gigsCount || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Digger Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStatus?.diggersCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="simulator" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="simulator">Lead Matching Simulator</TabsTrigger>
            <TabsTrigger value="queue">Exclusivity Queue</TabsTrigger>
            <TabsTrigger value="purchases">Lead Purchases</TabsTrigger>
            <TabsTrigger value="expiration">Expiration Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="simulator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Lead Matching Simulator
                </CardTitle>
                <CardDescription>
                  Test lead matching logic without affecting production data (preview) or trigger actual matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Select Gig</label>
                    <Select value={selectedGig} onValueChange={setSelectedGig}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a gig..." />
                      </SelectTrigger>
                      <SelectContent>
                        {systemStatus?.recentGigs.map((gig) => (
                          <SelectItem key={gig.id} value={gig.id}>
                            {gig.title} ({gig.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Exclusivity Type</label>
                    <Select value={selectedExclusivity} onValueChange={setSelectedExclusivity}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exclusive">24-Hour Exclusive</SelectItem>
                        <SelectItem value="semi-exclusive">Semi-Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={handlePreviewMatching}
                      disabled={!selectedGig || actionLoading === "preview"}
                      variant="outline"
                    >
                      {actionLoading === "preview" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Preview Matches
                    </Button>
                    <Button 
                      onClick={handleTriggerMatching}
                      disabled={!selectedGig || actionLoading === "matching"}
                    >
                      {actionLoading === "matching" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Trigger Matching
                    </Button>
                  </div>
                </div>

                {previewResult && (
                  <div className="mt-6 space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Gig Details</h4>
                      <p><strong>Title:</strong> {previewResult.gig.title}</p>
                      <p><strong>Location:</strong> {previewResult.gig.location}</p>
                      <p><strong>NAICS Codes:</strong> {previewResult.gig.naics_codes?.join(", ") || "None"}</p>
                      <p><strong>SIC Codes:</strong> {previewResult.gig.sic_codes?.join(", ") || "None"}</p>
                      <p><strong>Confirmed Lead:</strong> {previewResult.gig.is_confirmed_lead ? "Yes" : "No"}</p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Matching Diggers ({previewResult.matchCount})
                      </h4>
                      {previewResult.matchingDiggers.length === 0 ? (
                        <p className="text-muted-foreground">No matching diggers found</p>
                      ) : (
                        <div className="grid gap-2">
                          {previewResult.matchingDiggers.map((digger) => (
                            <div key={digger.id} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span>{digger.business_name}</span>
                              <Badge variant="outline">{digger.profession || "No profession"}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {previewResult.existingPurchases.length > 0 && (
                      <div className="border border-yellow-500 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          Existing Purchases ({previewResult.existingPurchases.length})
                        </h4>
                        {previewResult.existingPurchases.map((purchase, idx) => (
                          <div key={idx} className="text-sm">
                            Digger {purchase.digger_id.slice(0, 8)}... - {purchase.exclusivity_type} ({purchase.status})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="queue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Exclusivity Queue
                </CardTitle>
                <CardDescription>
                  View all lead exclusivity queue entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadQueueDetails} className="mb-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load Queue
                </Button>
                
                {queueEntries.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gig</TableHead>
                        <TableHead>Digger</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Expires At</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.gigs?.title || entry.gig_id.slice(0, 8)}</TableCell>
                          <TableCell>{entry.digger_profiles?.business_name || entry.digger_id.slice(0, 8)}</TableCell>
                          <TableCell><Badge>{entry.exclusivity_type}</Badge></TableCell>
                          <TableCell>{getStatusBadge(entry.status)}</TableCell>
                          <TableCell>{entry.queue_position}</TableCell>
                          <TableCell>
                            {entry.exclusivity_ends_at 
                              ? format(new Date(entry.exclusivity_ends_at), "MMM d, h:mm a")
                              : "-"}
                          </TableCell>
                          <TableCell>{format(new Date(entry.created_at), "MMM d, h:mm a")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No queue entries. Click "Load Queue" to fetch data.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lead Purchases
                </CardTitle>
                <CardDescription>
                  View all lead purchase records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={loadPurchaseDetails} className="mb-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Load Purchases
                </Button>
                
                {purchases.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gig</TableHead>
                        <TableHead>Digger</TableHead>
                        <TableHead>Exclusivity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Purchased</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>{purchase.gigs?.title || purchase.gig_id.slice(0, 8)}</TableCell>
                          <TableCell>{purchase.digger_profiles?.business_name || purchase.digger_id.slice(0, 8)}</TableCell>
                          <TableCell><Badge>{purchase.exclusivity_type}</Badge></TableCell>
                          <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                          <TableCell>${purchase.purchase_price}</TableCell>
                          <TableCell>{format(new Date(purchase.purchased_at), "MMM d, h:mm a")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No purchases. Click "Load Purchases" to fetch data.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Expiration Testing
                </CardTitle>
                <CardDescription>
                  Manually trigger expiration handlers to test lead rotation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Exclusive Lead Expiration</CardTitle>
                      <CardDescription>
                        Processes expired exclusive leads - either moves to next digger in queue or converts to non-exclusive
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleTriggerExpiration}
                        disabled={actionLoading === "expiration"}
                        className="w-full"
                      >
                        {actionLoading === "expiration" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Trigger Exclusive Expiration Check
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Semi-Exclusive Expiration</CardTitle>
                      <CardDescription>
                        Processes expired semi-exclusive leads - converts to non-exclusive and notifies remaining diggers
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={handleTriggerSemiExpiration}
                        disabled={actionLoading === "semi-expiration"}
                        className="w-full"
                      >
                        {actionLoading === "semi-expiration" ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Trigger Semi-Exclusive Expiration Check
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <h4 className="font-semibold">How Expiration Works</h4>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                          <li>• <strong>Exclusive:</strong> 24-hour window. After expiration, next digger in queue gets access OR converts to non-exclusive if no queue.</li>
                          <li>• <strong>Semi-Exclusive:</strong> 24-hour window for up to 4 diggers. After expiration, remaining matched diggers get non-exclusive access.</li>
                          <li>• In production, these run on scheduled cron jobs. Use these buttons to test manually.</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}