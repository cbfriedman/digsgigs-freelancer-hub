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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  ShieldAlert,
  RefreshCw,
  MoreHorizontal,
  Ban,
  BellOff,
  AlertTriangle,
  User,
  CheckCircle2,
  Settings2,
  Save,
  Trash2,
  MessageSquare,
  Mail,
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

interface UserInfo {
  full_name: string | null;
  email: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

/** Max messages to load so admin sees full chat history (Supabase default is 1000). */
const MESSAGE_HISTORY_LIMIT = 5000;

const DECISION_LABELS: Record<string, string> = {
  block: "Blocked",
  flag: "Flagged",
  allow: "Allowed",
  shadow_block: "Shadow Blocked",
};

const MODERATION_SETTINGS_KEY = "message_moderation";
const DEFAULT_THRESHOLD_BLOCK = 85;
const DEFAULT_THRESHOLD_FLAG = 40;

export function MessageModerationDashboard() {
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>("all");
  const [filterUserId, setFilterUserId] = useState<string>("");
  const [actionUser, setActionUser] = useState<{ id: string; action: string } | null>(null);
  const [muteUntil, setMuteUntil] = useState<string>("24");

  // User email/name for display
  const [userInfoMap, setUserInfoMap] = useState<Record<string, UserInfo>>({});
  // Message history dialog
  const [historyDialog, setHistoryDialog] = useState<{ conversationId: string; userId: string } | null>(null);
  const [historyMessages, setHistoryMessages] = useState<MessageRow[]>([]);
  const [historySenderNames, setHistorySenderNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  // Selection and delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<"selected" | "all" | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Admin-configurable moderation sensitivity
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [thresholdBlock, setThresholdBlock] = useState(DEFAULT_THRESHOLD_BLOCK);
  const [thresholdFlag, setThresholdFlag] = useState(DEFAULT_THRESHOLD_FLAG);
  const [blockOnContactKeywords, setBlockOnContactKeywords] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      let query = (supabase as any)
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
    const { data, error } = await (supabase as any)
      .from("user_moderation_profile")
      .select("*")
      .in("user_id", userIds);
    if (error) return;
    const map: Record<string, UserProfile> = {};
    ((data || []) as UserProfile[]).forEach((p: UserProfile) => {
      map[p.user_id] = p;
    });
    setProfiles(map);
  }, []);

  const loadUserInfos = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    if (error) return;
    const map: Record<string, UserInfo> = {};
    ((data || []) as { id: string; full_name: string | null; email: string | null }[]).forEach((p) => {
      map[p.id] = { full_name: p.full_name ?? null, email: p.email ?? null };
    });
    setUserInfoMap((prev) => ({ ...prev, ...map }));
  }, []);

  const loadModerationSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", MODERATION_SETTINGS_KEY)
        .maybeSingle();
      if (error) return;
      const v = (data?.value || {}) as { threshold_block?: number; threshold_flag?: number; block_on_contact_keywords?: boolean };
      if (typeof v.threshold_block === "number") setThresholdBlock(Math.min(99, Math.max(50, v.threshold_block)));
      if (typeof v.threshold_flag === "number") setThresholdFlag(Math.min(80, Math.max(20, v.threshold_flag)));
      if (typeof v.block_on_contact_keywords === "boolean") setBlockOnContactKeywords(v.block_on_contact_keywords);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const saveModerationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const block = Math.min(99, Math.max(50, Number(thresholdBlock) || DEFAULT_THRESHOLD_BLOCK));
      const flag = Math.min(80, Math.max(20, Number(thresholdFlag) || DEFAULT_THRESHOLD_FLAG));
      const value = { threshold_block: block, threshold_flag: flag, block_on_contact_keywords: blockOnContactKeywords };
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          {
            key: MODERATION_SETTINGS_KEY,
            value,
            description: "Message moderation sensitivity (threshold_block, threshold_flag, block_on_contact_keywords).",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;
      setThresholdBlock(block);
      setThresholdFlag(flag);
      toast.success("Moderation settings saved. New messages will use these values.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadModerationSettings();
  }, [loadModerationSettings]);

  useEffect(() => {
    const ids = [...new Set(events.map((e) => e.user_id))];
    loadProfiles(ids);
    loadUserInfos(ids);
  }, [events, loadProfiles, loadUserInfos]);

  const openMessageHistory = async (conversationId: string, userId: string) => {
    setHistoryDialog({ conversationId, userId });
    setHistoryMessages([]);
    setHistorySenderNames({});
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .range(0, MESSAGE_HISTORY_LIMIT - 1);
      if (error) throw error;
      const list = (data || []) as MessageRow[];
      setHistoryMessages(list);
      const senderIds = [...new Set(list.map((m) => m.sender_id))];
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          nameMap[p.id] = (p.full_name || "—").trim();
        });
        setHistorySenderNames(nameMap);
      }
    } catch (e) {
      console.error("Load message history:", e);
      toast.error("Failed to load message history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (deleteConfirm !== "selected" && deleteConfirm !== "all") return;
    const idsToDelete = deleteConfirm === "all" ? events.map((e) => e.id) : [...selectedIds];
    if (idsToDelete.length === 0) {
      setDeleteConfirm(null);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("message_moderation_events")
        .delete()
        .in("id", idsToDelete);
      if (error) throw error;
      toast.success(deleteConfirm === "all" ? "All moderation events removed." : `${idsToDelete.length} event(s) removed.`);
      setSelectedIds(new Set());
      setDeleteConfirm(null);
      loadEvents();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(events.map((e) => e.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleAction = async () => {
    if (!actionUser) return;
    const { id: userId, action } = actionUser;
    try {
      if (action === "warn") {
        await (supabase as any).rpc("admin_warn_user", { _target_user_id: userId });
        toast.success("User warned");
      } else if (action === "mute") {
        const hours = parseInt(muteUntil, 10) || 24;
        const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
        await (supabase as any).rpc("admin_mute_user", { _target_user_id: userId, _until: until });
        toast.success(`User muted for ${hours} hours`);
      } else if (action === "ban") {
        await (supabase as any).rpc("admin_ban_user", { _target_user_id: userId });
        toast.success("User banned");
      } else if (action === "unmute") {
        await (supabase as any).rpc("admin_unmute_user", { _target_user_id: userId });
        toast.success("User unmuted");
      } else if (action === "unban") {
        await (supabase as any).rpc("admin_unban_user", { _target_user_id: userId });
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
      {/* Admin-configurable sensitivity — reduce false blocks on general wording */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Moderation sensitivity
          </CardTitle>
          <CardDescription>
            Lower sensitivity if normal messages are being blocked. Block threshold: message is blocked when score ≥ this (50–99). Flag threshold: message is flagged for review when score ≥ this (20–80). Contact keywords: if off, phrases like &quot;text me&quot; or &quot;call me&quot; only add to score and do not auto-block.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading settings…
            </div>
          ) : (
            <form onSubmit={saveModerationSettings} className="space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mod-threshold-block">Block threshold (50–99)</Label>
                  <Input
                    id="mod-threshold-block"
                    type="number"
                    min={50}
                    max={99}
                    value={thresholdBlock}
                    onChange={(e) => setThresholdBlock(Number(e.target.value) || DEFAULT_THRESHOLD_BLOCK)}
                  />
                  <p className="text-xs text-muted-foreground">Default 85. Higher = fewer blocks.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mod-threshold-flag">Flag threshold (20–80)</Label>
                  <Input
                    id="mod-threshold-flag"
                    type="number"
                    min={20}
                    max={80}
                    value={thresholdFlag}
                    onChange={(e) => setThresholdFlag(Number(e.target.value) || DEFAULT_THRESHOLD_FLAG)}
                  />
                  <p className="text-xs text-muted-foreground">Default 40. Higher = fewer flags.</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mod-block-contact-keywords"
                  checked={blockOnContactKeywords}
                  onCheckedChange={(checked) => setBlockOnContactKeywords(checked === true)}
                />
                <Label htmlFor="mod-block-contact-keywords" className="font-normal cursor-pointer">
                  Block on contact phrases (&quot;text me&quot;, &quot;call me&quot;, etc.). Turn off to only add these to score and reduce false blocks on general wording.
                </Label>
              </div>
              <Button type="submit" disabled={settingsSaving}>
                {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save sensitivity
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

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
            <div className="flex gap-2 items-center flex-wrap">
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
              {events.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setDeleteConfirm("selected")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete selected ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/50 hover:bg-destructive/10"
                    onClick={() => setDeleteConfirm("all")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear all
                  </Button>
                </>
              )}
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
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          events.length === 0
                            ? false
                            : selectedIds.size === events.length
                              ? true
                              : "indeterminate"
                        }
                        onCheckedChange={(c) => toggleSelectAll(c === true)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => {
                    const profile = profiles[ev.user_id];
                    const userInfo = userInfoMap[ev.user_id];
                    return (
                      <TableRow key={ev.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(ev.id)}
                            onCheckedChange={(c) => toggleSelectOne(ev.id, c === true)}
                            aria-label={`Select event ${ev.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(ev.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            {userInfo && (
                              <>
                                <span className="font-medium text-foreground truncate" title={userInfo.full_name ?? undefined}>
                                  {userInfo.full_name?.trim() || "—"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate flex items-center gap-1" title={userInfo.email ?? undefined}>
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {userInfo.email || "—"}
                                </span>
                              </>
                            )}
                            {!userInfo && (
                              <span className="font-mono text-xs">{ev.user_id.slice(0, 8)}...</span>
                            )}
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
                          <div className="flex items-center gap-1">
                            {ev.conversation_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => openMessageHistory(ev.conversation_id, ev.user_id)}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                History
                              </Button>
                            )}
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
                          </div>
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

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => !deleting && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm === "all" ? "Clear all moderation events" : "Delete selected events"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm === "all"
                ? `This will permanently remove all ${events.length} moderation event(s) from the log. This cannot be undone.`
                : `This will permanently remove ${selectedIds.size} selected event(s). This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                handleDeleteSelected();
              }}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!historyDialog} onOpenChange={() => setHistoryDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-2 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Full chat history
              </DialogTitle>
            </DialogHeader>
            {historyDialog && (
              <p className="text-sm text-muted-foreground mt-1">
                All messages in this conversation (user: {userInfoMap[historyDialog.userId]?.full_name?.trim() || userInfoMap[historyDialog.userId]?.email || historyDialog.userId.slice(0, 8) + "…"})
                {userInfoMap[historyDialog.userId]?.email && ` · ${userInfoMap[historyDialog.userId].email}`}
              </p>
            )}
          </div>
          <div className="flex-1 min-h-0 flex flex-col rounded-b-lg border-t overflow-hidden">
            <div className="h-[50vh] min-h-[240px] max-h-[60vh] w-full overflow-y-auto overflow-x-hidden p-4 pr-6">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : historyMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages in this conversation.</p>
                ) : (
                  <div className="space-y-3">
                    {historyMessages.length >= MESSAGE_HISTORY_LIMIT && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        Showing latest {MESSAGE_HISTORY_LIMIT} messages.
                      </p>
                    )}
                    {historyMessages.map((msg) => {
                      const isUser = historyDialog ? msg.sender_id === historyDialog.userId : false;
                      const senderName = historySenderNames[msg.sender_id] || msg.sender_id.slice(0, 8) + "…";
                      return (
                        <div
                          key={msg.id}
                          className={`text-sm rounded-lg p-3 ${
                            isUser
                              ? "bg-primary/10 border-l-2 border-primary ml-2"
                              : "bg-muted/50 border-l-2 border-muted-foreground/30 mr-2"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <span className="font-medium text-foreground">
                              {senderName}
                              {isUser && (
                                <Badge variant="secondary" className="ml-1.5 text-xs">user</Badge>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {format(new Date(msg.created_at), "MMM d, yyyy HH:mm")}
                            </span>
                          </div>
                          <p className="mt-1.5 break-words whitespace-pre-wrap">{msg.content || "(attachment)"}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
