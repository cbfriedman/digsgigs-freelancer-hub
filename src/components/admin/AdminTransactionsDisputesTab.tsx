import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Receipt, AlertTriangle, ChevronDown, RefreshCw, Search, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AdminTransaction {
  id: string;
  gig_id: string;
  total_amount: number;
  commission_amount: number;
  digger_payout: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  is_escrow: boolean | null;
  gigs: { id: string; title: string; consumer_id: string } | null;
  consumer_name: string | null;
  digger_name: string | null;
}

interface DisputeRow {
  id: string;
  gig_id: string;
  escrow_contract_id: string | null;
  transaction_id: string | null;
  milestone_payment_id: string | null;
  raised_by_user_id: string;
  subject: string;
  description: string | null;
  status: string;
  resolution_type: string | null;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  gigs: { id: string; title: string } | null;
  raised_by_name: string | null;
  resolved_by_name: string | null;
}

const RESOLUTION_TYPES = [
  { value: "closed_no_action", label: "Close (no action)" },
  { value: "refund_consumer", label: "Refund to consumer" },
  { value: "release_to_digger", label: "Release to digger" },
  { value: "partial_refund", label: "Partial refund" },
] as const;

export default function AdminTransactionsDisputesTab() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingDisputes, setLoadingDisputes] = useState(true);
  const [gigSearch, setGigSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState<string>("all");
  const [disputeStatusFilter, setDisputeStatusFilter] = useState<string>("all");
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [resolutionType, setResolutionType] = useState<Record<string, string>>({});
  const [savingDisputeId, setSavingDisputeId] = useState<string | null>(null);
  const [resolveDialog, setResolveDialog] = useState<DisputeRow | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveType, setResolveType] = useState<string>("closed_no_action");

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select(`
          id,
          gig_id,
          digger_id,
          total_amount,
          commission_amount,
          digger_payout,
          status,
          created_at,
          completed_at,
          is_escrow,
          gigs ( id, title, consumer_id )
        `)
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      const rows = (txData || []) as (typeof txData extends (infer R)[] ? R : never)[];
      const consumerIds = [...new Set(rows.map((r: any) => r.gigs?.consumer_id).filter(Boolean))] as string[];
      const diggerIds = [...new Set(rows.map((r: any) => (r as any).digger_id).filter(Boolean))];
      const diggerIdList = rows.map((r: any) => (r as any).digger_id).filter(Boolean);
      const uniqueDiggerIds = [...new Set(diggerIdList)] as string[];

      let consumerNames: Record<string, string> = {};
      let diggerNames: Record<string, string> = {};

      if (consumerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", consumerIds);
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          consumerNames[p.id] = p.full_name?.trim() || "—";
        });
      }

      if (uniqueDiggerIds.length > 0) {
        const { data: diggers } = await supabase
          .from("digger_profiles")
          .select("id, business_name, profile_name")
          .in("id", uniqueDiggerIds);
        (diggers || []).forEach((d: { id: string; business_name: string | null; profile_name: string | null }) => {
          diggerNames[d.id] = (d.business_name || d.profile_name || "—").trim();
        });
      }

      const list: AdminTransaction[] = rows.map((r: any) => ({
        id: r.id,
        gig_id: r.gig_id,
        total_amount: Number(r.total_amount),
        commission_amount: Number(r.commission_amount),
        digger_payout: Number(r.digger_payout),
        status: r.status,
        created_at: r.created_at,
        completed_at: r.completed_at,
        is_escrow: r.is_escrow ?? false,
        gigs: r.gigs,
        consumer_name: r.gigs?.consumer_id ? consumerNames[r.gigs.consumer_id] ?? null : null,
        digger_name: r.digger_id ? diggerNames[r.digger_id] ?? null : null,
      }));

      setTransactions(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load transactions");
    } finally {
      setLoadingTx(false);
    }
  };

  const loadDisputes = async () => {
    setLoadingDisputes(true);
    try {
      const { data: disputeData, error: disputeError } = await (supabase as any)
        .from("disputes")
        .select(`
          id,
          gig_id,
          escrow_contract_id,
          transaction_id,
          milestone_payment_id,
          raised_by_user_id,
          subject,
          description,
          status,
          resolution_type,
          admin_notes,
          resolved_at,
          resolved_by_user_id,
          created_at,
          updated_at,
          gigs ( id, title )
        `)
        .order("created_at", { ascending: false });

      if (disputeError) throw disputeError;

      const list = (disputeData || []) as any[];
      const userIds = new Set<string>();
      list.forEach((d) => {
        if (d.raised_by_user_id) userIds.add(d.raised_by_user_id);
        if (d.resolved_by_user_id) userIds.add(d.resolved_by_user_id);
      });

      let nameMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...userIds]);
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          nameMap[p.id] = p.full_name?.trim() || "—";
        });
      }

      const out: DisputeRow[] = list.map((d) => ({
        ...d,
        raised_by_name: nameMap[d.raised_by_user_id] ?? null,
        resolved_by_name: d.resolved_by_user_id ? nameMap[d.resolved_by_user_id] ?? null : null,
      }));

      setDisputes(out);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load disputes");
    } finally {
      setLoadingDisputes(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    loadDisputes();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (gigSearch.trim()) {
      const q = gigSearch.toLowerCase();
      const title = t.gigs?.title?.toLowerCase() ?? "";
      const consumer = t.consumer_name?.toLowerCase() ?? "";
      const digger = t.digger_name?.toLowerCase() ?? "";
      if (!title.includes(q) && !consumer.includes(q) && !digger.includes(q)) return false;
    }
    if (txStatusFilter !== "all" && t.status !== txStatusFilter) return false;
    return true;
  });

  const filteredDisputes = disputes.filter((d) => {
    if (disputeStatusFilter !== "all" && d.status !== disputeStatusFilter) return false;
    if (gigSearch.trim()) {
      const q = gigSearch.toLowerCase();
      const title = d.gigs?.title?.toLowerCase() ?? "";
      const subj = d.subject?.toLowerCase() ?? "";
      const who = d.raised_by_name?.toLowerCase() ?? "";
      if (!title.includes(q) && !subj.includes(q) && !who.includes(q)) return false;
    }
    return true;
  });

  const updateDisputeNotes = async (disputeId: string, notes: string) => {
    setSavingDisputeId(disputeId);
    try {
      const { error } = await (supabase as any)
        .from("disputes")
        .update({ admin_notes: notes || null, updated_at: new Date().toISOString() })
        .eq("id", disputeId);
      if (error) throw error;
      setDisputes((prev) =>
        prev.map((d) => (d.id === disputeId ? { ...d, admin_notes: notes || null } : d))
      );
      setAdminNotes((prev) => ({ ...prev, [disputeId]: notes }));
      toast.success("Notes saved");
    } catch (e) {
      toast.error("Failed to save notes");
    } finally {
      setSavingDisputeId(null);
    }
  };

  const resolveDispute = async () => {
    if (!resolveDialog) return;
    setSavingDisputeId(resolveDialog.id);
    try {
      await invokeEdgeFunction(supabase, "admin-resolve-dispute", {
        body: {
          dispute_id: resolveDialog.id,
          resolution_type: resolveType,
          admin_notes: resolveNotes || undefined,
        },
      });
      toast.success("Dispute resolved");
      setResolveDialog(null);
      setResolveNotes("");
      setResolveType("closed_no_action");
      await loadDisputes();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to resolve dispute");
    } finally {
      setSavingDisputeId(null);
    }
  };

  const openResolveDialog = (d: DisputeRow) => {
    setResolveDialog(d);
    setResolveNotes(d.admin_notes || "");
    setResolveType(d.resolution_type || "closed_no_action");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions &amp; Disputes</h2>
        <p className="text-muted-foreground text-sm">
          View all transaction history per gig and resolve payment disputes.
        </p>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions" className="gap-2">
            <Receipt className="h-4 w-4" />
            Transactions ({transactions.length})
          </TabsTrigger>
          <TabsTrigger value="disputes" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Disputes ({disputes.filter((d) => d.status !== "resolved").length} open)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>All transactions</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Gig, consumer, digger..."
                      value={gigSearch}
                      onChange={(e) => setGigSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={txStatusFilter} onValueChange={setTxStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadTransactions} disabled={loadingTx}>
                    <RefreshCw className={loadingTx ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  </Button>
                </div>
              </div>
              <CardDescription>Every payment tied to a gig. Use filters to find by gig or party.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTx ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gig</TableHead>
                        <TableHead>Consumer</TableHead>
                        <TableHead>Digger</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Escrow</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No transactions match.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <span className="font-medium max-w-[180px] truncate block" title={t.gigs?.title ?? ""}>
                                {t.gigs?.title ?? "—"}
                              </span>
                            </TableCell>
                            <TableCell>{t.consumer_name ?? "—"}</TableCell>
                            <TableCell>{t.digger_name ?? "—"}</TableCell>
                            <TableCell className="text-right">${t.total_amount.toFixed(2)}</TableCell>
                            <TableCell>${t.commission_amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={t.status === "completed" ? "default" : t.status === "refunded" ? "secondary" : "outline"}>
                                {t.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{t.is_escrow ? "Yes" : "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                              {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/gig/${t.gig_id}`)}
                                className="gap-1"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Disputes</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Gig, subject, raised by..."
                      value={gigSearch}
                      onChange={(e) => setGigSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={disputeStatusFilter} onValueChange={setDisputeStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_review">In review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadDisputes} disabled={loadingDisputes}>
                    <RefreshCw className={loadingDisputes ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                  </Button>
                </div>
              </div>
              <CardDescription>Add notes and resolve disputes. Refund/release actions run via secure admin function.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingDisputes ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Gig</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Raised by</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Resolution</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDisputes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No disputes match.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDisputes.map((d) => (
                          <Collapsible
                            key={d.id}
                            open={expandedDisputeId === d.id}
                            onOpenChange={(open) => setExpandedDisputeId(open ? d.id : null)}
                          >
                            <TableRow className={d.status === "open" ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                              <TableCell>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${expandedDisputeId === d.id ? "rotate-180" : ""}`}
                                    />
                                  </Button>
                                </CollapsibleTrigger>
                              </TableCell>
                              <TableCell>
                                <span className="max-w-[160px] truncate block" title={d.gigs?.title ?? ""}>
                                  {d.gigs?.title ?? "—"}
                                </span>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={d.subject}>
                                {d.subject}
                              </TableCell>
                              <TableCell>{d.raised_by_name ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={d.status === "resolved" ? "secondary" : d.status === "in_review" ? "default" : "destructive"}>
                                  {d.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {d.status === "resolved" ? (d.resolution_type ?? "—") : "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                {format(new Date(d.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                {d.status !== "resolved" && (
                                  <Button variant="outline" size="sm" onClick={() => openResolveDialog(d)}>
                                    Resolve
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                            <CollapsibleContent asChild>
                              <>
                                <TableRow>
                                  <TableCell colSpan={8} className="bg-muted/30 p-4">
                                    <div className="space-y-3 text-sm">
                                      {d.description && (
                                        <p><span className="font-medium">Description:</span> {d.description}</p>
                                      )}
                                      <div>
                                        <span className="font-medium">Admin notes:</span>
                                        <Textarea
                                          className="mt-1 max-w-xl"
                                          placeholder="Add internal notes..."
                                          value={adminNotes[d.id] ?? d.admin_notes ?? ""}
                                          onChange={(e) => setAdminNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                                          rows={2}
                                        />
                                        <Button
                                          size="sm"
                                          className="mt-2"
                                          disabled={savingDisputeId === d.id}
                                          onClick={() => updateDisputeNotes(d.id, adminNotes[d.id] ?? d.admin_notes ?? "")}
                                        >
                                          {savingDisputeId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
                                        </Button>
                                      </div>
                                      {d.resolved_at && (
                                        <p className="text-muted-foreground">
                                          Resolved {format(new Date(d.resolved_at), "PPp")}
                                          {d.resolved_by_name && ` by ${d.resolved_by_name}`}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </>
                            </CollapsibleContent>
                          </Collapsible>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!resolveDialog} onOpenChange={(open) => !open && setResolveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve dispute</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how to resolve this dispute. Refund and release actions are performed securely via the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Resolution</label>
              <Select value={resolveType} onValueChange={setResolveType}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_TYPES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Admin notes (saved with resolution)</label>
              <Textarea
                className="mt-1"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resolveDispute}
              disabled={savingDisputeId !== null}
            >
              {savingDisputeId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resolve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
