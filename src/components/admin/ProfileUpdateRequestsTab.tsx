import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Check, X, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ProfileIdentityRequest {
  id: string;
  user_id: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  address: string | null;
  city: string | null;
  state_region: string | null;
  zip_postal: string | null;
  country: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profile?: { email: string | null; full_name: string | null };
}

const ProfileUpdateRequestsTab = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ProfileIdentityRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("profile_identity_update_requests")
        .select("id, user_id, status, first_name, last_name, address, city, state_region, zip_postal, country, created_at, reviewed_at, rejection_reason")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const withProfiles = await Promise.all(
        ((data || []) as any[]).map(async (r: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", r.user_id)
            .single();
          return { ...r, profile: profile || { email: null, full_name: null } };
        })
      );

      setRequests(withProfiles);
    } catch (err) {
      console.error("Error loading profile update requests:", err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: ProfileIdentityRequest) => {
    if (req.status !== "pending") return;
    setProcessingId(req.id);
    try {
      await invokeEdgeFunction(supabase, "approve-profile-identity-request", {
        method: "POST",
        body: { requestId: req.id, action: "approve" },
      });
      toast.success("Request approved; profile updated.");
      await loadRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    const req = requests.find((r) => r.id === rejectDialog.id);
    if (!req || req.status !== "pending") return;
    setProcessingId(req.id);
    try {
      await invokeEdgeFunction(supabase, "approve-profile-identity-request", {
        method: "POST",
        body: { requestId: req.id, action: "reject", rejection_reason: rejectReason.trim() || undefined },
      });
      toast.success("Request rejected.");
      setRejectDialog(null);
      setRejectReason("");
      await loadRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile update requests
              </CardTitle>
              <CardDescription>
                Users request changes to first name, last name, and street address for ID verification. Approve to apply to their profile.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadRequests} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No profile update requests yet.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Name & location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{req.profile?.full_name || "—"}</span>
                          <span className="block text-xs text-muted-foreground">{req.profile?.email || req.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(req.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-0.5 max-w-[220px]">
                          {(req.first_name || req.last_name) && (
                            <p className="font-medium">
                              {[req.first_name, req.last_name].filter(Boolean).join(" ")}
                            </p>
                          )}
                          {req.address && <p className="text-muted-foreground truncate"><span className="text-foreground/80">Street: </span>{req.address}</p>}
                          {(req.city || req.state_region || req.zip_postal) && (
                            <p className="text-muted-foreground">
                              {[req.city, req.state_region, req.zip_postal].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {req.country && <p className="text-muted-foreground">{req.country}</p>}
                          {!req.first_name && !req.last_name && !req.address && !req.city && !req.state_region && !req.zip_postal && !req.country && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "pending"
                              ? "default"
                              : req.status === "approved"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="gap-1"
                              disabled={processingId !== null}
                              onClick={() => handleApprove(req)}
                            >
                              {processingId === req.id ? "Applying…" : (
                                <>
                                  <Check className="h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={processingId !== null}
                              onClick={() => setRejectDialog({ id: req.id })}
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              Optionally add a reason to show the user why the request was rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Please provide a valid address."
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={processingId !== null}
              onClick={handleReject}
            >
              {processingId ? "Rejecting…" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileUpdateRequestsTab;
