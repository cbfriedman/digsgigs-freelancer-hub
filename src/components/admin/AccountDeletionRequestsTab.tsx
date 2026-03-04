import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Check, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface DeletionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  profile?: { email: string | null; full_name: string | null };
}

const AccountDeletionRequestsTab = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("account_deletion_requests")
        .select("id, user_id, requested_at, status, reviewed_at, reviewed_by, rejection_reason")
        .order("requested_at", { ascending: false });

      if (error) throw error;

      const withProfiles = await Promise.all(
        (data || []).map(async (r) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", r.user_id)
            .single();
          return { ...r, profile: profile || { email: null, full_name: null } };
        })
      );

      setRequests(withProfiles);
    } catch (error) {
      console.error("Error loading deletion requests:", error);
      toast.error("Failed to load deletion requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: DeletionRequest) => {
    if (req.status !== "pending") return;
    setProcessingId(req.id);
    const body = {
      action: "delete" as const,
      userId: req.user_id,
      confirmFullUserDeletion: true,
    };
    if (process.env.NODE_ENV === "development") {
      console.debug("[AccountDeletion] Approve payload:", { user_id: req.user_id, body });
    }
    try {
      await invokeEdgeFunction(supabase, "admin-manage-user", {
        method: "POST",
        body,
      });

      await (supabase as any)
        .from("account_deletion_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", req.id);

      toast.success("Account deleted successfully.");
      await loadRequests();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to delete account";
      if (process.env.NODE_ENV === "development") {
        console.error("[AccountDeletion] Approve failed:", message, e);
      }
      toast.error(message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: DeletionRequest) => {
    if (req.status !== "pending") return;
    setProcessingId(req.id);
    try {
      await (supabase as any)
        .from("account_deletion_requests")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq("id", req.id);

      toast.success("Request rejected.");
      await loadRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reject request");
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
              <CardTitle>Account deletion requests</CardTitle>
              <CardDescription>
                Users request account deletion; approve to permanently delete their account and data.
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
              No deletion requests yet.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {req.profile?.full_name || "—"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {req.profile?.email || req.user_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(req.requested_at), "MMM d, yyyy h:mm a")}</TableCell>
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
                              variant="destructive"
                              size="sm"
                              className="gap-1"
                              disabled={processingId !== null}
                              onClick={() => handleApprove(req)}
                            >
                              {processingId === req.id ? (
                                "Deleting…"
                              ) : (
                                <>
                                  <Check className="h-4 w-4" />
                                  Approve & delete
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              disabled={processingId !== null}
                              onClick={() => handleReject(req)}
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
    </div>
  );
};

export default AccountDeletionRequestsTab;
