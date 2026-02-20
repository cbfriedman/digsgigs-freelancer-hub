import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, ChevronDown, RefreshCw, Search, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ConversationRow {
  id: string;
  gig_id: string | null;
  consumer_id: string;
  digger_id: string | null;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
  gig_title: string | null;
  digger_handle: string | null;
  digger_profession: string | null;
  consumer_name: string | null;
  admin_name: string | null;
  last_message_content: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  sender_name: string | null;
}

export default function AdminChatHistoryTab() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, MessageRow[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});

  const loadConversations = async () => {
    setLoading(true);
    try {
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select(`
          id,
          gig_id,
          consumer_id,
          digger_id,
          admin_id,
          created_at,
          updated_at,
          gigs ( title ),
          digger_profiles ( handle, profession )
        `)
        .order("updated_at", { ascending: false });

      if (convError) throw convError;

      const rows = (convData || []) as any[];
      const userIds = new Set<string>();
      rows.forEach((r) => {
        if (r.consumer_id) userIds.add(r.consumer_id);
        if (r.admin_id) userIds.add(r.admin_id);
      });

      let nameMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...userIds]);
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          nameMap[p.id] = (p.full_name || "—").trim();
        });
      }

      const list: ConversationRow[] = rows.map((r) => ({
        id: r.id,
        gig_id: r.gig_id,
        consumer_id: r.consumer_id,
        digger_id: r.digger_id,
        admin_id: r.admin_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
        gig_title: r.gigs?.title ?? null,
        digger_handle: r.digger_profiles?.handle ?? null,
        digger_profession: r.digger_profiles?.profession ?? null,
        consumer_name: nameMap[r.consumer_id] ?? null,
        admin_name: r.admin_id ? nameMap[r.admin_id] ?? null : null,
        last_message_content: null,
      }));

      const convIds = list.map((c) => c.id);
      if (convIds.length > 0) {
        const { data: lastRows } = await supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false });

        const lastContent: Record<string, string> = {};
        (lastRows || []).forEach((m: any) => {
          if (lastContent[m.conversation_id] == null)
            lastContent[m.conversation_id] = (m.content || "").slice(0, 80);
        });
        list.forEach((c) => {
          c.last_message_content = lastContent[c.id] ?? null;
        });
      }

      setConversations(list);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages((prev) => ({ ...prev, [conversationId]: true }));
    try {
      const { data: msgData, error: msgError } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, content, created_at, read_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) throw msgError;

      const msgs = (msgData || []) as any[];
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      let senderNames: Record<string, string> = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", senderIds);
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          senderNames[p.id] = (p.full_name || "—").trim();
        });
      }

      const out: MessageRow[] = msgs.map((m) => ({
        ...m,
        sender_name: senderNames[m.sender_id] ?? null,
      }));

      setMessagesByConv((prev) => ({ ...prev, [conversationId]: out }));
    } catch (e) {
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (expandedId && !messagesByConv[expandedId]) {
      loadMessages(expandedId);
    }
  }, [expandedId]);

  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const gig = (c.gig_title || "").toLowerCase();
    const consumer = (c.consumer_name || "").toLowerCase();
    const digger = (c.digger_handle || "").toLowerCase();
    const admin = (c.admin_name || "").toLowerCase();
    const last = (c.last_message_content || "").toLowerCase();
    return (
      gig.includes(q) ||
      consumer.includes(q) ||
      digger.includes(q) ||
      admin.includes(q) ||
      last.includes(q)
    );
  });

  const getOtherLabel = (c: ConversationRow) => {
    if (c.admin_id) return `Support (${c.admin_name || "Admin"})`;
    return c.digger_handle || c.digger_profession || "Digger";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Chat history</h2>
        <p className="text-muted-foreground text-sm">
          View all conversations and full message history (read-only).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              All conversations ({filtered.length}{searchQuery ? ` of ${conversations.length}` : ""})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Gig, consumer, digger, message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={loadConversations} disabled={loading}>
                <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              </Button>
            </div>
          </div>
          <CardDescription>Expand a row to see full chat history.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Gig / Title</TableHead>
                    <TableHead>Consumer</TableHead>
                    <TableHead>Other party</TableHead>
                    <TableHead>Last message</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="w-[80px]">View</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No conversations match.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((c) => (
                      <Collapsible
                        key={c.id}
                        open={expandedId === c.id}
                        onOpenChange={(open) => setExpandedId(open ? c.id : null)}
                      >
                        <TableRow>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${expandedId === c.id ? "rotate-180" : ""}`}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            {c.admin_id ? (
                              <span className="text-amber-600 font-medium">Support</span>
                            ) : (
                              <span className="text-muted-foreground">Gig</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="max-w-[180px] truncate block" title={c.gig_title || "—"}>
                              {c.gig_title || (c.admin_id ? "Support chat" : "—")}
                            </span>
                          </TableCell>
                          <TableCell>{c.consumer_name ?? "—"}</TableCell>
                          <TableCell>{getOtherLabel(c)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                            {c.last_message_content ? `${c.last_message_content}…` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {format(new Date(c.updated_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/messages?conversation=${c.id}`)}
                              className="gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Chat history (read-only)</p>
                                {loadingMessages[c.id] ? (
                                  <div className="flex justify-center py-6">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                  </div>
                                ) : (
                                  <ScrollArea className="h-[280px] w-full rounded-md border p-3">
                                    {(messagesByConv[c.id] || []).length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No messages.</p>
                                    ) : (
                                      <div className="space-y-2 pr-2">
                                        {(messagesByConv[c.id] || []).map((m) => (
                                          <div
                                            key={m.id}
                                            className="flex flex-col gap-0.5 text-sm"
                                          >
                                            <span className="font-medium text-muted-foreground">
                                              {m.sender_name ?? "Unknown"} · {format(new Date(m.created_at), "MMM d, HH:mm")}
                                            </span>
                                            <p className="whitespace-pre-wrap break-words">{m.content || "(attachment)"}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </ScrollArea>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
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
    </div>
  );
}
