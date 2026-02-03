import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Mail, Copy, Check, CheckCheck, Users, UserPlus, Search, MoreHorizontal, Video, Calendar, Image, ExternalLink, Briefcase, FileCheck, Hourglass, ChevronDown, X, Type, Paperclip, Settings, Smile, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { z } from "zod";
import { useProxyEmail } from "@/hooks/useProxyEmail";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageLayout from "@/components/layout/PageLayout";

const STORAGE_STARRED_KEY = "messages_starred";
const STORAGE_HIDDEN_KEY = "messages_hidden";

// SECURITY: Input validation schema
const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters"),
});

interface Conversation {
  id: string;
  gig_id: string | null;
  consumer_id: string;
  digger_id: string | null;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
  gigs: {
    title: string;
  } | null;
  digger_profiles: {
    handle: string;
    profession: string;
  } | null;
  /** For admin conversations: consumer's display name (from profiles) */
  consumer_profile?: { full_name: string | null } | null;
  /** Last message preview (from get_my_conversations) */
  last_message_content?: string | null;
  last_message_sender_id?: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRoles } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [partnerProxyEmail, setPartnerProxyEmail] = useState<string | null>(null);
  const [adminChatOpen, setAdminChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; full_name: string | null }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [startingChatUserId, setStartingChatUserId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const currentUserIdRef = useRef<string | undefined>(undefined);

  const isAdmin = userRoles.includes("admin");

  // Starred and hidden conversation ids (per user, persisted in localStorage)
  const getStorageKey = (suffix: string) =>
    currentUser?.id ? `messages_${suffix}_${currentUser.id}` : null;
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const key = getStorageKey("starred");
      if (!key) return [];
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      const key = getStorageKey("hidden");
      if (!key) return [];
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!currentUser?.id) return;
    const sk = getStorageKey("starred");
    const hk = getStorageKey("hidden");
    if (sk) {
      try {
        const raw = localStorage.getItem(sk);
        setStarredIds(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        setStarredIds([]);
      }
    }
    if (hk) {
      try {
        const raw = localStorage.getItem(hk);
        setHiddenIds(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        setHiddenIds([]);
      }
    }
  }, [currentUser?.id]);

  const toggleStarred = (conversationId: string) => {
    const key = getStorageKey("starred");
    if (!key) return;
    setStarredIds((prev) => {
      const wasStarred = prev.includes(conversationId);
      const next = wasStarred ? prev.filter((id) => id !== conversationId) : [...prev, conversationId];
      localStorage.setItem(key, JSON.stringify(next));
      toast({ title: wasStarred ? "Removed from favorites" : "Added to favorites" });
      return next;
    });
  };

  const hideConversation = (conversationId: string) => {
    const key = getStorageKey("hidden");
    if (!key) return;
    setHiddenIds((prev) => {
      const next = prev.includes(conversationId) ? prev : [...prev, conversationId];
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    if (selectedConversation === conversationId) setSelectedConversation(null);
    toast({ title: "Conversation hidden", description: "You can restore it from filters later." });
  };

  const [showHidden, setShowHidden] = useState(false);

  const unhideConversation = (conversationId: string) => {
    const key = getStorageKey("hidden");
    if (!key) return;
    setHiddenIds((prev) => {
      const next = prev.filter((id) => id !== conversationId);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    toast({ title: "Conversation restored" });
  };

  const filteredConversations = (listSearch.trim()
    ? conversations.filter(
        (c) =>
          getConversationPartner(c).toLowerCase().includes(listSearch.toLowerCase()) ||
          (c?.admin_id ? "support chat" : (c?.gigs?.title || "")).toLowerCase().includes(listSearch.toLowerCase())
      )
    : conversations
  ).filter((c) => showHidden || !hiddenIds.includes(c.id));

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);

  // Get current user's proxy email
  const { proxyEmail: myProxyEmail } = useProxyEmail(currentUser?.id || null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      subscribeToMessages(selectedConversation);
      loadPartnerProxyEmail(selectedConversation);
    }
  }, [selectedConversation]);

  const loadPartnerProxyEmail = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv || !currentUser) return;

    let partnerUserId: string | null = null;

    // Admin support conversation
    if (conv.admin_id) {
      partnerUserId = currentUser.id === conv.admin_id ? conv.consumer_id : conv.admin_id;
    } else {
      // Gig conversation: consumer + digger
      const partnerId = currentUser.id === conv.consumer_id
        ? conv.digger_id
        : conv.consumer_id;
      if (!partnerId) return;
      partnerUserId = conv.consumer_id === currentUser.id && conv.digger_id
        ? (await supabase.from("digger_profiles").select("user_id").eq("id", conv.digger_id).single()).data?.user_id ?? null
        : conv.consumer_id;
    }

    if (!partnerUserId) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-proxy-email", {
        body: { user_id: partnerUserId },
      });
      if (!error && data?.proxy_email) setPartnerProxyEmail(data.proxy_email);
    } catch (err) {
      console.error("Error loading partner proxy email:", err);
    }
  };

  const loadUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setCurrentUser(user);
    } catch (error: any) {
      toast({
        title: "Error loading user",
        description: error.message || "Failed to load user session",
        variant: "destructive",
      });
      navigate("/register");
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.rpc("get_my_conversations");

      if (error) throw error;
      const raw = (data as Array<{
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
        last_message_content: string | null;
        last_message_sender_id: string | null;
      }>) || [];

      const list: Conversation[] = raw.map((c) => ({
        id: c.id,
        gig_id: c.gig_id,
        consumer_id: c.consumer_id,
        digger_id: c.digger_id,
        admin_id: c.admin_id,
        created_at: c.created_at,
        updated_at: c.updated_at,
        gigs: c.gig_title != null ? { title: c.gig_title } : null,
        digger_profiles:
          c.digger_handle != null || c.digger_profession != null
            ? { handle: c.digger_handle ?? "", profession: c.digger_profession ?? "" }
            : null,
        last_message_content: c.last_message_content ?? null,
        last_message_sender_id: c.last_message_sender_id ?? null,
      }));

      // Enrich admin conversations with consumer display names (admins can view profiles)
      if (isAdmin) {
        const adminConvos = list.filter((c) => c.admin_id);
        const consumerIds = [...new Set(adminConvos.map((c) => c.consumer_id))];
        if (consumerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", consumerIds);
          const nameById = new Map((profiles || []).map((p) => [p.id, { full_name: p.full_name }]));
          list.forEach((c) => {
            if (c.admin_id && c.consumer_id) {
              (c as Conversation).consumer_profile = nameById.get(c.consumer_id) ?? null;
            }
          });
        }
      }

      setConversations(list);
    } catch (error: any) {
      toast({
        title: "Error loading conversations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc("get_conversation_messages", {
        _conversation_id: conversationId,
      });

      if (error) throw error;
      setMessages((data as Message[]) || []);

      // Mark other party's messages as read (works for admin and regular users)
      if (currentUser?.id) {
        await supabase.rpc("mark_conversation_messages_read", {
          _conversation_id: conversationId,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (newMsg.sender_id !== currentUserIdRef.current) {
            playNotificationSound();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, read_at: updated.read_at } : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      // SECURITY: Validate message content
      const validated = messageSchema.parse({
        content: newMessage,
      });

      if (!currentUser?.id) {
        toast({
          title: "Error",
          description: "User session not found. Please sign in again.",
          variant: "destructive",
        });
        navigate("/register");
        return;
      }

      const { error } = await supabase.rpc("send_message", {
        _conversation_id: selectedConversation,
        _content: validated.content,
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid message",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error sending message",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const getConversationPartner = (conv: Conversation | undefined) => {
    if (!conv) return "Unknown";
    if (conv.admin_id) {
      if (currentUser?.id === conv.admin_id) {
        return conv.consumer_profile?.full_name?.trim() || "User";
      }
      return "Support";
    }
    if (currentUser?.id === conv.consumer_id) {
      return conv.digger_profiles?.handle || "Unknown Digger";
    }
    return "Client";
  };

  const copyToClipboard = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      toast({
        title: "Email copied",
        description: "Proxy email address copied to clipboard",
      });
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please manually copy the email address",
        variant: "destructive",
      });
    }
  };

  // Admin: search users (profiles) for "Chat with user"
  const runUserSearch = async () => {
    if (!userSearch.trim() || !isAdmin) return;
    setUserSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .or(`full_name.ilike.%${userSearch.trim()}%`)
        .limit(20);
      if (error) throw error;
      setUserSearchResults((data as { id: string; full_name: string | null }[]) || []);
    } catch (e) {
      toast({ title: "Search failed", variant: "destructive" });
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  };

  // Admin: find or create admin conversation and open it
  const startOrOpenAdminChat = async (consumerId: string) => {
    if (!currentUser?.id || !isAdmin) return;
    if (startingChatUserId) return; // prevent double-click
    setStartingChatUserId(consumerId);
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("conversations")
        .select("id")
        .eq("admin_id", currentUser.id)
        .eq("consumer_id", consumerId)
        .maybeSingle();
      if (fetchError) throw fetchError;
      if (existing?.id) {
        setSelectedConversation(existing.id);
        setAdminChatOpen(false);
        setUserSearch("");
        setUserSearchResults([]);
        toast({ title: "Chat opened", description: "Conversation selected." });
        return;
      }
      const { data: conversationId, error } = await supabase.rpc("create_admin_conversation", {
        target_user_id: consumerId,
      });
      if (error) throw error;
      const id = Array.isArray(conversationId) ? conversationId?.[0] : conversationId;
      if (id) {
        await loadConversations();
        setSelectedConversation(id);
        setAdminChatOpen(false);
        setUserSearch("");
        setUserSearchResults([]);
        toast({ title: "Chat started", description: "You can start messaging now." });
      } else {
        throw new Error("No conversation id returned");
      }
    } catch (e: any) {
      toast({
        title: "Could not start chat",
        description: e?.message || e?.error_description || "Please try again",
        variant: "destructive",
      });
    } finally {
      setStartingChatUserId(null);
    }
  };

  const messagesByDate = (() => {
    const map = new Map<string, Message[]>();
    messages.forEach((msg) => {
      const key = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  if (loading) {
    return (
      <PageLayout showFooter={false} maxWidth="full" padded={false}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <p className="text-muted-foreground">Loading conversations...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showFooter={false} maxWidth="full" padded={false}>
      <div className="flex h-[calc(100vh-4rem)] border-t border-border/50">
        {/* Left: Messages list */}
        <div className="w-full sm:w-80 lg:w-96 border-r border-border/50 flex flex-col bg-background shrink-0">
          <div className="p-3 border-b border-border/50 flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold truncate">Messages</h1>
            <div className="flex items-center gap-1 shrink-0">
              {isAdmin && (
              <Dialog open={adminChatOpen} onOpenChange={setAdminChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Chat with user">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Chat with any user</DialogTitle>
                    <DialogDescription>
                      Search by name and start a support conversation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by name..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && runUserSearch()}
                      />
                      <Button type="button" onClick={runUserSearch} disabled={userSearchLoading}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                    <ScrollArea className="h-[240px] rounded-md border p-2">
                      {userSearchResults.length === 0 && !userSearchLoading && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {userSearch.trim() ? "No users found." : "Type a name and search."}
                        </p>
                      )}
                      {userSearchResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          disabled={startingChatUserId !== null}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted disabled:opacity-50 text-left text-sm cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startOrOpenAdminChat(u.id);
                          }}
                        >
                          <Users className="h-4 w-4 shrink-0" />
                          <span className="flex-1 truncate">{u.full_name?.trim() || "Unnamed"}</span>
                          {startingChatUserId === u.id ? (
                            <span className="text-xs text-muted-foreground">Opening…</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">({u.id.slice(0, 8)}…)</span>
                          )}
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            )}
              <Button variant="ghost" size="icon" className="h-8 w-8" title="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="p-2 border-b border-border/50 flex items-center gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="pl-8 h-9 bg-muted/50"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" title="Filter or sort">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowHidden((prev) => !prev)}
                >
                  {showHidden ? "Hide hidden conversations" : "Show hidden conversations"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <ScrollArea className="flex-1">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {listSearch.trim() ? "No matches." : "No conversations yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filteredConversations.map((conv) => {
                  const partnerName = getConversationPartner(conv);
                  const roleOrTitle = conv?.admin_id ? "Support chat" : (conv?.gigs?.title || conv?.digger_profiles?.profession || "General inquiry");
                  const lastFromMe = conv?.last_message_sender_id === currentUser?.id;
                  const lastSnippet = conv?.last_message_content
                    ? (lastFromMe ? "You: " : `${partnerName}: `) + conv.last_message_content
                    : null;
                  const isStarred = starredIds.includes(conv.id);
                  return (
                    <div
                      key={conv.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedConversation(conv.id)}
                      onKeyDown={(e) => e.key === "Enter" && setSelectedConversation(conv.id)}
                      className={`group w-full flex items-start gap-3 p-3 text-left transition-colors cursor-pointer hover:bg-muted/50 ${
                        selectedConversation === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-11 w-11 ring-1 ring-border/50">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {partnerName[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground/50"
                          title="Offline"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground truncate shrink min-w-0">
                            {partnerName}
                          </p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(conv.updated_at), "M/d/yy")}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStarred(conv.id);
                              }}
                              title={isStarred ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star
                                className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-500" : ""}`}
                              />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                  title="More options"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStarred(conv.id);
                                  }}
                                >
                                  {isStarred ? "Remove from Favorites" : "Add to Favorites"}
                                </DropdownMenuItem>
                                {hiddenIds.includes(conv.id) ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unhideConversation(conv.id);
                                    }}
                                  >
                                    Unhide
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      hideConversation(conv.id);
                                    }}
                                  >
                                    Hide
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {roleOrTitle}
                        </p>
                        {lastSnippet && (
                          <p className="text-xs text-muted-foreground/90 truncate mt-0.5">
                            {lastSnippet.length > 42 ? `${lastSnippet.slice(0, 42)}...` : lastSnippet}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Center: Chat */}
        <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
          <div className="border-border/50 flex flex-col flex-1 min-h-0">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border/50 bg-background">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getConversationPartner(
                          conversations.find((c) => c.id === selectedConversation)
                        )[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-foreground truncate">
                        {getConversationPartner(
                          conversations.find((c) => c.id === selectedConversation)
                        )}
                        {(() => {
                          const sel = conversations.find((c) => c.id === selectedConversation);
                          return sel?.admin_id ? "" : sel?.gigs?.title ? `, ${sel.gigs.title}` : "";
                        })()}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {(() => {
                          const sel = conversations.find((c) => c.id === selectedConversation);
                          return sel?.admin_id
                            ? "Support chat"
                            : (sel?.gigs?.title || sel?.digger_profiles?.profession || "General inquiry");
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Video className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Video call</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Calendar className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Schedule</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Image className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Attach image</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in new window</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Messages with date separators */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messagesByDate.map(([dateKey, dayMessages]) => (
                        <div key={dateKey} className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground text-center py-1">
                            {format(new Date(dateKey), "EEEE, MMM d")}
                          </p>
                          {dayMessages.map((msg) => {
                            const isOwn = msg.sender_id === currentUser?.id;
                            const timeStr = format(new Date(msg.created_at), "h:mm a");
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                    isOwn
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-background border border-border/50 rounded-bl-md"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                  <div
                                    className={`flex items-center justify-end gap-1 mt-1.5 ${
                                      isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="text-xs">{timeStr}</span>
                                    {isOwn && (
                                      <span className="shrink-0">
                                        {msg.read_at ? (
                                          <CheckCheck className="h-3.5 w-3.5" aria-label="Read" />
                                        ) : (
                                          <Check className="h-3.5 w-3.5" aria-label="Sent" />
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Message input */}
                <div className="shrink-0 p-3 border-t border-border/50 bg-background">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Format">
                        <Type className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Attach">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Emoji">
                        <Smile className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Send a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      maxLength={5000}
                      className="flex-1 bg-muted/50"
                    />
                    <Button
                      onClick={sendMessage}
                      size="icon"
                      disabled={!newMessage.trim()}
                      className="shrink-0 h-8 w-8"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-sm">
                  <MessageSquare className="h-14 w-14 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold text-foreground mb-1">Select a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose from the list to start messaging.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Contact / Activity */}
        {selectedConversation && (
          <div className="hidden xl:flex w-80 shrink-0 flex-col border-l border-border/50 bg-background overflow-hidden">
            <div className="p-4 space-y-4 flex-1 overflow-auto">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border/50">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getConversationPartner(
                        conversations.find((c) => c.id === selectedConversation)
                      )[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {getConversationPartner(
                        conversations.find((c) => c.id === selectedConversation)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <FileCheck className="h-3 w-3 shrink-0" />
                      {(() => {
                        const sel = conversations.find((c) => c.id === selectedConversation);
                        return sel?.admin_id ? "Support" : (sel?.gigs?.title || "Conversation");
                      })()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Close panel">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} local
              </div>
              {(() => {
                const sel = conversations.find((c) => c.id === selectedConversation);
                const gigId = sel?.gig_id;
                return gigId ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => navigate(`/gig/${gigId}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View proposal / gig
                  </Button>
                ) : null;
              })()}
              <div className="border-t border-border/50 pt-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left font-medium text-sm py-1"
                >
                  Activity timeline
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="mt-3 space-y-0 relative pl-5 border-l-2 border-border/50 ml-0.5">
                  <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary -translate-x-[5px]" />
                  <div className="pb-3 flex items-start gap-2">
                    <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Conversation started</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation &&
                          format(
                            new Date(
                              conversations.find((c) => c.id === selectedConversation)?.created_at ?? 0
                            ),
                            "MMM d"
                          )}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const sel = conversations.find((c) => c.id === selectedConversation);
                    if (!sel?.gig_id) return null;
                    return (
                      <>
                        <div className="absolute left-0 top-9 w-2 h-2 rounded-full bg-muted-foreground/50 -translate-x-[5px]" />
                        <div className="pb-3 flex items-start gap-2">
                          <Hourglass className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Gig / offer</p>
                            <p className="text-xs text-muted-foreground">Linked to gig</p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              {(partnerProxyEmail || myProxyEmail) && (
                <div className="pt-3 border-t border-border/50 space-y-2">
                  {partnerProxyEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Contact email</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="text-xs truncate block flex-1">{partnerProxyEmail}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyToClipboard(partnerProxyEmail)}
                          >
                            {copiedEmail === partnerProxyEmail ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {myProxyEmail && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your proxy</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <code className="text-xs truncate block flex-1">{myProxyEmail}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyToClipboard(myProxyEmail)}
                          >
                            {copiedEmail === myProxyEmail ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
