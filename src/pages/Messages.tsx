import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageSquare, Mail, Copy, Check, CheckCheck, Users, UserPlus, Search, 
  MoreHorizontal, ExternalLink, Briefcase, FileCheck, Hourglass, 
  ChevronDown, X, Star, Pin, Trash2, EyeOff, BellOff, Ban 
} from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { useProxyEmail } from "@/hooks/useProxyEmail";
import { useAuth } from "@/contexts/AuthContext";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { useUserPresence } from "@/hooks/useUserPresence";
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
  DropdownMenuSeparator,
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
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import PageLayout from "@/components/layout/PageLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { 
  MessageInput, 
  MessageBubble, 
  ChatHeader, 
  DateSeparator,
  EmptyConversation,
  TypingIndicator,
} from "@/components/messages";

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
    profile_image_url?: string | null;
  } | null;
  consumer_profile?: { full_name: string | null } | null;
  /** Last message preview (from get_my_conversations) */
  last_message_content?: string | null;
  last_message_sender_id?: string | null;
  /** Partner avatar URL (digger profile image or null for consumers) */
  partner_avatar_url?: string | null;
  /** Number of messages in this conversation not read by current user (from get_my_conversations) */
  unread_count?: number;
  /** User has muted this conversation */
  muted?: boolean;
  /** Current user has blocked the partner in this conversation */
  is_blocked?: boolean;
  /** Partner's user id (for unblock) */
  partner_user_id?: string | null;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  attachments?: { name: string; path: string; type: string }[];
}

interface RawConversation {
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
}

export default function Messages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRoles } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<number | null>(null);
  const currentUserIdRef = useRef<string | undefined>(undefined);
  const selectedConversationRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingSendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [partnerTypingUntil, setPartnerTypingUntil] = useState<number | null>(null);

  const isAdmin = userRoles.includes("admin");
  const { onlineDiggers } = useDiggerPresence();
  const { onlineUserIds } = useUserPresence();

  const refreshRecentConversations = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("recent-conversations-refresh"));
    }
  };

  // Starred and hidden conversation ids (per user, persisted in localStorage)
  const getStorageKey = (suffix: string) =>
    currentUser?.id ? `messages_${suffix}_${currentUser.id}` : null;
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const key = currentUser?.id ? `messages_starred_${currentUser.id}` : null;
      if (!key) return [];
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [hiddenIds, setHiddenIds] = useState<string[]>(() => {
    try {
      const key = currentUser?.id ? `messages_hidden_${currentUser.id}` : null;
      if (!key) return [];
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const key = currentUser?.id ? `messages_pinned_${currentUser.id}` : null;
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
    const pk = getStorageKey("pinned");
    if (pk) {
      try {
        const raw = localStorage.getItem(pk);
        setPinnedIds(raw ? (JSON.parse(raw) as string[]) : []);
      } catch {
        setPinnedIds([]);
      }
    }
  }, [currentUser?.id]);

  // Lock body scroll while on Messages page
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

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
    refreshRecentConversations();
    toast({ title: "Conversation hidden", description: "You can restore it from filters later." });
  };

  const togglePinned = (conversationId: string) => {
    const key = getStorageKey("pinned");
    if (!key) return;
    setPinnedIds((prev) => {
      const wasPinned = prev.includes(conversationId);
      const next = wasPinned ? prev.filter((id) => id !== conversationId) : [...prev, conversationId];
      localStorage.setItem(key, JSON.stringify(next));
      toast({ title: wasPinned ? "Unpinned" : "Pinned to top" });
      return next;
    });
  };

  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteConversation = async () => {
    if (!deleteConversationId) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", deleteConversationId);
      if (error) throw error;
      if (selectedConversation === deleteConversationId) setSelectedConversation(null);
      const sk = getStorageKey("starred");
      const pk = getStorageKey("pinned");
      const hk = getStorageKey("hidden");
      if (sk) {
        setStarredIds((prev) => {
          const next = prev.filter((id) => id !== deleteConversationId);
          localStorage.setItem(sk, JSON.stringify(next));
          return next;
        });
      }
      if (pk) {
        setPinnedIds((prev) => {
          const next = prev.filter((id) => id !== deleteConversationId);
          localStorage.setItem(pk, JSON.stringify(next));
          return next;
        });
      }
      if (hk) {
        setHiddenIds((prev) => {
          const next = prev.filter((id) => id !== deleteConversationId);
          localStorage.setItem(hk, JSON.stringify(next));
          return next;
        });
      }
      await loadConversations();
      refreshRecentConversations();
      toast({ title: "Chat deleted" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not delete chat",
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConversationId(null);
    }
  };

  const [showHidden, setShowHidden] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "favorites">("all");

  const unhideConversation = (conversationId: string) => {
    const key = getStorageKey("hidden");
    if (!key) return;
    setHiddenIds((prev) => {
      const next = prev.filter((id) => id !== conversationId);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
    refreshRecentConversations();
    toast({ title: "Conversation restored" });
  };

  const handleMarkAsUnread = async (conversationId: string) => {
    try {
      await supabase.rpc("mark_conversation_messages_unread" as any, {
        _conversation_id: conversationId,
      });
      await loadConversations();
      toast({ title: "Marked as unread" });
    } catch (e: any) {
      toast({ title: "Failed to mark as unread", description: e?.message, variant: "destructive" });
    }
  };

  const handleToggleMute = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.rpc("toggle_conversation_mute" as any, {
        _conversation_id: conversationId,
      });
      if (error) throw error;
      await loadConversations();
      toast({ title: data === true ? "Conversation muted" : "Conversation unmuted" });
    } catch (e: any) {
      toast({ title: "Failed to update mute", description: e?.message, variant: "destructive" });
    }
  };

  const handleBlock = async (conv: Conversation) => {
    try {
      if (conv.is_blocked && conv.partner_user_id) {
        await supabase.rpc("unblock_user" as any, { _blocked_user_id: conv.partner_user_id });
        await loadConversations();
        toast({ title: "User unblocked" });
      } else {
        await supabase.rpc("block_conversation_partner" as any, {
          _conversation_id: conv.id,
        });
        await loadConversations();
        toast({ title: "User blocked" });
      }
    } catch (e: any) {
      toast({ title: "Failed to update block", description: e?.message, variant: "destructive" });
    }
  };

  // On mobile, show conversation list when no conversation selected
  const showConversationList = !isMobile || !selectedConversation;
  const showChatArea = !isMobile || selectedConversation;

  const filteredConversations = (listSearch.trim()
    ? conversations.filter(
        (c) =>
          getConversationPartner(c).toLowerCase().includes(listSearch.toLowerCase()) ||
          (c?.admin_id ? "support chat" : (c?.gigs?.title || "")).toLowerCase().includes(listSearch.toLowerCase())
      )
    : conversations
  )
    .filter((c) => showHidden || !hiddenIds.includes(c.id))
    .filter((c) => listFilter === "all" || starredIds.includes(c.id))
    .sort((a, b) => {
      const aPin = pinnedIds.includes(a.id);
      const bPin = pinnedIds.includes(b.id);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;
      return 0;
    });

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id;
  }, [currentUser?.id]);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const { proxyEmail: myProxyEmail } = useProxyEmail(currentUser?.id || null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, isAdmin]);

  // Client (gigger) opened Messages with ?gig=&digger= from proposal Chat: find or create conversation
  useEffect(() => {
    const gigId = searchParams.get("gig");
    const diggerId = searchParams.get("digger");
    if (!currentUser?.id || !gigId || !diggerId) return;

    let cancelled = false;
    (async () => {
      try {
        const { data: gig, error: gigError } = await supabase
          .from("gigs")
          .select("id, consumer_id")
          .eq("id", gigId)
          .single();

        if (gigError || !gig) {
          toast({ title: "Project not found", variant: "destructive" });
          setSearchParams((p) => {
            const next = new URLSearchParams(p);
            next.delete("gig");
            next.delete("digger");
            return next;
          });
          return;
        }
        if (gig.consumer_id !== currentUser.id) {
          toast({ title: "You can only start chats for your own projects", variant: "destructive" });
          setSearchParams((p) => {
            const next = new URLSearchParams(p);
            next.delete("gig");
            next.delete("digger");
            return next;
          });
          return;
        }

        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("gig_id", gigId)
          .eq("digger_id", diggerId)
          .eq("consumer_id", currentUser.id)
          .is("admin_id", null)
          .maybeSingle();

        if (cancelled) return;
        if (existing?.id) {
          setSelectedConversation(existing.id);
          setSearchParams({ conversation: existing.id });
          await loadConversations();
          return;
        }

        const { data: newConv, error: insertError } = await supabase
          .from("conversations")
          .insert({
            gig_id: gigId,
            digger_id: diggerId,
            consumer_id: currentUser.id,
          } as any)
          .select("id")
          .single();

        if (cancelled) return;
        if (insertError) throw insertError;
        if (newConv?.id) {
          setSelectedConversation(newConv.id);
          setSearchParams({ conversation: newConv.id });
          await loadConversations();
        }
      } catch (e: any) {
        if (!cancelled) {
          toast({
            title: "Could not start conversation",
            description: e?.message ?? "Something went wrong",
            variant: "destructive",
          });
          setSearchParams((p) => {
            const next = new URLSearchParams(p);
            next.delete("gig");
            next.delete("digger");
            return next;
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.id, searchParams.get("gig"), searchParams.get("digger")]);

  // Sync selected conversation from URL (e.g. after clicking a message notification)
  useEffect(() => {
    const q = searchParams.get("conversation");
    if (q && q !== selectedConversation) setSelectedConversation(q);
  }, [searchParams]);

  // Select the most recently chatted conversation by default when opening the page (no URL param)
  useEffect(() => {
    if (
      conversations.length > 0 &&
      !selectedConversation &&
      !searchParams.get("conversation")
    ) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    if (!selectedConversation) return;
    const convId = selectedConversation;
    loadMessages(convId);
    loadPartnerProxyEmail(convId);
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const unsub = await subscribeToMessages(convId);
      if (cancelled) {
        unsub();
        return;
      }
      cleanup = unsub;
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [selectedConversation]);

  // Subscribe to new messages in ANY conversation so we can alert when user is viewing another chat
  useEffect(() => {
    if (!currentUser?.id) return;
    let mounted = true;
    const channel = supabase.channel("messages:all");
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) await supabase.realtime.setAuth(session.access_token);
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            if (!mounted) return;
            const msg = payload.new as { id: string; conversation_id: string; sender_id: string; content?: string };
            if (msg.sender_id === currentUserIdRef.current) return;
            const selectedId = selectedConversationRef.current;
            const convs = conversationsRef.current;
            const conv = convs.find((c) => c.id === msg.conversation_id);
            const getPartnerName = (c: Conversation) => {
              if (!c) return "Someone";
              if (c.admin_id) {
                return currentUserIdRef.current === c.admin_id
                  ? (c.consumer_profile?.full_name?.trim() || "User")
                  : "Support";
              }
              return currentUserIdRef.current === c.consumer_id
                ? (c.digger_profiles?.handle || "Someone")
                : "Client";
            };
            const partnerName = getPartnerName(conv);
            if (msg.conversation_id !== selectedId) {
              toast({
                title: "New message",
                description: `${partnerName}: ${(msg.content ?? "").slice(0, 80)}${(msg.content?.length ?? 0) > 80 ? "…" : ""}`,
              });
              if (typeof window !== "undefined" && "Notification" in window && document.hidden) {
                try {
                  if (Notification.permission === "granted") {
                    new Notification(`Message from ${partnerName}`, {
                      body: (msg.content ?? "").slice(0, 100),
                      tag: `msg-${msg.conversation_id}`,
                    });
                  }
                } catch {
                  // ignore
                }
              }
              loadConversations();
            }
          }
        )
        .subscribe();
    };
    setup();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Debounced broadcast "typing" when user types
  useEffect(() => {
    if (!selectedConversation || !currentUser?.id || newMessage.trim() === "") return;
    if (typingSendTimeoutRef.current) clearTimeout(typingSendTimeoutRef.current);
    typingSendTimeoutRef.current = setTimeout(() => {
      const ch = messagesChannelRef.current;
      if (ch) {
        ch.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: currentUser.id },
        });
      }
      typingSendTimeoutRef.current = null;
    }, 300);
    return () => {
      if (typingSendTimeoutRef.current) {
        clearTimeout(typingSendTimeoutRef.current);
        typingSendTimeoutRef.current = null;
      }
    };
  }, [newMessage, selectedConversation, currentUser?.id]);

  const loadPartnerProxyEmail = async (conversationId: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv || !currentUser) return;

    let partnerUserId: string | null = null;

    if (conv.admin_id) {
      partnerUserId = currentUser.id === conv.admin_id ? conv.consumer_id : conv.admin_id;
    } else {
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
      const data = await invokeEdgeFunction<{ proxy_email?: string }>(supabase, "get-proxy-email", {
        body: { user_id: partnerUserId },
      });
      if (data?.proxy_email) setPartnerProxyEmail(data.proxy_email);
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
      const { data, error } = await supabase.rpc("get_my_conversations" as any);

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
        digger_profile_image_url?: string | null;
        consumer_avatar_url?: string | null;
        consumer_full_name?: string | null;
        admin_avatar_url?: string | null;
        last_message_content?: string | null;
        last_message_sender_id?: string | null;
        unread_count?: number;
        muted?: boolean;
        is_blocked?: boolean;
        partner_user_id?: string | null;
      }>) || [];

      const list: Conversation[] = raw.map((c) => {
        const partnerAvatarUrl = c.admin_id
          ? (currentUser?.id === c.admin_id ? (c.consumer_avatar_url ?? null) : (c.admin_avatar_url ?? null))
          : (currentUser?.id === c.consumer_id ? (c.digger_profile_image_url ?? null) : (c.consumer_avatar_url ?? null));
        return {
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
              ? {
                  handle: c.digger_handle ?? "",
                  profession: c.digger_profession ?? "",
                  profile_image_url: c.digger_profile_image_url ?? null,
                }
              : null,
          consumer_profile: c.consumer_id != null ? { full_name: c.consumer_full_name ?? null } : null,
          last_message_content: c.last_message_content ?? null,
          last_message_sender_id: c.last_message_sender_id ?? null,
          partner_avatar_url: partnerAvatarUrl,
          unread_count: typeof c.unread_count === "number" ? c.unread_count : 0,
          muted: c.muted ?? false,
          is_blocked: c.is_blocked ?? false,
          partner_user_id: c.partner_user_id ?? null,
        };
      });

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
      const { data, error } = await supabase.rpc("get_conversation_messages" as any, {
        _conversation_id: conversationId,
      });

      if (error) throw error;
      setMessages((data as unknown as Message[]) || []);

      if (currentUser?.id) {
        await supabase.rpc("mark_conversation_messages_read" as any, {
          _conversation_id: conversationId,
        });
        loadConversations(); // refresh list so unread badge and bold state update
      }
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const subscribeToMessages = async (
    conversationId: string
  ): Promise<() => void> => {
    const uid = currentUserIdRef.current;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setPartnerTypingUntil(null);
    messagesChannelRef.current = null;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      await supabase.realtime.setAuth(session.access_token);
    }

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
      .on(
        "broadcast",
        { event: "typing" },
        (payload) => {
          const userId = (payload.payload as { user_id?: string })?.user_id;
          if (userId && userId !== uid) {
            setPartnerTypingUntil(Date.now() + 3000);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setPartnerTypingUntil(null);
              typingTimeoutRef.current = null;
            }, 3000);
          }
        }
      )
      .subscribe();

    messagesChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setPartnerTypingUntil(null);
      messagesChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
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

      const { data: messageId, error } = await supabase.rpc("send_message" as any, {
        _conversation_id: selectedConversation,
        _content: validated.content,
        _attachments: [],
      });

      if (error) throw error;
      setNewMessage("");
      await loadMessages(selectedConversation);
      refreshRecentConversations();
      if (messageId) {
        supabase.functions
          .invoke("enqueue-message-notification", {
            body: { conversation_id: selectedConversation, message_id: messageId },
          })
          .catch(() => {});
      }
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

  const handleEditMessage = (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      setEditingMessageId(messageId);
      setEditingMessageContent(msg.content || "");
    }
  };

  const updateMessage = async () => {
    if (!editingMessageId || !selectedConversation || !currentUser?.id) return;
    try {
      const validated = messageSchema.parse({ content: editingMessageContent });
      const { error } = await supabase
        .from("messages")
        .update({ content: validated.content })
        .eq("id", editingMessageId)
        .eq("sender_id", currentUser.id);
      if (error) throw error;
      setEditingMessageId(null);
      setEditingMessageContent("");
      await loadMessages(selectedConversation);
      toast({ title: "Message updated" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid message",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error updating message",
          description: error?.message ?? "Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setDeleteMessageId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageId || !selectedConversation || !currentUser?.id) return;
    setIsDeletingMessage(true);
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", deleteMessageId)
        .eq("sender_id", currentUser.id);
      if (error) throw error;
      setDeleteMessageId(null);
      await loadMessages(selectedConversation);
      toast({ title: "Message deleted" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Could not delete message",
        description: err?.message ?? "Please try again.",
      });
    } finally {
      setIsDeletingMessage(false);
      setDeleteMessageId(null);
    }
  };

  const handleCopyMessage = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(
      () => toast({ title: "Copied to clipboard" }),
      () => toast({ title: "Copy failed", variant: "destructive" })
    );
  };

  const sendMessageWithAttachments = async (files: File[], content: string) => {
    if (!selectedConversation || !currentUser?.id) {
      toast({
        title: "Error",
        description: "Please sign in and select a conversation.",
        variant: "destructive",
      });
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "https://njpjxasfesdapxukvyth.supabase.co";
    const { data: { session } } = await supabase.auth.getSession();
    const bucket = "message-attachments";
    const attachments: { name: string; path: string; type: string }[] = [];
    try {
      setAttachmentUploadProgress(0);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
        const path = `${selectedConversation}/${currentUser.id}/${crypto.randomUUID()}_${safeName}`;
        await uploadFileWithProgress({
          url: supabaseUrl,
          accessToken: session?.access_token,
          anonKey: supabaseAnonKey,
          bucket,
          path,
          file,
          onProgress: (percent) => {
            const overall = (i + percent / 100) / files.length * 100;
            setAttachmentUploadProgress(Math.round(overall));
          },
        });
        attachments.push({ name: file.name, path, type: file.type || "application/octet-stream" });
      }
      setAttachmentUploadProgress(100);
      const { data: messageId, error } = await supabase.rpc("send_message" as any, {
        _conversation_id: selectedConversation,
        _content: content.trim(),
        _attachments: attachments,
      });
      if (error) throw error;
      setNewMessage("");
      await loadMessages(selectedConversation);
      refreshRecentConversations();
      if (messageId) {
        supabase.functions
          .invoke("enqueue-message-notification", {
            body: { conversation_id: selectedConversation, message_id: messageId },
          })
          .catch(() => {});
      }
    } catch (error: any) {
      toast({
        title: "Error sending attachments",
        description: error.message ?? "Upload or send failed.",
        variant: "destructive",
      });
    } finally {
      setAttachmentUploadProgress(null);
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
    return conv.consumer_profile?.full_name?.trim() || "Gigger";
  };

  const getConversationSubtitle = (conv: Conversation | undefined) => {
    if (!conv) return "General inquiry";
    if (conv.admin_id) return "Support chat";
    return conv.gigs?.title || "General inquiry";
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

  const startOrOpenAdminChat = async (consumerId: string) => {
    if (!currentUser?.id || !isAdmin) return;
    if (startingChatUserId) return;
    setStartingChatUserId(consumerId);
    try {
      // Check for existing conversation - cast client to avoid deep type instantiation
      const client = supabase as any;
      const existingResult = await client
        .from("conversations")
        .select("id")
        .eq("admin_id", currentUser.id)
        .eq("consumer_id", consumerId)
        .maybeSingle() as { data: { id: string } | null; error: Error | null };
      if (existingResult.error) throw existingResult.error;
      const existing = existingResult.data;
      if (existing?.id) {
        setSelectedConversation(existing.id);
        setAdminChatOpen(false);
        setUserSearch("");
        setUserSearchResults([]);
        refreshRecentConversations();
        toast({ title: "Chat opened", description: "Conversation selected." });
        return;
      }
      const { data: conversationId, error } = await supabase.rpc("create_admin_conversation" as any, {
        target_user_id: consumerId,
      });
      if (error) throw error;
      const id = Array.isArray(conversationId) ? conversationId?.[0] : (conversationId as unknown as string);
      if (id) {
        await loadConversations();
        refreshRecentConversations();
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

  const handleBackToList = () => {
    setSelectedConversation(null);
    setShowInfoPanel(false);
  };

  // Group messages by date
  const messagesByDate = (() => {
    const map = new Map<string, Message[]>();
    messages.forEach((msg) => {
      const key = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  const selectedConv = conversations.find((c) => c.id === selectedConversation);
  const partnerName = getConversationPartner(selectedConv);
  const partnerProfileUrl = (() => {
    if (!selectedConv || !currentUser?.id) return null;
    if (selectedConv.admin_id) {
      if (currentUser.id === selectedConv.admin_id) {
        return selectedConv.consumer_id ? `/profile/${selectedConv.consumer_id}` : null;
      }
      return null;
    }
    if (currentUser.id === selectedConv.consumer_id) {
      const handle = selectedConv.digger_profiles?.handle?.replace(/^@/, "").trim().toLowerCase();
      if (handle) return `/digger/${handle}`;
      return selectedConv.digger_id ? `/digger/${selectedConv.digger_id}` : null;
    }
    return selectedConv.consumer_id ? `/profile/${selectedConv.consumer_id}` : null;
  })();
  const projectTitle = selectedConv?.gigs?.title || null;
  const projectUrl = selectedConv?.gig_id ? `/gig/${selectedConv.gig_id}` : null;

  /** Partner is online: use user presence for support chat or consumer; digger presence for digger. Real-time via useUserPresence / useDiggerPresence. */
  const getPartnerIsOnline = (conv: Conversation | undefined) => {
    if (!conv || !currentUser?.id) return false;
    if (conv.admin_id) {
      const partnerUserId = currentUser.id === conv.admin_id ? conv.consumer_id : conv.admin_id;
      return partnerUserId != null && onlineUserIds.has(String(partnerUserId));
    }
    if (currentUser.id === conv.consumer_id)
      return !!(conv.digger_id && onlineDiggers.has(String(conv.digger_id)));
    return conv.consumer_id != null && onlineUserIds.has(String(conv.consumer_id));
  };

  /** Current user appears online when viewing Messages (they are tracked by PresenceTracker in App). */
  const iAmOnline = true;

  if (loading) {
    return (
      <PageLayout
        showFooter={false}
        maxWidth="full"
        padded={false}
        wrapperClassName="h-[calc(100vh-var(--header-height))] flex flex-col"
        className="flex flex-1 min-h-0 pt-[var(--header-height)]"
      >
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner label="Loading conversations..." />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      showFooter={false}
      maxWidth="full"
      padded={false}
      wrapperClassName="h-[calc(100vh-var(--header-height))] overflow-hidden flex flex-col"
      className="flex flex-col flex-1 min-h-0 pt-[var(--header-height)]"
    >
      <div className="flex flex-1 min-h-0 min-w-0 border-t border-border/30 overflow-hidden">
        {isMobile ? (
          <>
            {showConversationList && (
              <div className="w-full border-r border-border/30 flex flex-col min-h-0 bg-background shrink-0">
            {/* Header - Chats style */}
            <div className="shrink-0 p-4 pb-3 border-b border-border/40 bg-background">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Chats</h1>
                <div className="flex items-center gap-1">
                  {isAdmin && (
                    <Dialog open={adminChatOpen} onOpenChange={setAdminChatOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-muted-foreground hover:text-foreground" 
                          title="Chat with user"
                        >
                          <UserPlus className="h-5 w-5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
                        <DialogHeader>
                          <DialogTitle>Start a new conversation</DialogTitle>
                          <DialogDescription>
                            Search by name to start a support conversation.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Search by name..."
                              value={userSearch}
                              onChange={(e) => setUserSearch(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && runUserSearch()}
                              className="h-10"
                            />
                            <Button type="button" onClick={runUserSearch} disabled={userSearchLoading}>
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                          <ScrollArea className="h-[240px] rounded-lg border border-border/50 bg-muted/30">
                            {userSearchResults.length === 0 && !userSearchLoading && (
                              <p className="text-sm text-muted-foreground text-center py-8">
                                {userSearch.trim() ? "No users found." : "Type a name and search."}
                              </p>
                            )}
                            <div className="p-2 space-y-1">
                              {userSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  type="button"
                                  disabled={startingChatUserId !== null}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startOrOpenAdminChat(u.id);
                                  }}
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                      {(u.full_name?.[0] || "?").toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="flex-1 truncate font-medium">{u.full_name?.trim() || "Unnamed"}</span>
                                  {startingChatUserId === u.id && (
                                    <span className="text-xs text-muted-foreground">Opening…</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-foreground" 
                    title="More options"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Search - rounded, prominent */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search conversations"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-muted/40 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              {/* Filter pills: All, Favorites */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={listFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className={`rounded-full h-8 px-3 text-sm font-medium ${
                    listFilter === "all"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setListFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={listFilter === "favorites" ? "secondary" : "ghost"}
                  size="sm"
                  className={`rounded-full h-8 px-3 text-sm font-medium ${
                    listFilter === "favorites"
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setListFilter("favorites")}
                >
                  Favorites
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="More filters"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowHidden((prev) => !prev)}>
                      {showHidden ? "Hide hidden conversations" : "Show hidden conversations"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Conversation list - scrollable, with rounded selected highlight */}
            <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {listSearch.trim() ? "No matches." : "No conversations yet."}
                    </p>
                  </div>
                ) : (
                  <div className="px-2 py-1 space-y-0.5">
                    {filteredConversations.map((conv) => {
                      const partnerName = getConversationPartner(conv);
                      const partnerProfileUrl = (() => {
                        if (!currentUser?.id) return null;
                        if (conv.admin_id) {
                          if (currentUser.id === conv.admin_id) {
                            return conv.consumer_id ? `/profile/${conv.consumer_id}` : null;
                          }
                          return null;
                        }
                        if (currentUser.id === conv.consumer_id) {
                          const handle = conv.digger_profiles?.handle?.replace(/^@/, "").trim().toLowerCase();
                          if (handle) return `/digger/${handle}`;
                          return conv.digger_id ? `/digger/${conv.digger_id}` : null;
                        }
                        return conv.consumer_id ? `/profile/${conv.consumer_id}` : null;
                      })();
                      const projectUrl = conv?.gig_id ? `/gig/${conv.gig_id}` : null;
                      const rawRoleOrTitle = conv?.admin_id ? "Support chat" : (conv?.gigs?.title || conv?.digger_profiles?.profession || "General inquiry");
                      const roleOrTitle = rawRoleOrTitle.length > 35 ? `${rawRoleOrTitle.slice(0, 35)}…` : rawRoleOrTitle;
                      const lastFromMe = conv?.last_message_sender_id === currentUser?.id;
                      const lastSnippet = conv?.last_message_content
                        ? (lastFromMe ? "You: " : `${partnerName}: `) + conv.last_message_content
                        : null;
                      const isStarred = starredIds.includes(conv.id);
                      const isPinned = pinnedIds.includes(conv.id);
                      const unreadCount = conv.unread_count ?? 0;
                      const hasUnread = unreadCount > 0;
                      return (
                        <div
                          key={conv.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedConversation(conv.id)}
                          onKeyDown={(e) => e.key === "Enter" && setSelectedConversation(conv.id)}
                          className={cn(
                            "group w-full flex items-start gap-3 p-3 text-left transition-colors cursor-pointer rounded-xl",
                            "hover:bg-muted/60",
                            selectedConversation === conv.id
                              ? "bg-muted shadow-sm ring-1 ring-border/50"
                              : "bg-transparent"
                          )}
                        >
                          <div className="relative shrink-0">
                            <Avatar className="h-11 w-11 ring-1 ring-border/50">
                              {conv.partner_avatar_url && (
                                <AvatarImage src={conv.partner_avatar_url} alt="" className="object-cover" />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {partnerName[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background",
                                getPartnerIsOnline(conv) ? "bg-success" : "bg-muted-foreground/50"
                              )}
                              title={getPartnerIsOnline(conv) ? "Online" : "Offline"}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              {partnerProfileUrl ? (
                                <button
                                  type="button"
                                  className={cn(
                                    "truncate shrink min-w-0 text-foreground text-left hover:underline",
                                    hasUnread ? "font-semibold" : "font-medium"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(partnerProfileUrl);
                                  }}
                                >
                                  {partnerName}
                                </button>
                              ) : (
                                <p className={cn(
                                  "truncate shrink min-w-0 text-foreground",
                                  hasUnread ? "font-semibold" : "font-medium"
                                )}>
                                  {partnerName}
                                </p>
                              )}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(conv.updated_at), "M/d/yy")}
                                </span>
                                {hasUnread && (
                                  <span
                                    className="h-5 min-w-[1.25rem] px-1 rounded-md bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center shrink-0"
                                    title={`${unreadCount} unread`}
                                  >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                  </span>
                                )}
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={`h-7 w-7 transition-opacity ${isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePinned(conv.id);
                                  }}
                                  title={isPinned ? "Unpin" : "Pin to top"}
                                >
                                  <Pin
                                    className={`h-4 w-4 ${isPinned ? "fill-muted-foreground text-muted-foreground" : ""}`}
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
                                      window.open(`${window.location.origin}/messages?conversation=${conv.id}`, "_blank");
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Open in new window
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsUnread(conv.id);
                                    }}
                                  >
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Mark as unread
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePinned(conv.id);
                                    }}
                                  >
                                    <Pin className="h-4 w-4 mr-2" />
                                    {isPinned ? "Unpin" : "Pin"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleMute(conv.id);
                                    }}
                                  >
                                    <BellOff className="h-4 w-4 mr-2" />
                                    {conv.muted ? "Unmute" : "Mute"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBlock(conv);
                                    }}
                                  >
                                    <Ban className="h-4 w-4 mr-2" />
                                    {conv.is_blocked ? "Unblock" : "Block"}
                                  </DropdownMenuItem>
                                  {hiddenIds.includes(conv.id) ? (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        unhideConversation(conv.id);
                                      }}
                                    >
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Unhide
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        hideConversation(conv.id);
                                      }}
                                    >
                                      <EyeOff className="h-4 w-4 mr-2" />
                                      Hide
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConversationId(conv.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            {projectUrl ? (
                              <button
                                type="button"
                                className="text-xs text-muted-foreground truncate mt-0.5 min-w-0 hover:underline text-left"
                                title={rawRoleOrTitle}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(projectUrl);
                                }}
                              >
                                {roleOrTitle}
                              </button>
                            ) : (
                              <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0" title={rawRoleOrTitle}>
                                {roleOrTitle}
                              </p>
                            )}
                            {lastSnippet && (
                              <p className={cn(
                                "text-xs truncate mt-0.5 min-w-0",
                                hasUnread ? "font-semibold text-foreground/90" : "text-muted-foreground/90"
                              )} title={lastSnippet}>
                                {lastSnippet.length > 40 ? `${lastSnippet.slice(0, 40)}…` : lastSnippet}
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
            )}
            {showChatArea && (
              <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-background overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat header */}
                <ChatHeader
                  partnerName={partnerName}
                  subtitle={getConversationSubtitle(selectedConv)}
                  partnerProfileUrl={partnerProfileUrl}
                  projectTitle={projectTitle}
                  projectUrl={projectUrl}
                  onPartnerClick={() => {
                    if (partnerProfileUrl) navigate(partnerProfileUrl);
                  }}
                  onProjectClick={() => {
                    if (projectUrl) navigate(projectUrl);
                  }}
                  isOnline={getPartnerIsOnline(selectedConv)}
                  partnerAvatarUrl={selectedConv?.partner_avatar_url}
                  showBackButton={isMobile}
                  onBack={handleBackToList}
                  onMoreClick={() => setShowInfoPanel(!showInfoPanel)}
                />

                {/* Messages only - this is the only part that scrolls; input stays fixed below */}
                <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                  <ScrollArea className="h-full min-h-0">
                    <div className="p-4 sm:p-6 space-y-1">
                      {messages.length === 0 ? (
                        <EmptyConversation variant="no-messages" partnerName={partnerName} />
                      ) : (
                        messagesByDate.map(([dateKey, dayMessages]) => (
                          <div key={dateKey}>
                            <DateSeparator date={dateKey} />
                            <div className="space-y-3">
                              {dayMessages.map((msg) => (
                                <MessageBubble
                                  key={msg.id}
                                  content={msg.content}
                                  timestamp={msg.created_at}
                                  isOwn={msg.sender_id === currentUser?.id}
                                  isRead={!!msg.read_at}
                                  attachments={msg.attachments}
                                  messageId={msg.id}
                                  onEdit={handleEditMessage}
                                  onDelete={handleDeleteMessage}
                                  onCopy={handleCopyMessage}
                                />
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                      {partnerTypingUntil != null && (
                        <div className="pt-1">
                          <TypingIndicator
                            partnerName={partnerName}
                            partnerAvatarUrl={selectedConv?.partner_avatar_url}
                          />
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Message input - fixed at bottom, never inside scroll, never scrolled */}
                <div className="flex-none w-full min-h-[72px] border-t border-border/30 bg-card/50 p-3 sm:p-4">
                  {attachmentUploadProgress != null && (
                    <div className="mb-2 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Uploading attachments…</span>
                        <span>{attachmentUploadProgress}%</span>
                      </div>
                      <Progress value={attachmentUploadProgress} className="h-1.5" />
                    </div>
                  )}
                  <MessageInput
                    value={newMessage}
                    onChange={setNewMessage}
                    onSend={sendMessage}
                    onFileSelect={sendMessageWithAttachments}
                    placeholder="Type a message..."
                    maxLength={5000}
                  />
                </div>
              </>
            ) : (
              <EmptyConversation variant="no-selection" />
            )}
          </div>
            )}
          </>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 min-w-0">
            <ResizablePanel defaultSize={28} minSize={22} maxSize={50} className="flex flex-col min-h-0 min-w-0">
              <div className="h-full min-h-0 flex flex-col border-r border-border/30 bg-background overflow-hidden">
                <div className="shrink-0 p-4 pb-3 border-b border-border/40 bg-background">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Chats</h1>
                    <div className="flex items-center gap-1">
                      {isAdmin && (
                        <Dialog open={adminChatOpen} onOpenChange={setAdminChatOpen}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title="Chat with user">
                              <UserPlus className="h-5 w-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
                            <DialogHeader>
                              <DialogTitle>Start a new conversation</DialogTitle>
                              <DialogDescription>Search by name to start a support conversation.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="flex gap-2">
                                <Input placeholder="Search by name..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runUserSearch()} className="h-10" />
                                <Button type="button" onClick={runUserSearch} disabled={userSearchLoading}><Search className="h-4 w-4" /></Button>
                              </div>
                              <ScrollArea className="h-[240px] rounded-lg border border-border/50 bg-muted/30">
                                {userSearchResults.length === 0 && !userSearchLoading && <p className="text-sm text-muted-foreground text-center py-8">{userSearch.trim() ? "No users found." : "Type a name and search."}</p>}
                                <div className="p-2 space-y-1">
                                  {userSearchResults.map((u) => (
                                    <button key={u.id} type="button" disabled={startingChatUserId !== null} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left" onClick={(e) => { e.preventDefault(); e.stopPropagation(); startOrOpenAdminChat(u.id); }}>
                                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-sm">{(u.full_name?.[0] || "?").toUpperCase()}</AvatarFallback></Avatar>
                                      <span className="flex-1 truncate font-medium">{u.full_name?.trim() || "Unnamed"}</span>
                                      {startingChatUserId === u.id && <span className="text-xs text-muted-foreground">Opening…</span>}
                                    </button>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" title="More options"><MoreHorizontal className="h-5 w-5" /></Button>
                    </div>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search conversations" value={listSearch} onChange={(e) => setListSearch(e.target.value)} className="pl-9 h-10 rounded-xl bg-muted/40 border-border/50 focus-visible:ring-2 focus-visible:ring-primary/20" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant={listFilter === "all" ? "secondary" : "ghost"} size="sm" className={`rounded-full h-8 px-3 text-sm font-medium ${listFilter === "all" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} onClick={() => setListFilter("all")}>All</Button>
                    <Button variant={listFilter === "favorites" ? "secondary" : "ghost"} size="sm" className={`rounded-full h-8 px-3 text-sm font-medium ${listFilter === "favorites" ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`} onClick={() => setListFilter("favorites")}>Favorites</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-foreground" title="More filters"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowHidden((prev) => !prev)}>{showHidden ? "Hide hidden conversations" : "Show hidden conversations"}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">{listSearch.trim() ? "No matches." : "No conversations yet."}</p>
                    </div>
                  ) : (
                    <div className="px-2 py-1 space-y-0.5">
                      {filteredConversations.map((conv) => {
                        const partnerName = getConversationPartner(conv);
                        const partnerProfileUrl = (() => {
                          if (!currentUser?.id) return null;
                          if (conv.admin_id) {
                            if (currentUser.id === conv.admin_id) {
                              return conv.consumer_id ? `/profile/${conv.consumer_id}` : null;
                            }
                            return null;
                          }
                          if (currentUser.id === conv.consumer_id) {
                            const handle = conv.digger_profiles?.handle?.replace(/^@/, "").trim().toLowerCase();
                            if (handle) return `/digger/${handle}`;
                            return conv.digger_id ? `/digger/${conv.digger_id}` : null;
                          }
                          return conv.consumer_id ? `/profile/${conv.consumer_id}` : null;
                        })();
                        const projectUrl = conv?.gig_id ? `/gig/${conv.gig_id}` : null;
                        const rawRoleOrTitle = conv?.admin_id ? "Support chat" : (conv?.gigs?.title || conv?.digger_profiles?.profession || "General inquiry");
                        const roleOrTitle = rawRoleOrTitle.length > 35 ? `${rawRoleOrTitle.slice(0, 35)}…` : rawRoleOrTitle;
                        const lastFromMe = conv?.last_message_sender_id === currentUser?.id;
                        const lastSnippet = conv?.last_message_content ? (lastFromMe ? "You: " : `${partnerName}: `) + conv.last_message_content : null;
                        const isStarred = starredIds.includes(conv.id);
                        const isPinned = pinnedIds.includes(conv.id);
                        const unreadCount = conv.unread_count ?? 0;
                        const hasUnread = unreadCount > 0;
                        return (
                          <div key={conv.id} role="button" tabIndex={0} onClick={() => setSelectedConversation(conv.id)} onKeyDown={(e) => e.key === "Enter" && setSelectedConversation(conv.id)} className={cn("group w-full flex items-start gap-3 p-3 text-left transition-colors cursor-pointer rounded-xl", "hover:bg-muted/60", selectedConversation === conv.id ? "bg-muted shadow-sm ring-1 ring-border/50" : "bg-transparent")}>
                            <div className="relative shrink-0">
                              <Avatar className="h-11 w-11 ring-1 ring-border/50">
                                {conv.partner_avatar_url && <AvatarImage src={conv.partner_avatar_url} alt="" className="object-cover" />}
                                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">{partnerName[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background", getPartnerIsOnline(conv) ? "bg-success" : "bg-muted-foreground/50")} title={getPartnerIsOnline(conv) ? "Online" : "Offline"} />
                            </div>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                {partnerProfileUrl ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      "truncate min-w-0 text-foreground flex-1 text-left hover:underline",
                                      hasUnread ? "font-semibold" : "font-medium"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(partnerProfileUrl);
                                    }}
                                  >
                                    {partnerName}
                                  </button>
                                ) : (
                                  <p className={cn("truncate min-w-0 text-foreground flex-1", hasUnread ? "font-semibold" : "font-medium")}>
                                    {partnerName}
                                  </p>
                                )}
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <span className="text-xs text-muted-foreground">{format(new Date(conv.updated_at), "M/d/yy")}</span>
                                  {hasUnread && <span className="h-5 min-w-[1.25rem] px-1 rounded-md bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center shrink-0" title={`${unreadCount} unread`}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
                                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); toggleStarred(conv.id); }} title={isStarred ? "Remove from favorites" : "Add to favorites"}><Star className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-500" : ""}`} /></Button>
                                  <Button variant="ghost" size="icon" className={`h-7 w-7 transition-opacity ${isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} onClick={(e) => { e.stopPropagation(); togglePinned(conv.id); }} title={isPinned ? "Unpin" : "Pin to top"}><Pin className={`h-4 w-4 ${isPinned ? "fill-muted-foreground text-muted-foreground" : ""}`} /></Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()} title="More options"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`${window.location.origin}/messages?conversation=${conv.id}`, "_blank"); }}><ExternalLink className="h-4 w-4 mr-2" />Open in new window</DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkAsUnread(conv.id); }}><EyeOff className="h-4 w-4 mr-2" />Mark as unread</DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePinned(conv.id); }}><Pin className="h-4 w-4 mr-2" />{isPinned ? "Unpin" : "Pin"}</DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleMute(conv.id); }}><BellOff className="h-4 w-4 mr-2" />{conv.muted ? "Unmute" : "Mute"}</DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleBlock(conv); }}><Ban className="h-4 w-4 mr-2" />{conv.is_blocked ? "Unblock" : "Block"}</DropdownMenuItem>
                                      {hiddenIds.includes(conv.id) ? <DropdownMenuItem onClick={(e) => { e.stopPropagation(); unhideConversation(conv.id); }}><EyeOff className="h-4 w-4 mr-2" />Unhide</DropdownMenuItem> : <DropdownMenuItem onClick={(e) => { e.stopPropagation(); hideConversation(conv.id); }}><EyeOff className="h-4 w-4 mr-2" />Hide</DropdownMenuItem>}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConversationId(conv.id); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              {projectUrl ? (
                                <button
                                  type="button"
                                  className="text-xs text-muted-foreground truncate mt-0.5 min-w-0 hover:underline text-left"
                                  title={rawRoleOrTitle}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(projectUrl);
                                  }}
                                >
                                  {roleOrTitle}
                                </button>
                              ) : (
                                <p className="text-xs text-muted-foreground truncate mt-0.5 min-w-0" title={rawRoleOrTitle}>{roleOrTitle}</p>
                              )}
                              {lastSnippet && <p className={cn("text-xs truncate mt-0.5 min-w-0", hasUnread ? "font-semibold text-foreground/90" : "text-muted-foreground/90")} title={lastSnippet}>{lastSnippet.length > 40 ? `${lastSnippet.slice(0, 40)}…` : lastSnippet}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="shrink-0 bg-border" />
            <ResizablePanel defaultSize={72} minSize={50} className="flex flex-col min-h-0 min-w-0">
              <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-background overflow-hidden">
                {selectedConversation ? (
                  <>
                    {/* Thread header + message list + input all fit within (viewport - site header) */}
                    <ChatHeader
                      partnerName={partnerName}
                      subtitle={getConversationSubtitle(selectedConv)}
                      partnerProfileUrl={partnerProfileUrl}
                      projectTitle={projectTitle}
                      projectUrl={projectUrl}
                      onPartnerClick={() => {
                        if (partnerProfileUrl) navigate(partnerProfileUrl);
                      }}
                      onProjectClick={() => {
                        if (projectUrl) navigate(projectUrl);
                      }}
                      isOnline={getPartnerIsOnline(selectedConv)}
                      partnerAvatarUrl={selectedConv?.partner_avatar_url}
                      showBackButton={isMobile}
                      onBack={handleBackToList}
                      onMoreClick={() => setShowInfoPanel(!showInfoPanel)}
                    />
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      <ScrollArea className="h-full min-h-0">
                        <div className="p-4 sm:p-6 space-y-1">
                          {messages.length === 0 ? <EmptyConversation variant="no-messages" partnerName={partnerName} /> : messagesByDate.map(([dateKey, dayMessages]) => (
                            <div key={dateKey}>
                              <DateSeparator date={dateKey} />
                              <div className="space-y-3">{dayMessages.map((msg) => <MessageBubble key={msg.id} content={msg.content} timestamp={msg.created_at} isOwn={msg.sender_id === currentUser?.id} isRead={!!msg.read_at} attachments={msg.attachments} messageId={msg.id} onEdit={handleEditMessage} onDelete={handleDeleteMessage} onCopy={handleCopyMessage} />)}</div>
                            </div>
                          ))}
                          {partnerTypingUntil != null && (
                            <div className="pt-1">
                              <TypingIndicator
                                partnerName={partnerName}
                                partnerAvatarUrl={selectedConv?.partner_avatar_url}
                              />
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex-none w-full min-h-[72px] border-t border-border/30 bg-card/50 p-3 sm:p-4">
                      {attachmentUploadProgress != null && (
                        <div className="mb-2 space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Uploading attachments…</span>
                            <span>{attachmentUploadProgress}%</span>
                          </div>
                          <Progress value={attachmentUploadProgress} className="h-1.5" />
                        </div>
                      )}
                      <MessageInput value={newMessage} onChange={setNewMessage} onSend={sendMessage} onFileSelect={sendMessageWithAttachments} placeholder="Type a message..." maxLength={5000} />
                    </div>
                  </>
                ) : (
                  <EmptyConversation variant="no-selection" />
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}

        {/* Right: Contact / Activity panel */}
        {selectedConversation && !isMobile && (
          <div className={`
            ${showInfoPanel ? 'flex' : 'hidden xl:flex'} 
            w-72 xl:w-80 shrink-0 flex-col border-l border-border/30 bg-card overflow-hidden
          `}>
            <div className="p-4 space-y-5 flex-1 overflow-hidden min-h-0 flex flex-col">
              {/* Profile header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
                    {selectedConv?.partner_avatar_url && (
                      <AvatarImage src={selectedConv.partner_avatar_url} alt="" className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {partnerName[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{partnerName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <FileCheck className="h-3 w-3 shrink-0" />
                      {getConversationSubtitle(selectedConv)}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" 
                  title="Close panel"
                  onClick={() => setShowInfoPanel(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Online status: You + Partner (real-time green/grey) */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Online status</h4>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                    <span className={cn("h-2.5 w-2.5 rounded-full border-2 border-background shrink-0", iAmOnline ? "bg-success" : "bg-muted-foreground/50")} title={iAmOnline ? "Online" : "Offline"} />
                    <span className="text-sm font-medium text-foreground">You</span>
                    <span className="text-xs text-muted-foreground ml-auto">{iAmOnline ? "Online" : "Offline"}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                    <span className={cn("h-2.5 w-2.5 rounded-full border-2 border-background shrink-0", getPartnerIsOnline(selectedConv) ? "bg-success" : "bg-muted-foreground/50")} title={getPartnerIsOnline(selectedConv) ? "Online" : "Offline"} />
                    <span className="text-sm font-medium text-foreground">{partnerName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{getPartnerIsOnline(selectedConv) ? "Online" : "Offline"}</span>
                  </div>
                </div>
              </div>

              {/* Local time */}
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} local time
              </div>

              {/* View gig button */}
              {selectedConv?.gig_id && (
                <Button
                  variant="default"
                  className="w-full gap-2 shadow-primary"
                  onClick={() => navigate(`/gig/${selectedConv.gig_id}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  View gig
                </Button>
              )}

              {/* Activity timeline */}
              <div className="border-t border-border/30 pt-4">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-left font-semibold text-sm py-1"
                >
                  Activity timeline
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
                <div className="mt-4 space-y-0 relative pl-5 border-l-2 border-primary/20 ml-0.5">
                  <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-primary -translate-x-[6px] shadow-sm" />
                  <div className="pb-4 flex items-start gap-2">
                    <FileCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Conversation started</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConv && format(new Date(selectedConv.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {selectedConv?.gig_id && (
                    <>
                      <div className="absolute left-0 top-12 w-2.5 h-2.5 rounded-full bg-muted-foreground/30 -translate-x-[6px]" />
                      <div className="pb-3 flex items-start gap-2">
                        <Hourglass className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Linked to gig</p>
                          <p className="text-xs text-muted-foreground">Project discussion</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Proxy emails */}
              {(partnerProxyEmail || myProxyEmail) && (
                <div className="pt-4 border-t border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
                  {partnerProxyEmail && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Their email</p>
                        <code className="text-xs truncate block mt-0.5">{partnerProxyEmail}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyToClipboard(partnerProxyEmail)}
                      >
                        {copiedEmail === partnerProxyEmail ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                  {myProxyEmail && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Your proxy</p>
                        <code className="text-xs truncate block mt-0.5">{myProxyEmail}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => copyToClipboard(myProxyEmail)}
                      >
                        {copiedEmail === myProxyEmail ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit message dialog */}
      <Dialog open={!!editingMessageId} onOpenChange={(open) => !open && setEditingMessageId(null)}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Edit message</DialogTitle>
            <DialogDescription>Change the message text and save.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={editingMessageContent}
              onChange={(e) => setEditingMessageContent(e.target.value)}
              placeholder="Message content"
              className="min-h-[100px] resize-y"
              maxLength={5000}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" onClick={() => setEditingMessageId(null)}>Cancel</Button>
              <Button onClick={updateMessage}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && setDeleteMessageId(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMessage}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteMessage();
              }}
            >
              {isDeletingMessage ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteConversationId} onOpenChange={(open) => !open && setDeleteConversationId(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteConversation();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
