import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, ChevronDown, ChevronRight, Send, RefreshCw, Users, CheckCircle2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const GIG_EMAIL_SETTINGS_ID = "b0000000-0000-0000-0000-000000000001";
type SettingsMode = "manual" | "all" | "selected";

interface GigRow {
  id: string;
  title: string;
  created_at: string;
  pro_blast_sent_at: string | null;
  non_pro_blast_sent_at: string | null;
}

interface DiggerRow {
  id: string;
  user_id: string;
  business_name: string | null;
  email: string;
  full_name: string | null;
}

interface DeliveryRow {
  gig_id: string;
  digger_id: string;
  sent_at: string;
  sent_by: string;
}

export default function GigEmailDeliveryTab() {
  const [gigs, setGigs] = useState<GigRow[]>([]);
  const [diggers, setDiggers] = useState<DiggerRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGigId, setExpandedGigId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Set<string>>>({}); // gigId -> Set of diggerIds
  const [sending, setSending] = useState<string | null>(null); // gigId when sending
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("manual");
  const [settingsSelectedIds, setSettingsSelectedIds] = useState<Set<string>>(new Set());
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gigsRes, diggersRes, deliveriesRes, settingsRes] = await Promise.all([
        supabase
          .from("gigs")
          .select("id, title, created_at, pro_blast_sent_at, non_pro_blast_sent_at")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("digger_profiles")
          .select("id, user_id, business_name, profiles!inner(email, full_name)"),
        (supabase.from("gig_digger_email_deliveries" as any))
          .select("gig_id, digger_id, sent_at, sent_by"),
        (supabase.from("gig_email_delivery_settings" as any))
          .select("mode, selected_digger_ids")
          .eq("id", GIG_EMAIL_SETTINGS_ID)
          .maybeSingle(),
      ]);

      if (gigsRes.error) throw gigsRes.error;
      if (diggersRes.error) throw diggersRes.error;
      if (deliveriesRes.error) throw deliveriesRes.error;

      setGigs((gigsRes.data || []) as GigRow[]);

      const diggerList: DiggerRow[] = (diggersRes.data || []).map((d: any) => ({
        id: d.id,
        user_id: d.user_id,
        business_name: d.business_name ?? null,
        email: d.profiles?.email ?? "",
        full_name: d.profiles?.full_name ?? null,
      }));
      setDiggers(diggerList.filter((d) => d.email));

      setDeliveries((deliveriesRes.data || []) as unknown as DeliveryRow[]);

      const settings = settingsRes.data as unknown as { mode: SettingsMode; selected_digger_ids: string[] } | null;
      if (settings) {
        setSettingsMode(settings.mode);
        setSettingsSelectedIds(new Set(settings.selected_digger_ids || []));
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (mode: SettingsMode, selectedIds: Set<string>) => {
    setSettingsSaving(true);
    try {
      const { error } = await (supabase
        .from("gig_email_delivery_settings" as any))
        .update({
          mode,
          selected_digger_ids: Array.from(selectedIds),
          updated_at: new Date().toISOString(),
        })
        .eq("id", GIG_EMAIL_SETTINGS_ID);

      if (error) throw error;
      setSettingsMode(mode);
      setSettingsSelectedIds(selectedIds);
      toast.success("Settings saved. New projects will use this when giggers post.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSettingsModeChange = (value: string) => {
    const mode = value as SettingsMode;
    setSettingsMode(mode);
    saveSettings(mode, mode === "selected" ? settingsSelectedIds : new Set());
  };

  const deliveryMap = useMemo(() => {
    const map = new Map<string, DeliveryRow>();
    for (const d of deliveries) {
      map.set(`${d.gig_id}:${d.digger_id}`, d);
    }
    return map;
  }, [deliveries]);

  const toggleSelect = (gigId: string, diggerId: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[gigId] || []);
      if (set.has(diggerId)) set.delete(diggerId);
      else set.add(diggerId);
      next[gigId] = set;
      return next;
    });
  };

  const selectAllForGig = (gigId: string, value: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (value) next[gigId] = new Set(diggers.map((d) => d.id));
      else next[gigId] = new Set();
      return next;
    });
  };

  const selectedCount = (gigId: string) => (selected[gigId]?.size ?? 0);
  const isAllSelected = (gigId: string) =>
    diggers.length > 0 && selectedCount(gigId) === diggers.length;
  const isNoneSelected = (gigId: string) => selectedCount(gigId) === 0;

  const sendToSelected = async (gigId: string) => {
    const ids = selected[gigId] ? Array.from(selected[gigId]) : [];
    if (ids.length === 0) {
      toast.error("Select at least one digger");
      return;
    }
    setSending(gigId);
    try {
      const data = await invokeEdgeFunction<{ emailsSent: number; errors?: string[] }>(
        supabase,
        "admin-send-gig-email-to-diggers",
        { body: { gigId, diggerIds: ids } }
      );
      toast.success(`Sent ${data?.emailsSent ?? 0} email(s) successfully`);
      if (data?.errors?.length) {
        toast.error(data.errors.slice(0, 3).join("; "));
      }
      await loadData();
      setSelected((prev) => ({ ...prev, [gigId]: new Set() }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send emails");
    } finally {
      setSending(null);
    }
  };

  const sendToAll = async (gigId: string) => {
    setSending(gigId);
    try {
      const data = await invokeEdgeFunction<{ emailsSent: number; errors?: string[] }>(
        supabase,
        "admin-send-gig-email-to-diggers",
        { body: { gigId } }
      );
      toast.success(`Sent ${data?.emailsSent ?? 0} email(s) to all diggers`);
      if (data?.errors?.length) {
        toast.error(data.errors.slice(0, 3).join("; "));
      }
      await loadData();
      setSelected((prev) => ({ ...prev, [gigId]: new Set() }));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send emails");
    } finally {
      setSending(null);
    }
  };

  const getDelivery = (gigId: string, diggerId: string) =>
    deliveryMap.get(`${gigId}:${diggerId}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            When a gigger posts a new project
          </CardTitle>
          <CardDescription className="mt-1">
            Set this before giggers post. It applies to every new project (and reposts).
          </CardDescription>
          <div className="mt-4">
            <RadioGroup
              value={settingsMode}
              onValueChange={handleSettingsModeChange}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="mode-manual" />
                <Label htmlFor="mode-manual" className="font-normal cursor-pointer">
                  <strong>Manual</strong> — Do not send any email. You send from the table below per gig.
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="mode-all" />
                <Label htmlFor="mode-all" className="font-normal cursor-pointer">
                  <strong>Send to all diggers</strong> — Every new project email goes to all diggers automatically.
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="mode-selected" />
                <Label htmlFor="mode-selected" className="font-normal cursor-pointer">
                  <strong>Send to selected diggers only</strong> — Only the default recipients below get the email.
                </Label>
              </div>
            </RadioGroup>
            {settingsMode === "selected" && (
              <div className="mt-4 rounded border p-4 bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Choose which diggers receive the new project email whenever a gigger posts. Save when done.
                </p>
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Set(diggers.map((d) => d.id));
                      setSettingsSelectedIds(next);
                      saveSettings("selected", next);
                    }}
                    disabled={settingsSaving}
                  >
                    Select all ({diggers.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSettingsSelectedIds(new Set());
                      saveSettings("selected", new Set());
                    }}
                    disabled={settingsSaving}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveSettings("selected", settingsSelectedIds)}
                    disabled={settingsSaving}
                  >
                    {settingsSaving ? "Saving..." : "Save default recipients"}
                  </Button>
                </div>
                <div className="rounded border overflow-x-auto max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Send</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Name / Business</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diggers.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <Checkbox
                              checked={settingsSelectedIds.has(d.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(settingsSelectedIds);
                                if (checked) next.add(d.id);
                                else next.delete(d.id);
                                setSettingsSelectedIds(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{d.email}</TableCell>
                          <TableCell>{d.full_name || d.business_name || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {settingsSelectedIds.size} digger(s) selected as default recipients.
                </p>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gig email delivery (per gig)
          </CardTitle>
          <CardDescription>
            For each gig below you can still send or resend the new project email to all or selected diggers.
          </CardDescription>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Project</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Pro blast</TableHead>
                  <TableHead>All blast</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gigs.map((gig) => (
                  <Fragment key={gig.id}>
                    <TableRow className="align-middle">
                      <TableCell className="p-0 w-8">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setExpandedGigId(expandedGigId === gig.id ? null : gig.id)}
                        >
                          {expandedGigId === gig.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{gig.title}</TableCell>
                      <TableCell>{format(new Date(gig.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        {gig.pro_blast_sent_at ? (
                          <Badge variant="secondary" className="text-xs">
                            {format(new Date(gig.pro_blast_sent_at), "MMM d HH:mm")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {gig.non_pro_blast_sent_at ? (
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(gig.non_pro_blast_sent_at), "MMM d HH:mm")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={sending === gig.id}
                          onClick={() => sendToAll(gig.id)}
                        >
                          {sending === gig.id ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Send to all
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedGigId === gig.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-0">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Diggers ({diggers.length})
                              </span>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => selectAllForGig(gig.id, !isAllSelected(gig.id))}
                                >
                                  {isAllSelected(gig.id) ? "Deselect all" : "Select all"}
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={sending === gig.id || selectedCount(gig.id) === 0}
                                  onClick={() => sendToSelected(gig.id)}
                                >
                                  {sending === gig.id ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Send className="h-3 w-3 mr-1" />
                                  )}
                                  Send to selected ({selectedCount(gig.id)})
                                </Button>
                              </div>
                            </div>
                            <div className="rounded border overflow-x-auto max-h-64 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-10">Send</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Name / Business</TableHead>
                                    <TableHead>Sent at</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {diggers.map((digger) => {
                                    const del = getDelivery(gig.id, digger.id);
                                    return (
                                      <TableRow key={digger.id}>
                                        <TableCell>
                                          <Checkbox
                                            checked={selected[gig.id]?.has(digger.id) ?? false}
                                            onCheckedChange={() => toggleSelect(gig.id, digger.id)}
                                          />
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                          {digger.email}
                                        </TableCell>
                                        <TableCell>
                                          {digger.full_name || digger.business_name || "—"}
                                        </TableCell>
                                        <TableCell>
                                          {del ? (
                                            <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                                              {format(new Date(del.sent_at), "MMM d, HH:mm")}
                                              {del.sent_by === "admin" && (
                                                <Badge variant="outline" className="text-xs">admin</Badge>
                                              )}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">Not sent</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          {gigs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No gigs found. Post a project to see it here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
