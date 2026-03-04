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
import { RefreshCw, Check, X, ShieldCheck, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const BUCKET_ID_VERIFICATION = "id-verification";
const SIGNED_URL_EXPIRES = 3600;

interface IdVerificationSubmission {
  id: string;
  user_id: string;
  status: string;
  legal_name: string | null;
  street_address: string | null;
  apt: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  id_type: string | null;
  front_file_path: string | null;
  back_file_path: string | null;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  profile?: { email: string | null; full_name: string | null };
}

const ID_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  passport: "Passport",
  state_id: "State ID",
  green_card: "Green Card",
  government_id: "Government ID",
};

const IdVerificationSubmissionsTab = () => {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<IdVerificationSubmission[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewImagesSub, setViewImagesSub] = useState<IdVerificationSubmission | null>(null);
  const [viewImagesUrls, setViewImagesUrls] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });
  const [viewImagesLoading, setViewImagesLoading] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("id_verification_submissions")
        .select("id, user_id, status, legal_name, street_address, apt, city, state, zip, country, id_type, front_file_path, back_file_path, created_at, reviewed_at, rejection_reason")
        .order("created_at", { ascending: false });

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

      setSubmissions(withProfiles);
    } catch (err) {
      console.error("Error loading ID verification submissions:", err);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    if (!viewImagesSub) {
      setViewImagesUrls({ front: null, back: null });
      return;
    }
    let cancelled = false;
    setViewImagesLoading(true);
    (async () => {
      const front = viewImagesSub.front_file_path
        ? await supabase.storage.from(BUCKET_ID_VERIFICATION).createSignedUrl(viewImagesSub.front_file_path, SIGNED_URL_EXPIRES)
        : { data: { signedUrl: null }, error: null };
      const back = viewImagesSub.back_file_path
        ? await supabase.storage.from(BUCKET_ID_VERIFICATION).createSignedUrl(viewImagesSub.back_file_path, SIGNED_URL_EXPIRES)
        : { data: { signedUrl: null }, error: null };
      if (cancelled) return;
      if (front.error) toast.error("Could not load front image");
      if (back.error) toast.error("Could not load back image");
      setViewImagesUrls({
        front: front.data?.signedUrl ?? null,
        back: back.data?.signedUrl ?? null,
      });
      setViewImagesLoading(false);
    })();
    return () => { cancelled = true; };
  }, [viewImagesSub]);

  const handleApprove = async (sub: IdVerificationSubmission) => {
    if (sub.status !== "pending_review") return;
    setProcessingId(sub.id);
    try {
      await invokeEdgeFunction(supabase, "admin-id-verification", {
        method: "POST",
        body: { submissionId: sub.id, action: "approve" },
      });
      toast.success("Approved. Profile and address have been synced.");
      await loadSubmissions();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    const sub = submissions.find((s) => s.id === rejectDialog.id);
    if (!sub || sub.status !== "pending_review") return;
    setProcessingId(sub.id);
    try {
      await invokeEdgeFunction(supabase, "admin-id-verification", {
        method: "POST",
        body: {
          submissionId: sub.id,
          action: "reject",
          rejection_reason: rejectReason.trim() || undefined,
        },
      });
      toast.success("Rejected.");
      setRejectDialog(null);
      setRejectReason("");
      await loadSubmissions();
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
                <ShieldCheck className="h-5 w-5" />
                ID verification submissions
              </CardTitle>
              <CardDescription>
                Review submitted IDs. Approve to sync name and address to the user&apos;s profile and set ID verified.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadSubmissions} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No ID verification submissions yet.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Name & address</TableHead>
                    <TableHead>ID type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{sub.profile?.full_name || "—"}</span>
                          <span className="block text-xs text-muted-foreground">{sub.profile?.email || sub.user_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(sub.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-0.5 max-w-[240px]">
                          {sub.legal_name && <p className="font-medium">{sub.legal_name}</p>}
                          {sub.street_address && (
                            <p className="text-muted-foreground truncate">
                              {sub.apt ? `${sub.street_address}, ${sub.apt}` : sub.street_address}
                            </p>
                          )}
                          {(sub.city || sub.state || sub.zip) && (
                            <p className="text-muted-foreground">
                              {[sub.city, sub.state, sub.zip].filter(Boolean).join(", ")}
                            </p>
                          )}
                          {sub.country && <p className="text-muted-foreground">{sub.country}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.id_type ? ID_TYPE_LABELS[sub.id_type] || sub.id_type : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sub.status === "pending_review"
                              ? "default"
                              : sub.status === "approved"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {sub.status === "pending_review" ? "Pending review" : sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => setViewImagesSub(sub)}
                          >
                            <Eye className="h-4 w-4" />
                            View ID
                          </Button>
                          {sub.status === "pending_review" && (
                            <>
                              <Button
                                size="sm"
                                className="gap-1"
                                disabled={processingId !== null}
                                onClick={() => handleApprove(sub)}
                              >
                                {processingId === sub.id ? "Applying…" : (
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
                                onClick={() => setRejectDialog({ id: sub.id })}
                              >
                                <X className="h-4 w-4" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewImagesSub} onOpenChange={(open) => { if (!open) setViewImagesSub(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Uploaded ID documents</DialogTitle>
            <DialogDescription>
              {viewImagesSub?.legal_name && <span>{viewImagesSub.legal_name}</span>}
              {viewImagesSub?.id_type && (
                <span className="ml-1">({ID_TYPE_LABELS[viewImagesSub.id_type] || viewImagesSub.id_type})</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {viewImagesLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Loading images…
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium mb-2">Front of ID</p>
                  {viewImagesUrls.front ? (
                    <a href={viewImagesUrls.front} target="_blank" rel="noopener noreferrer" className="block rounded-md border overflow-hidden bg-muted/30">
                      <img src={viewImagesUrls.front} alt="Front of ID" className="w-full max-h-[320px] object-contain" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No front image</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Back of ID</p>
                  {viewImagesUrls.back ? (
                    <a href={viewImagesUrls.back} target="_blank" rel="noopener noreferrer" className="block rounded-md border overflow-hidden bg-muted/30">
                      <img src={viewImagesUrls.back} alt="Back of ID" className="w-full max-h-[320px] object-contain" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No back image</p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) { setRejectDialog(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject ID verification</DialogTitle>
            <DialogDescription>
              Optionally add a reason to show the user why the submission was rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="id-reject-reason">Reason (optional)</Label>
            <Textarea
              id="id-reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. ID image was unclear."
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

export default IdVerificationSubmissionsTab;
