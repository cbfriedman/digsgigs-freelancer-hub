import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Briefcase, MoreHorizontal, RefreshCw, Search, Trash2, User, Eye, PauseCircle, PlayCircle, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface GigRow {
  id: string;
  title: string;
  description: string;
  status: string;
  consumer_id: string | null;
  created_at: string;
  updated_at: string;
  budget_min: number | null;
  budget_max: number | null;
  purchase_count?: number;
  categories: { name: string } | null;
}

const STATUS_OPTIONS = ["open", "in_progress", "completed", "cancelled", "pending_confirmation", "suspended"];

export default function ManageGigsTab() {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; email: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusEditId, setStatusEditId] = useState<string | null>(null);
  const [statusEditValue, setStatusEditValue] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const loadGigs = async () => {
    setLoading(true);
    try {
      const { data: gigsData, error: gigsError } = await supabase
        .from("gigs")
        .select(`
          id,
          title,
          description,
          status,
          consumer_id,
          created_at,
          updated_at,
          budget_min,
          budget_max,
          purchase_count,
          categories (name)
        `)
        .order("created_at", { ascending: false });

      if (gigsError) throw gigsError;
      const list = (gigsData || []) as GigRow[];
      setGigs(list);

      const consumerIds = [...new Set(list.map((g) => g.consumer_id).filter(Boolean))] as string[];
      if (consumerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", consumerIds);
        const map: Record<string, { full_name: string | null; email: string | null }> = {};
        (profilesData || []).forEach((p: { id: string; full_name: string | null; email: string | null }) => {
          map[p.id] = { full_name: p.full_name ?? null, email: p.email ?? null };
        });
        setProfiles(map);
      } else {
        setProfiles({});
      }
    } catch (e) {
      console.error("Error loading gigs:", e);
      toast.error("Failed to load gigs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGigs();
  }, []);

  const filtered = gigs.filter((g) => {
    if (statusFilter !== "all" && g.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (g.title || "").toLowerCase();
      const desc = (g.description || "").toLowerCase();
      const who = profiles[g.consumer_id!]?.full_name?.toLowerCase() || profiles[g.consumer_id!]?.email?.toLowerCase() || "";
      if (!title.includes(q) && !desc.includes(q) && !who.includes(q)) return false;
    }
    return true;
  });

  const setStatus = async (gigId: string, status: string) => {
    setActioning(gigId);
    try {
      const { error } = await supabase.from("gigs").update({ status, updated_at: new Date().toISOString() }).eq("id", gigId);
      if (error) throw error;
      setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, status } : g)));
      setStatusEditId(null);
      toast.success(`Status set to ${status}`);
    } catch (e) {
      toast.error("Failed to update status");
    } finally {
      setActioning(null);
    }
  };

  const openStatusEdit = (gig: GigRow) => {
    setStatusEditId(g.id);
    setStatusEditValue(g.status);
  };

  const deleteGig = async (gigId: string) => {
    setActioning(gigId);
    try {
      const { error } = await supabase.from("gigs").delete().eq("id", gigId);
      if (error) throw error;
      setGigs((prev) => prev.filter((g) => g.id !== gigId));
      setDeleteId(null);
      toast.success("Gig removed");
    } catch (e) {
      toast.error("Failed to delete gig");
    } finally {
      setActioning(null);
    }
  };

  const getConsumerLabel = (consumerId: string | null) => {
    if (!consumerId) return "—";
    const p = profiles[consumerId];
    if (!p) return consumerId.slice(0, 8) + "…";
    return p.full_name?.trim() || p.email || consumerId.slice(0, 8) + "…";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manage all gigs</h2>
        <p className="text-muted-foreground text-sm">
          View who posted what, when; suspend, modify, or remove gigs.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Gigs ({filtered.length}{statusFilter !== "all" || searchQuery ? ` of ${gigs.length}` : ""})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, description, owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadGigs} disabled={loading}>
                <RefreshCw className={loading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
              </Button>
            </div>
          </div>
          <CardDescription>Click row actions to suspend, change status, or delete.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No gigs match.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <div className="font-medium max-w-[200px] truncate" title={g.title}>
                          {g.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={g.status === "open" ? "default" : g.status === "suspended" ? "destructive" : "secondary"}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {getConsumerLabel(g.consumer_id)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {g.categories?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(g.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {format(new Date(g.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {g.purchase_count != null ? g.purchase_count : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!!actioning}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/gig/${g.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View gig page
                            </DropdownMenuItem>
                            {g.status !== "suspended" && (
                              <DropdownMenuItem onClick={() => setStatus(g.id, "suspended")} disabled={actioning === g.id}>
                                <PauseCircle className="h-4 w-4 mr-2" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {g.status === "suspended" && (
                              <DropdownMenuItem onClick={() => setStatus(g.id, "open")} disabled={actioning === g.id}>
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Unsuspend (set open)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openStatusEdit(g)}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Set status…
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteId(g.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove gig
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this gig?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the gig and can affect related leads and conversations. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteGig(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!statusEditId} onOpenChange={(open) => !open && setStatusEditId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set gig status</AlertDialogTitle>
            <AlertDialogDescription>
              Choose the new status for this gig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={statusEditValue} onValueChange={setStatusEditValue}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusEditId && setStatus(statusEditId, statusEditValue)}
              disabled={actioning === statusEditId}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
