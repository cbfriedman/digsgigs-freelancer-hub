import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Loader2,
  ShieldAlert,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Ban,
  BellOff,
  AlertTriangle,
  User,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ModerationEvent {
  id: string;
  message_id: string | null;
  conversation_id: string;
  user_id: string;
  recipient_id: string | null;
  decision: string;
  total_score: number;
  severity: string | null;
  reasons: string[];
  matches: { ruleId: string; category: string; snippet: string; severity: string; score: number }[];
  detector_results: { detector: string; totalScore: number; blocked: boolean }[];
  content_preview: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  violation_points: number;
  warning_count: number;
  muted_until: string | null;
  is_banned: boolean;
  last_violation_at: string | null;
}

const DECISION_LABELS: Record<string, string> = {
  block: "Blocked",
  flag: "Flagged",
  allow: "Allowed",
  shadow_block: "Shadow Blocked",
};

export function MessageModerationDashboard() {
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [actionUser, setActionUser] = useState<{ id: string; action: string } | null>(null);
  const [muteUntil, setMuteUntil] = useState<string>("24");

  const loadEvents = useCallback(async () => {
    try {
      let query = supabase
        .from("message_moderation_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filterDecision !== "all") {
        query = query.eq("decision", filterDecision);
      }
      if (filterUserId.trim()) {
        query = query.eq("user_id", filterUserId.trim());
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents((data || []) as ModerationEvent[]);
    } catch (e) {
      console.error("Load moderation events:", e);
      toast.error("Failed to load moderation events");
    } finally {
      setLoading(false);
    }
  }, [filterDecision, filterUserId]);

  const loadProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data, error } = await supabase
      .from("user_moderation_profile")
      .select("*")
      .in("user_id", userIds);
    if (error) return;
    const map: Record<string, UserProfile> = {};
    (data || []).forEach((p: UserProfile) => {
      map[p.user_id] = p;
    });
    setProfiles(map);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const ids = [...new Set(events.map((e) => e.user_id))];
    loadProfiles(ids);
  }, [events, loadProfiles]);

  const handleAction = async () => {
    if (!actionUser) return;
    const { id: userId, action } = actionUser;
    try {
      if (action === "warn") {
        await supabase.rpc("admin_warn_user", { _target_user_id: userId });
        toast.success("User warned");
      } else if (action === "mute") {
        const hours = parseInt(muteUntil, 10) || 24;
        const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        await supabase.rpc("admin_mute_user", { _target_user_id: userId, _until: until });
        toast.success(`User muted for ${hours} hours`);
      } else if (action === "ban") {
        await supabase.rpc("admin_ban_user", { _target_user_id: userId });
        toast.success("User banned");
      } else if (action === "unmute") {
        await supabase.rpc("admin_unmute_user", { _target_user_id: userId });
        toast.success("User unmuted");
      } else if (action === "unban") {
        await supabase.rpc("admin_unban_user", { _target_user_id: userId });
        toast.success("User unbanned");
      }
      setActionUser(null);
      loadProfiles([userId]);
      loadEvents();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  const stats = {
    block: events.filter((e) => e.decision === "block").length,
    flag: events.filter((e) => e.decision === "flag").length,
    last24h: events.filter(
      (e) => new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Message Moderation
          </CardTitle>
          <CardDescription>
            Blocked and flagged messages from the moderation system. Server-side detection is authoritative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex gap-2 items-center">
              <Select value={filterDecision} onValueChange={setFilterDecision}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Decision" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="block">Blocked</SelectItem>
                  <SelectItem value="flag">Flagged</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Filter by user ID"
                value={filterUserId}
                onChange={(e) => setFilterUserId(e.target.value)}
                className="w-[200px]"
              />
              <Button variant="outline" size="sm" onClick={() => loadEvents()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            <div className="flex gap-4">
              <Badge variant="destructive">Blocked: {stats.block}</Badge>
              <Badge variant="secondary">Flagged: {stats.flag}</Badge>
              <Badge variant="outline">Last 24h: {stats.last24h}</Badge>
            </div>
          </div>

          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No moderation events yet. Blocked/flagged messages will appear here.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => {
                    const profile = profiles[ev.user_id];
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(ev.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs">{ev.user_id.slice(0, 8)}...</span>
                            {profile && (
                              <div className="flex gap-1 flex-wrap">
                                {profile.is_banned && (
                                  <Badge variant="destructive" className="text-xs">Banned</Badge>
                                )}
                                {profile.muted_until && new Date(profile.muted_until) > new Date() && (
                                  <Badge variant="secondary" className="text-xs">Muted</Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {profile.warning_count} warnings
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={ev.decision === "block" ? "destructive" : "secondary"}
                          >
                            {DECISION_LABELS[ev.decision] ?? ev.decision}
                          </Badge>
                        </TableCell>
                        <TableCell>{ev.total_score}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(ev.reasons || []).slice(0, 3).map((r, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="text-xs text-muted-foreground truncate">
                            {ev.content_preview ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setActionUser({ id: ev.user_id, action: "warn" })}
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Warn user
                              </DropdownMenuItem>
                              {profile?.muted_until && new Date(profile.muted_until) > new Date() ? (
                                <DropdownMenuItem
                                  onClick={() => setActionUser({ id: ev.user_id, action: "unmute" })}
                                >
                                  <BellOff className="h-4 w-4 mr-2" />
                                  Unmute user
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setActionUser({ id: ev.user_id, action: "mute" })}
                                >
                                  <BellOff className="h-4 w-4 mr-2" />
                                  Mute user
                                </DropdownMenuItem>
                              )}
                              {profile?.is_banned ? (
                                <DropdownMenuItem
                                  onClick={() => setActionUser({ id: ev.user_id, action: "unban" })}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Unban user
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setActionUser({ id: ev.user_id, action: "ban" })}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban user
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AlertDialog open={!!actionUser} onOpenChange={() => setActionUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionUser?.action === "ban" && "Ban user"}
              {actionUser?.action === "unban" && "Unban user"}
              {actionUser?.action === "mute" && "Mute user"}
              {actionUser?.action === "unmute" && "Unmute user"}
              {actionUser?.action === "warn" && "Warn user"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionUser?.action === "ban" &&
                "This action will prevent the user from sending messages. They will need to contact support to appeal."}
              {actionUser?.action === "unban" && "This will restore the user's ability to send messages."}
              {actionUser?.action === "mute" && (
                <div className="space-y-2">
                  <p>Mute user for a period of time.</p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Hours:</label>
                    <Input
                      type="number"
                      value={muteUntil}
                      onChange={(e) => setMuteUntil(e.target.value)}
                      className="w-20"
                    />
                  </div>
                </div>
              )}
              {actionUser?.action === "unmute" && "This will restore the user's ability to send messages."}
              {actionUser?.action === "warn" && "This will increment the user's warning count."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionUser?.action === "ban" ? "bg-destructive text-destructive-foreground" : ""}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
