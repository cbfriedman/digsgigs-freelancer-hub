import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase, supabaseAnonKey } from "@/integrations/supabase/client";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentConversations, type RecentConversation } from "@/hooks/useRecentConversations";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { useUserPresence, getUserPresenceStatus, type PresenceStatus } from "@/hooks/useUserPresence";
import { usePresenceAwayMs } from "@/hooks/usePresenceSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Send,
  Loader2,
  ChevronUp,
  ExternalLink,
  MoreHorizontal,
  MoreVertical,
  X,
  Bell,
  BellOff,
  EyeOff,
  Ban,
  Search,
  Pencil,
  Trash2,
  Copy,
  UploadCloud,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { isNotificationMuted, setNotificationMuted } from "@/lib/notificationSound";
import { dispatchMessagesSync, MESSAGES_SYNC_EVENT, type MessagesSyncDetail } from "@/lib/messagesSync";
import { MessageInput, MessageBubble, TypingIndicator } from "@/components/messages";

const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000, "Message too long");

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  conversation_id?: string;
  attachments?: { name: string; path: string; type: string }[];
}

const MESSAGES_PAGE = "/messages";
const CHAT_BOX_WIDTH = "w-[340px]";
const MAX_OPEN_CHATS = 4;

export function FloatingMessageWidget() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { conversations, loading: convLoading } = useRecentConversations(user ?? null);
  const { onlineUserIds } = useUserPresence();
  const awayAfterMs = usePresenceAwayMs();
  const unreadCount = useUnreadMessagesCount();

  const getWidgetStorageKey = (suffix: string) => (user?.id ? `messages_widget_${suffix}_${user.id}` : null);

  const [isOpen, setIsOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => isNotificationMuted());
  const [listSearch, setListSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [openChats, setOpenChats] = useState<RecentConversation[]>([]);
  const restoredOpenRef = useRef(false);
  const storedOpenChatIdsRef = useRef<string[] | null>(null);
  const [collapsedChats, setCollapsedChats] = useState<Record<string, boolean>>({});
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>({});
  const [blockedChats, setBlockedChats] = useState<Record<string, boolean>>({});
  const [unreadOverrides, setUnreadOverrides] = useState<Record<string, number>>({});
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [attachmentUploadProgress, setAttachmentUploadProgress] = useState<number | null>(null);
  const [attachmentUploadConvId, setAttachmentUploadConvId] = useState<string | null>(null);
  const [replyingToMap, setReplyingToMap] = useState<Record<string, { id: string; content: string } | null>>({});
  const [floatingInputMaxHeight, setFloatingInputMaxHeight] = useState(220);
  const [dragOverConvMap, setDragOverConvMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const shouldKeepScrollUnlocked = !!editingMessageId || !!deleteMessageId || !!deleteChatId;
    if (!shouldKeepScrollUnlocked || typeof document === "undefined") return;
    const unlockScroll = () => {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0px";
      document.documentElement.style.overflow = "auto";
    };
    unlockScroll();
    const timeoutId = window.setTimeout(unlockScroll, 0);
    return () => {
      window.clearTimeout(timeoutId);
      unlockScroll();
    };
  }, [editingMessageId, deleteMessageId, deleteChatId]);

  useEffect(() => {
    const computeMaxHeight = () => {
      if (typeof window === "undefined") return;
      const panelHeight = Math.min(440, Math.max(260, window.innerHeight - 160));
      setFloatingInputMaxHeight(Math.max(120, Math.floor(panelHeight / 2)));
    };
    computeMaxHeight();
    window.addEventListener("resize", computeMaxHeight);
    return () => window.removeEventListener("resize", computeMaxHeight);
  }, []);

  const channelsRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({});
  const endRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefsMap = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const scrollAreaRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingAutoScrollRef = useRef<Record<string, boolean>>({});
  const typingTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const typingSendTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const dragDepthRef = useRef<Record<string, number>>({});
  const conversationsRef = useRef<RecentConversation[]>([]);
  const messagesMapRef = useRef<Record<string, Message[]>>({});
  const openChatRef = useRef<(
    conv: RecentConversation,
    bringToFront?: boolean,
    showLoaderOnInit?: boolean
  ) => void>(() => {});
  const openChatIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  messagesMapRef.current = messagesMap;
  openChatIdsRef.current = new Set(openChats.map((c) => c.id));
  const [partnerTypingMap, setPartnerTypingMap] = useState<Record<string, boolean>>({});

  const hideOnMessagesPage = pathname === MESSAGES_PAGE;
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  // Restore widget open state and pending conversation ids from sessionStorage (survives refresh)
  useEffect(() => {
    if (!user?.id || hideOnMessagesPage) return;
    const openKey = getWidgetStorageKey("open");
    const convKey = getWidgetStorageKey("conversations");
    if (openKey) {
      try {
        const raw = sessionStorage.getItem(openKey);
        if (raw === "true") setIsOpen(true);
      } catch {
        // sessionStorage may be unavailable (e.g. private browsing)
      }
    }
    if (convKey) {
      try {
        const raw = sessionStorage.getItem(convKey);
        const ids = raw ? (JSON.parse(raw) as string[]) : [];
        if (Array.isArray(ids) && ids.length > 0) storedOpenChatIdsRef.current = ids;
      } catch {
        // sessionStorage may be unavailable (e.g. private browsing)
      }
    }
  }, [user?.id, hideOnMessagesPage]);

  useEffect(() => {
    if (!user?.id) {
      setUserAvatarUrl(null);
      return;
    }
    const loadAvatar = async () => {
      const authPhoto = (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture;
      if (authPhoto && typeof authPhoto === "string") setUserAvatarUrl(authPhoto);
      const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
      const url = data?.avatar_url;
      if (url && typeof url === "string") setUserAvatarUrl(url);
    };
    loadAvatar();
  }, [user?.id]);

  const toggleMute = () => {
    const next = !isNotificationMuted();
    setNotificationMuted(next);
    setSoundMuted(next);
  };

  const getUserInitials = () => {
    const name = (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "?";
    return String(name)
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getPartnerPresenceStatus = useCallback(
    (conv: RecentConversation | undefined) => {
      return getUserPresenceStatus(conv?.partnerUserId ? String(conv.partnerUserId) : null, awayAfterMs);
    },
    [onlineUserIds, awayAfterMs]
  );

  const getPresenceDotClass = (status: PresenceStatus) =>
    status === "online"
      ? "bg-success"
      : status === "away"
        ? "bg-amber-400"
        : "bg-muted-foreground/50";

  const scrollToEnd = useCallback((convId: string) => {
    const scrollArea = scrollAreaRefsMap.current[convId];
    const viewport = scrollArea?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      setTimeout(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "auto" });
      }, 50);
      return;
    }
    const el = endRefsMap.current[convId];
    el?.scrollIntoView({ behavior: "smooth", block: "end" });
    setTimeout(() => {
      endRefsMap.current[convId]?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 50);
  }, []);

  const loadMessages = useCallback(
    async (convId: string, showLoader = true) => {
      if (!user?.id) return;
      if (showLoader) {
        setLoadingMap((prev) => ({ ...prev, [convId]: true }));
      }
      try {
        const { data, error } = await supabase.rpc("get_conversation_messages" as any, {
          _conversation_id: convId,
        });
        if (error) throw error;
        const fromServer = (data as Message[]) || [];
        setMessagesMap((prev) => {
          const existing = prev[convId] || [];
          const serverIds = new Set(fromServer.map((m) => m.id));
          const fromRealtime = existing.filter((m) => !serverIds.has(m.id));
          const merged = [...fromServer, ...fromRealtime].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return { ...prev, [convId]: merged };
        });
        requestAnimationFrame(() => {
          scrollToEnd(convId);
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to load messages");
      } finally {
        if (showLoader) {
          setLoadingMap((prev) => ({ ...prev, [convId]: false }));
        }
      }
    },
    [user?.id, scrollToEnd]
  );

  const subscribeToMessages = useCallback((convId: string) => {
    if (channelsRef.current[convId]) return;
    const uid = userIdRef.current;
    const channel = supabase
      .channel(`messages:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessagesMap((prev) => {
            const list = prev[convId] || [];
            if (list.some((m) => m.id === incoming.id)) return prev;
            return { ...prev, [convId]: [...list, incoming] };
          });
          dispatchMessagesSync({ conversationId: convId, message: incoming });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessagesMap((prev) => ({
            ...prev,
            [convId]: (prev[convId] || []).map((m) =>
              m.id === updated.id ? { ...m, read_at: updated.read_at } : m
            ),
          }));
        }
      )
      .on(
        "broadcast",
        { event: "typing" },
        (payload) => {
          const typingUserId = (payload.payload as { user_id?: string })?.user_id;
          if (!typingUserId || typingUserId === uid) return;
          setPartnerTypingMap((prev) => ({ ...prev, [convId]: true }));
          const existingTimeout = typingTimeoutsRef.current[convId];
          if (existingTimeout) clearTimeout(existingTimeout);
          typingTimeoutsRef.current[convId] = setTimeout(() => {
            setPartnerTypingMap((prev) => ({ ...prev, [convId]: false }));
            typingTimeoutsRef.current[convId] = null;
          }, 3000);
        }
      )
      .subscribe();
    channelsRef.current[convId] = channel;
  }, []);

  const openChat = useCallback(
    (conv: RecentConversation, bringToFront = false, showLoaderOnInit = true) => {
      let wasAlreadyOpen = false;
      setOpenChats((prev) => {
        const idx = prev.findIndex((c) => c.id === conv.id);
        if (idx >= 0) {
          wasAlreadyOpen = true;
          if (!bringToFront) return prev;
          const without = prev.filter((c) => c.id !== conv.id);
          return [...without, conv];
        }
        const next = [...prev, conv].slice(-MAX_OPEN_CHATS);
        return next;
      });
      pendingAutoScrollRef.current[conv.id] = true;
      if (!wasAlreadyOpen) {
        subscribeToMessages(conv.id);
        const hasBufferedMessages = (messagesMapRef.current[conv.id] || []).length > 0;
        loadMessages(conv.id, showLoaderOnInit && !hasBufferedMessages);
      }
      setCollapsedChats((prev) => ({ ...prev, [conv.id]: false }));
      requestAnimationFrame(() => {
        scrollToEnd(conv.id);
        inputRefsMap.current[conv.id]?.focus();
      });
      setTimeout(() => {
        scrollToEnd(conv.id);
      }, 300);
      setTimeout(() => {
        scrollToEnd(conv.id);
      }, 600);
    },
    [loadMessages, subscribeToMessages, scrollToEnd]
  );

  conversationsRef.current = conversations;
  openChatRef.current = openChat;

  // Restore open chats from sessionStorage once conversations have loaded
  useEffect(() => {
    if (hideOnMessagesPage || restoredOpenRef.current || conversations.length === 0) return;
    const ids = storedOpenChatIdsRef.current;
    if (!ids?.length) return;
    const toOpen = ids
      .map((id) => conversations.find((c) => c.id === id))
      .filter((c): c is RecentConversation => c != null);
    if (toOpen.length === 0) {
      storedOpenChatIdsRef.current = null;
      return;
    }
    restoredOpenRef.current = true;
    storedOpenChatIdsRef.current = null;
    toOpen.forEach((conv) => openChatRef.current(conv, false));
    setIsOpen(true);
  }, [conversations, hideOnMessagesPage]);

  // Persist widget open state and open conversation ids so refresh keeps them
  useEffect(() => {
    const openKey = getWidgetStorageKey("open");
    const convKey = getWidgetStorageKey("conversations");
    if (!openKey || !convKey || hideOnMessagesPage) return;
    try {
      sessionStorage.setItem(openKey, String(isOpen));
      sessionStorage.setItem(convKey, JSON.stringify(openChats.map((c) => c.id)));
    } catch {
      // sessionStorage may be unavailable (e.g. private browsing)
    }
  }, [isOpen, openChats, user?.id, hideOnMessagesPage]);

  const closeChat = useCallback((convId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== convId));
    setCollapsedChats((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    delete pendingAutoScrollRef.current[convId];
    const ch = channelsRef.current[convId];
    if (ch) {
      supabase.removeChannel(ch);
      delete channelsRef.current[convId];
    }
    const typingTimeout = typingTimeoutsRef.current[convId];
    if (typingTimeout) clearTimeout(typingTimeout);
    delete typingTimeoutsRef.current[convId];
    const typingSendTimeout = typingSendTimeoutsRef.current[convId];
    if (typingSendTimeout) clearTimeout(typingSendTimeout);
    delete typingSendTimeoutsRef.current[convId];
    setPartnerTypingMap((prev) => {
      if (!prev[convId]) return prev;
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    setMessagesMap((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    setInputMap((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    setDragOverConvMap((prev) => {
      if (!prev[convId]) return prev;
      const next = { ...prev };
      delete next[convId];
      return next;
    });
    delete dragDepthRef.current[convId];
  }, []);

  useEffect(() => {
    return () => {
      Object.values(channelsRef.current).forEach((ch) => {
        if (ch) supabase.removeChannel(ch);
      });
      channelsRef.current = {};
      Object.values(typingTimeoutsRef.current).forEach((t) => t && clearTimeout(t));
      Object.values(typingSendTimeoutsRef.current).forEach((t) => t && clearTimeout(t));
      typingTimeoutsRef.current = {};
      typingSendTimeoutsRef.current = {};
    };
  }, []);

  // Sync with main Messages page: when main page sends or receives, update our bubble messages if that conv is open
  useEffect(() => {
    const handler = (e: Event) => {
      const { conversationId, message } = (e as CustomEvent<MessagesSyncDetail>).detail ?? {};
      if (!conversationId) return;
      if (message && openChatIdsRef.current.has(conversationId)) {
        setMessagesMap((prev) => {
          const list = prev[conversationId] || [];
          if (list.some((m) => m.id === message.id)) return prev;
          return {
            ...prev,
            [conversationId]: [...list, message as Message].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
          };
        });
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("recent-conversations-refresh"));
      }
    };
    window.addEventListener(MESSAGES_SYNC_EVENT, handler);
    return () => window.removeEventListener(MESSAGES_SYNC_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!user?.id || hideOnMessagesPage) return;
    const channel = supabase
      .channel("incoming-messages-auto-open")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Message & { conversation_id: string };
          const uid = userIdRef.current;
          if (!uid || msg.sender_id === uid) return;
          setIsOpen(true);
          const addMessageToConv = (convId: string) => {
            setMessagesMap((prev) => {
              const list = prev[convId] || [];
              if (list.some((m) => m.id === msg.id)) return prev;
              return { ...prev, [convId]: [...list, msg] };
            });
            dispatchMessagesSync({ conversationId: convId, message: msg });
          };
          const tryOpenChat = (conv: RecentConversation) => {
            addMessageToConv(conv.id);
            openChatRef.current(conv, true, false);
          };
          let conv = conversationsRef.current.find((c) => c.id === msg.conversation_id);
          if (conv) {
            tryOpenChat(conv);
          } else {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("recent-conversations-refresh"));
            }
            const retryDelays = [350, 600, 1000];
            retryDelays.forEach((delay) => {
              setTimeout(() => {
                conv = conversationsRef.current.find((c) => c.id === msg.conversation_id);
                if (conv) tryOpenChat(conv);
              }, delay);
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, hideOnMessagesPage]);

  useEffect(() => {
    openChats.forEach((c) => {
      if (collapsedChats[c.id]) return;
      const el = endRefsMap.current[c.id];
      el?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [openChats, messagesMap, collapsedChats]);

  useEffect(() => {
    openChats.forEach((c) => {
      if (collapsedChats[c.id]) return;
      if (!pendingAutoScrollRef.current[c.id]) return;
      if (!messagesMap[c.id]) return;
      pendingAutoScrollRef.current[c.id] = false;
      requestAnimationFrame(() => {
        scrollToEnd(c.id);
      });
      setTimeout(() => {
        scrollToEnd(c.id);
      }, 120);
    });
  }, [openChats, messagesMap, collapsedChats, scrollToEnd]);

  useEffect(() => {
    if (conversations.length === 0) return;
    setOpenChats((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const latest = conversations.find((x) => x.id === c.id);
        if (!latest) return c;
        const same =
          latest.updatedAt === c.updatedAt &&
          latest.unreadCount === c.unreadCount &&
          latest.muted === c.muted &&
          latest.isBlocked === c.isBlocked &&
          latest.partnerDisplayName === c.partnerDisplayName &&
          latest.partnerAvatarUrl === c.partnerAvatarUrl &&
          latest.partnerJobTitle === c.partnerJobTitle &&
          latest.partnerProfileUrl === c.partnerProfileUrl &&
          latest.partnerUserId === c.partnerUserId;
        if (same) return c;
        changed = true;
        return latest;
      });
      return changed ? next : prev;
    });
  }, [conversations]);

  useEffect(() => {
    if (Object.keys(unreadOverrides).length === 0) return;
    setUnreadOverrides((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const convId of Object.keys(prev)) {
        const conv = conversations.find((c) => c.id === convId);
        if (!conv || conv.unreadCount === prev[convId]) {
          delete next[convId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [conversations, unreadOverrides]);

  // Keep bubble chat history scrolled to latest when messages load or update
  useEffect(() => {
    if (openChats.length === 0) return;
    const scrollToLatest = () => {
      openChats.forEach((c) => {
        if (collapsedChats[c.id]) return;
        scrollToEnd(c.id);
      });
    };
    requestAnimationFrame(scrollToLatest);
    const t = setTimeout(scrollToLatest, 150);
    return () => clearTimeout(t);
  }, [openChats, messagesMap, collapsedChats, scrollToEnd]);

  const handleReplyToMessage = useCallback((convId: string, messageId: string, content: string) => {
    setReplyingToMap((prev) => ({ ...prev, [convId]: { id: messageId, content: content.slice(0, 200) } }));
  }, []);

  const handleMessageInputChange = useCallback((convId: string, value: string) => {
    setInputMap((prev) => ({ ...prev, [convId]: value }));
    if (!value.trim()) return;
    const existingTimeout = typingSendTimeoutsRef.current[convId];
    if (existingTimeout) clearTimeout(existingTimeout);
    typingSendTimeoutsRef.current[convId] = setTimeout(() => {
      const channel = channelsRef.current[convId];
      const uid = userIdRef.current;
      if (channel && uid) {
        channel.send({
          type: "broadcast",
          event: "typing",
          payload: { user_id: uid },
        });
      }
      typingSendTimeoutsRef.current[convId] = null;
    }, 300);
  }, []);

  const handleMessageInputFocus = useCallback(
    async (convId: string) => {
      if (!user?.id) return;
      try {
        await supabase.rpc("mark_conversation_messages_read" as any, {
          _conversation_id: convId,
        });
        const now = new Date().toISOString();
        setMessagesMap((prev) => ({
          ...prev,
          [convId]: (prev[convId] || []).map((m) =>
            m.sender_id !== user.id && !m.read_at ? { ...m, read_at: now } : m
          ),
        }));
        setUnreadOverrides((prev) => {
          if (typeof prev[convId] === "undefined") return prev;
          const next = { ...prev };
          delete next[convId];
          return next;
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("recent-conversations-refresh"));
        }
      } catch {
        // non-blocking
      }
    },
    [user?.id]
  );

  const handleSend = useCallback(
    async (conv: RecentConversation) => {
      let trimmed = (inputMap[conv.id] ?? "").trim();
      if (!trimmed || !user?.id) return;
      const replyingTo = replyingToMap[conv.id];
      if (replyingTo?.content) {
        const quoteLine = replyingTo.content.split("\n")[0].slice(0, 100);
        trimmed = `> ${quoteLine}${quoteLine.length >= 100 ? "…" : ""}\n\n${trimmed}`;
        setReplyingToMap((prev) => ({ ...prev, [conv.id]: null }));
      }
      const parsed = messageSchema.safeParse(trimmed);
      if (!parsed.success) {
        toast.error("Message must be 1-5000 characters");
        return;
      }
      setSendingMap((prev) => ({ ...prev, [conv.id]: true }));
      setInputMap((prev) => ({ ...prev, [conv.id]: "" }));
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content: trimmed,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        read_at: null,
      };
      setMessagesMap((prev) => ({
        ...prev,
        [conv.id]: [...(prev[conv.id] || []), optimisticMessage],
      }));
      try {
        const { data: messageId, error } = await supabase.rpc("send_message" as any, {
          _conversation_id: conv.id,
          _content: parsed.data,
          _attachments: [],
        });
        if (error) throw error;
        if (messageId) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("recent-conversations-refresh"));
          }
          const finalMessage: Message = {
            id: String(messageId),
            content: trimmed,
            sender_id: user.id,
            created_at: new Date().toISOString(),
            read_at: null,
          };
          setMessagesMap((prev) => ({
            ...prev,
            [conv.id]: (prev[conv.id] || []).map((m) =>
              m.id === tempId ? { ...finalMessage } : m
            ),
          }));
          dispatchMessagesSync({ conversationId: conv.id, message: finalMessage });
          supabase.functions
            .invoke("enqueue-message-notification", {
              body: { conversation_id: conv.id, message_id: messageId },
            })
            .catch(() => {});
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to send");
        setMessagesMap((prev) => ({
          ...prev,
          [conv.id]: (prev[conv.id] || []).filter((m) => m.id !== tempId),
        }));
        setInputMap((prev) => ({ ...prev, [conv.id]: trimmed }));
      } finally {
        setSendingMap((prev) => ({ ...prev, [conv.id]: false }));
        const focusInput = () => inputRefsMap.current[conv.id]?.focus();
        requestAnimationFrame(focusInput);
        setTimeout(focusInput, 100);
      }
    },
    [user?.id, inputMap, replyingToMap]
  );

  const handleSendWithAttachments = useCallback(
    async (conv: RecentConversation, files: File[], content: string) => {
      if (!user?.id) return;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "https://njpjxasfesdapxukvyth.supabase.co";
      const { data: { session } } = await supabase.auth.getSession();
      setSendingMap((prev) => ({ ...prev, [conv.id]: true }));
      setInputMap((prev) => ({ ...prev, [conv.id]: "" }));
      setAttachmentUploadConvId(conv.id);
      setAttachmentUploadProgress(0);
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content: content.trim() || "(attachment)",
        sender_id: user.id,
        created_at: new Date().toISOString(),
        read_at: null,
        attachments: files.map((f) => ({ name: f.name, path: "", type: f.type || "application/octet-stream" })),
      };
      setMessagesMap((prev) => ({
        ...prev,
        [conv.id]: [...(prev[conv.id] || []), optimisticMessage],
      }));
      const bucket = "message-attachments";
      const attachments: { name: string; path: string; type: string }[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "file";
          const path = `${conv.id}/${user.id}/${crypto.randomUUID()}_${safeName}`;
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
          _conversation_id: conv.id,
          _content: content.trim(),
          _attachments: attachments,
        });
        if (error) throw error;
        if (messageId) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("recent-conversations-refresh"));
          }
          const finalMessage: Message = {
            id: String(messageId),
            content: content.trim() || "(attachment)",
            sender_id: user.id,
            created_at: new Date().toISOString(),
            read_at: null,
            attachments,
          };
          setMessagesMap((prev) => ({
            ...prev,
            [conv.id]: (prev[conv.id] || []).map((m) =>
              m.id === tempId ? { ...finalMessage } : m
            ),
          }));
          dispatchMessagesSync({ conversationId: conv.id, message: finalMessage });
          supabase.functions
            .invoke("enqueue-message-notification", {
              body: { conversation_id: conv.id, message_id: messageId },
            })
            .catch(() => {});
        }
        loadMessages(conv.id);
      } catch (e: any) {
        toast.error(e?.message ?? "Error sending attachments");
        setMessagesMap((prev) => ({
          ...prev,
          [conv.id]: (prev[conv.id] || []).filter((m) => m.id !== tempId),
        }));
        setInputMap((prev) => ({ ...prev, [conv.id]: content }));
      } finally {
        setSendingMap((prev) => ({ ...prev, [conv.id]: false }));
        setAttachmentUploadProgress(null);
        setAttachmentUploadConvId(null);
        const focusInput = () => inputRefsMap.current[conv.id]?.focus();
        requestAnimationFrame(focusInput);
        setTimeout(focusInput, 100);
      }
    },
    [user?.id, loadMessages]
  );

  const isFileDrag = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types || []).includes("Files");

  const handleConvDragEnter = useCallback((convId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current[convId] = (dragDepthRef.current[convId] || 0) + 1;
    setDragOverConvMap((prev) => ({ ...prev, [convId]: true }));
  }, []);

  const handleConvDragOver = useCallback((convId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (!dragOverConvMap[convId]) {
      setDragOverConvMap((prev) => ({ ...prev, [convId]: true }));
    }
  }, [dragOverConvMap]);

  const handleConvDragLeave = useCallback((convId: string, e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const depth = Math.max(0, (dragDepthRef.current[convId] || 0) - 1);
    dragDepthRef.current[convId] = depth;
    if (depth === 0) {
      setDragOverConvMap((prev) => ({ ...prev, [convId]: false }));
    }
  }, []);

  const handleConvDrop = useCallback((conv: RecentConversation, e: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current[conv.id] = 0;
    setDragOverConvMap((prev) => ({ ...prev, [conv.id]: false }));
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    void handleSendWithAttachments(conv, files, inputMap[conv.id] ?? "");
  }, [handleSendWithAttachments, inputMap]);

  const openFullMessages = (conv?: RecentConversation) => {
    setIsOpen(false);
    navigate(conv ? `/messages?conversation=${conv.id}` : "/messages");
  };

  const handleEditMessage = (convId: string, messageId: string) => {
    const list = messagesMap[convId] || [];
    const msg = list.find((x) => x.id === messageId);
    if (msg && !messageId.startsWith("temp-")) {
      setEditingConvId(convId);
      setEditingMessageId(messageId);
      setEditingMessageContent(msg.content || "");
    }
  };

  const updateMessage = async () => {
    if (!editingConvId || !editingMessageId || !user?.id) return;
    const parsed = messageSchema.safeParse(editingMessageContent);
    if (!parsed.success) {
      toast.error("Message must be 1-5000 characters");
      return;
    }
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: parsed.data })
        .eq("id", editingMessageId)
        .eq("sender_id", user.id);
      if (error) throw error;
      setMessagesMap((prev) => ({
        ...prev,
        [editingConvId]: (prev[editingConvId] || []).map((m) =>
          m.id === editingMessageId ? { ...m, content: parsed.data } : m
        ),
      }));
      setEditingConvId(null);
      setEditingMessageId(null);
      setEditingMessageContent("");
      toast.success("Message updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update message");
    }
  };

  const handleDeleteMessage = (convId: string, messageId: string) => {
    if (messageId.startsWith("temp-")) return;
    setDeleteConvId(convId);
    setDeleteMessageId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteConvId || !deleteMessageId || !user?.id) return;
    setIsDeletingMessage(true);
    try {
      const list = messagesMap[deleteConvId] || [];
      const msg = list.find((m) => m.id === deleteMessageId);
      const paths = (msg?.attachments ?? []).map((a) => a.path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("message-attachments").remove(paths);
        // Proceed to delete message row even if storage returned errors
      }
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", deleteMessageId)
        .eq("sender_id", user.id);
      if (error) throw error;
      setMessagesMap((prev) => ({
        ...prev,
        [deleteConvId]: (prev[deleteConvId] || []).filter((m) => m.id !== deleteMessageId),
      }));
      toast.success("Message deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete message");
    } finally {
      setIsDeletingMessage(false);
      setDeleteMessageId(null);
      setDeleteConvId(null);
    }
  };

  const confirmDeleteChat = async () => {
    if (!deleteChatId) return;
    setIsDeletingChat(true);
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", deleteChatId);
      if (error) throw error;
      closeChat(deleteChatId);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("recent-conversations-refresh"));
      }
      toast.success("Chat deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete chat");
    } finally {
      setIsDeletingChat(false);
      setDeleteChatId(null);
    }
  };

  const handleCopyMessage = (content: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(
      () => toast.success("Copied to clipboard"),
      () => toast.error("Copy failed")
    );
  };

  if (!user || hideOnMessagesPage) return null;

  const listPanelWidth = "w-[calc(100vw-2rem)] max-w-[380px]";
  const filteredConvs = listSearch.trim()
    ? conversations.filter(
        (c) =>
          c.partnerDisplayName.toLowerCase().includes(listSearch.toLowerCase()) ||
          (c.lastMessageContent?.toLowerCase().includes(listSearch.toLowerCase()) ?? false)
      )
    : conversations;

  const handleMuteToggle = async (conv: RecentConversation) => {
    const currentMuted = mutedChats[conv.id] ?? !!conv.muted;
    const nextMuted = !currentMuted;
    setMutedChats((prev) => ({ ...prev, [conv.id]: nextMuted }));
    try {
      const { data, error } = await supabase.rpc("toggle_conversation_mute" as any, {
        _conversation_id: conv.id,
      });
      if (error) throw error;
      setMutedChats((prev) => ({ ...prev, [conv.id]: data === true }));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("recent-conversations-refresh"));
      }
      toast.success(data === true ? "Conversation muted" : "Conversation unmuted");
    } catch (e: any) {
      setMutedChats((prev) => {
        const next = { ...prev };
        delete next[conv.id];
        return next;
      });
      toast.error(e?.message ?? "Failed to update mute");
    }
  };

  const handleBlockToggle = async (conv: RecentConversation) => {
    const currentBlocked = blockedChats[conv.id] ?? !!conv.isBlocked;
    const nextBlocked = !currentBlocked;
    setBlockedChats((prev) => ({ ...prev, [conv.id]: nextBlocked }));
    try {
      if (nextBlocked) {
        const { error } = await supabase.rpc("block_conversation_partner" as any, {
          _conversation_id: conv.id,
        });
        if (error) throw error;
        toast.success("User blocked");
      } else {
        if (!conv.partnerUserId) throw new Error("Unable to identify partner user");
        const { error } = await supabase.rpc("unblock_user" as any, {
          _blocked_user_id: conv.partnerUserId,
        });
        if (error) throw error;
        toast.success("User unblocked");
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("recent-conversations-refresh"));
      }
    } catch (e: any) {
      setBlockedChats((prev) => {
        const next = { ...prev };
        delete next[conv.id];
        return next;
      });
      toast.error(e?.message ?? "Failed to update block");
    }
  };

  const handleMarkAsUnread = async (conv: RecentConversation) => {
    const convId = conv.id;
    const previousUnread = unreadOverrides[convId];
    const currentUnread = previousUnread ?? conv.unreadCount;
    const nextUnread = Math.max(1, currentUnread);
    setUnreadOverrides((prev) => ({ ...prev, [convId]: nextUnread }));
    try {
      await supabase.rpc("mark_conversation_messages_unread" as any, {
        _conversation_id: convId,
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("recent-conversations-refresh"));
      }
      toast.success("Marked as unread");
    } catch (e: any) {
      setUnreadOverrides((prev) => {
        const next = { ...prev };
        if (typeof previousUnread === "number") next[convId] = previousUnread;
        else delete next[convId];
        return next;
      });
      toast.error(e?.message ?? "Failed to mark as unread");
    }
  };

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-4 md:p-5 flex flex-row items-end gap-3 pointer-events-none [&>*]:pointer-events-auto">
      {openChats.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl",
            CHAT_BOX_WIDTH,
            collapsedChats[conv.id] ? "h-[56px]" : "h-[min(440px,calc(100vh-10rem))]",
            "transition-[height] duration-200 ease-out",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          {(() => {
            const isMuted = mutedChats[conv.id] ?? !!conv.muted;
            const isBlocked = blockedChats[conv.id] ?? !!conv.isBlocked;
            const unreadTotal = unreadOverrides[conv.id] ?? conv.unreadCount;
            return (
              <>
          {/* Floating message box header: avatar, name, description, three-dot, expand, close */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-chat-actions]")) return;
              setCollapsedChats((prev) => {
                const next = !prev[conv.id];
                if (!next) {
                  setTimeout(() => {
                    scrollToEnd(conv.id);
                  }, 200);
                }
                return { ...prev, [conv.id]: next };
              });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              if ((e.target as HTMLElement).closest("[data-chat-actions]")) return;
              setCollapsedChats((prev) => {
                const next = !prev[conv.id];
                if (!next) {
                  setTimeout(() => {
                    scrollToEnd(conv.id);
                  }, 200);
                }
                return { ...prev, [conv.id]: next };
              });
            }}
            className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/40 bg-muted shrink-0 cursor-pointer rounded-t-2xl"
            aria-label={collapsedChats[conv.id] ? "Expand chat" : "Collapse chat"}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative h-9 w-9 shrink-0">
                <Avatar className="h-9 w-9 ring-1 ring-border/40">
                  <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-1 -right-1 flex items-center gap-1">
                  {isBlocked && (
                    <span className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" title="Blocked">
                      <Ban className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {isMuted && (
                    <span className="h-4 w-4 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center justify-center" title="Muted">
                      <BellOff className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {unreadTotal > 0 && (
                    <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center" title="Unread">
                      <EyeOff className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    getPresenceDotClass(getPartnerPresenceStatus(conv))
                  )}
                  title={
                    getPartnerPresenceStatus(conv) === "online"
                      ? "Online"
                      : getPartnerPresenceStatus(conv) === "away"
                        ? "Away"
                        : "Offline"
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                {conv.partnerProfileUrl ? (
                  <button
                    type="button"
                    className="font-semibold text-sm truncate hover:underline text-left w-fit max-w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(conv.partnerProfileUrl as string);
                    }}
                    title="View profile"
                  >
                    {conv.partnerDisplayName}
                  </button>
                ) : (
                  <h3 className="font-semibold text-sm truncate">{conv.partnerDisplayName}</h3>
                )}
                <p className="text-xs text-muted-foreground truncate mt-0.5" title={conv.partnerJobTitle || (conv.gigId ? "View project" : undefined)}>
                  {conv.gigId ? (
                    <button
                      type="button"
                      className="text-left truncate w-fit max-w-full hover:underline focus:underline focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/gig/${conv.gigId}`);
                      }}
                      title="View project"
                    >
                      {(conv.partnerJobTitle?.trim() || "View project").length > 38
                        ? `${(conv.partnerJobTitle?.trim() || "View project").slice(0, 38)}…`
                        : (conv.partnerJobTitle?.trim() || "View project")}
                    </button>
                  ) : (
                    (conv.partnerJobTitle?.trim() || "Direct message").length > 38
                      ? `${(conv.partnerJobTitle?.trim() || "Direct message").slice(0, 38)}…`
                      : (conv.partnerJobTitle?.trim() || "Direct message")
                  )}
                </p>
              </div>
            </div>
            <div
              data-chat-actions
              className="flex items-center gap-0.5 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu
                modal={false}
                open={openMenuChatId === conv.id}
                onOpenChange={(open) => setOpenMenuChatId(open ? conv.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${openMenuChatId === conv.id ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    title="Chat options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 p-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsUnread(conv);
                    }}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Mark as unread
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMuteToggle(conv);
                    }}
                  >
                    {isMuted
                      ? <Bell className="h-4 w-4 mr-2" />
                      : <BellOff className="h-4 w-4 mr-2" />}
                    {isMuted ? "Unmute" : "Mute"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBlockToggle(conv);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    {isBlocked ? "Unblock" : "Block"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteChatId(conv.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  openFullMessages(conv);
                }}
                title="Open in full page"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  closeChat(conv.id);
                }}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            className={cn(
              "relative flex-1 min-h-0 flex flex-col transition-opacity duration-200 rounded-b-2xl overflow-hidden",
              collapsedChats[conv.id] ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            onDragEnter={(e) => handleConvDragEnter(conv.id, e)}
            onDragOver={(e) => handleConvDragOver(conv.id, e)}
            onDragLeave={(e) => handleConvDragLeave(conv.id, e)}
            onDrop={(e) => handleConvDrop(conv, e)}
          >
            {dragOverConvMap[conv.id] && (
              <div className="absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 backdrop-blur-[1px] pointer-events-none flex items-center justify-center">
                <div className="rounded-xl border border-primary/30 bg-background/90 px-4 py-3 text-center shadow-xl">
                  <UploadCloud className="h-6 w-6 mx-auto text-primary mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">Drop files to attach</p>
                </div>
              </div>
            )}
            <ScrollArea
              ref={(el) => (scrollAreaRefsMap.current[conv.id] = el)}
              className="flex-1 min-h-0 px-3 border-border/30"
            >
              {loadingMap[conv.id] && !(messagesMap[conv.id]?.length) ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !(messagesMap[conv.id]?.length) ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div className="py-3 space-y-2.5">
                  {[...(messagesMap[conv.id] || [])]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((m) => (
                      <MessageBubble
                        key={m.id}
                        content={m.content}
                        timestamp={m.created_at}
                        isOwn={m.sender_id === user.id}
                        isRead={!!m.read_at}
                        attachments={m.attachments}
                        messageId={m.id}
                        onReply={(id, content) => handleReplyToMessage(conv.id, id, content)}
                        onEdit={(id) => handleEditMessage(conv.id, id)}
                        onDelete={(id) => handleDeleteMessage(conv.id, id)}
                        onCopy={handleCopyMessage}
                      />
                    ))}
                  {partnerTypingMap[conv.id] && (
                    <TypingIndicator
                      partnerName={conv.partnerDisplayName}
                      partnerAvatarUrl={conv.partnerAvatarUrl}
                    />
                  )}
                  <div ref={(el) => (endRefsMap.current[conv.id] = el)} />
                </div>
              )}
            </ScrollArea>
            <div className="p-2 border-t border-border/50 bg-background shrink-0 rounded-b-2xl">
              {replyingToMap[conv.id] && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground shrink-0">Replying to:</span>
                  <span className="min-w-0 truncate flex-1">{replyingToMap[conv.id]!.content.split("\n")[0].slice(0, 50)}{replyingToMap[conv.id]!.content.length > 50 ? "…" : ""}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingToMap((prev) => ({ ...prev, [conv.id]: null }))} title="Cancel reply"><X className="h-3 w-3" /></Button>
                </div>
              )}
              {attachmentUploadConvId === conv.id && attachmentUploadProgress != null && (
                <div className="mb-2 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Uploading…</span>
                    <span>{attachmentUploadProgress}%</span>
                  </div>
                  <Progress value={attachmentUploadProgress} className="h-1.5" />
                </div>
              )}
              <MessageInput
                value={inputMap[conv.id] ?? ""}
                onChange={(v) => handleMessageInputChange(conv.id, v)}
                onSend={() => handleSend(conv)}
                onFileSelect={(files, content) => handleSendWithAttachments(conv, files, content)}
                disabled={sendingMap[conv.id]}
                placeholder="Type a message..."
                maxLength={5000}
                maxAutoHeight={floatingInputMaxHeight}
                onInputFocus={() => handleMessageInputFocus(conv.id)}
                className="min-w-0"
                inputRef={(el) => {
                  inputRefsMap.current[conv.id] = el ?? null;
                }}
              />
            </div>
          </div>
              </>
            );
          })()}
        </div>
      ))}

      <div className={cn("hidden md:flex flex-col items-end", listPanelWidth)}>
        <div
          className={cn(
            "flex flex-col overflow-hidden w-full border border-border/60 bg-card shadow-xl rounded-2xl",
            "transition-all duration-300 ease-out origin-bottom",
            isOpen
              ? "h-[min(480px,calc(100vh-10rem))] opacity-100"
              : "h-0 opacity-0 pointer-events-none border-0"
          )}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-2xl">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsOpen(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsOpen(false)}
              className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0 border-b border-primary/30 bg-primary text-primary-foreground cursor-pointer rounded-t-2xl"
              aria-label="Collapse messages"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(MESSAGES_PAGE);
                }}
                className="font-semibold text-sm text-primary-foreground hover:underline text-left"
              >
                Messages
              </button>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 relative text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  onClick={toggleMute}
                  title={soundMuted ? "Unmute notifications" : "Mute notifications"}
                >
                  {soundMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  onClick={() => setIsOpen(false)}
                  title="Collapse messages"
                  aria-label="Collapse messages"
                >
                  <ChevronUp className="h-4 w-4 rotate-180 shrink-0 text-primary-foreground" aria-hidden />
                </Button>
              </div>
            </div>
            <div className="shrink-0 px-3 py-2 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="pl-9 h-9 rounded-lg bg-muted/40 border-border/50 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border/30 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("chats")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  activeTab === "chats"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  activeTab === "requests"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                Requests
              </button>
            </div>
            <ScrollArea className="flex-1 min-w-0 max-w-full overflow-hidden">
              {activeTab === "requests" ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">View all requests in Messages</p>
                  <Button variant="link" className="text-primary" onClick={() => openFullMessages()}>
                    Open Messages
                  </Button>
                </div>
              ) : convLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredConvs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">{listSearch.trim() ? "No matches." : "No conversations yet"}</p>
                  {!listSearch.trim() && (
                    <Button variant="link" className="mt-2 text-primary" onClick={() => openFullMessages()}>
                      Go to Messages
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="py-2 min-w-0 max-w-full overflow-hidden">
                  {filteredConvs.map((c) => {
                    const snippet = (c.lastMessageFromMe ? "You: " : "") + (c.lastMessageContent || "No messages");
                    const display = snippet;
                    const isOpenChat = openChats.some((o) => o.id === c.id);
                    const isMuted = mutedChats[c.id] ?? !!c.muted;
                    const isBlocked = blockedChats[c.id] ?? !!c.isBlocked;
                    const unreadTotal = unreadOverrides[c.id] ?? c.unreadCount;
                    return (
                      <li key={c.id} className="min-w-0 max-w-full overflow-hidden list-none">
                        <button
                          type="button"
                          className="w-full max-w-full min-w-0 flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left overflow-hidden"
                          onClick={() => openChat(c)}
                        >
                          <div className="relative h-10 w-10 shrink-0 flex-shrink-0">
                            <Avatar className="h-10 w-10 ring-1 ring-border/50">
                              <AvatarImage src={c.partnerAvatarUrl || undefined} alt="" />
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {c.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -top-1 -right-1 flex items-center gap-1">
                              {isBlocked && (
                                <span className="h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center" title="Blocked">
                                  <Ban className="h-2.5 w-2.5" />
                                </span>
                              )}
                              {isMuted && (
                                <span className="h-4 w-4 rounded-full bg-muted text-muted-foreground border border-border/60 flex items-center justify-center" title="Muted">
                                  <BellOff className="h-2.5 w-2.5" />
                                </span>
                              )}
                              {unreadTotal > 0 && (
                                <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center" title="Unread">
                                  <EyeOff className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </div>
                            <span
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                                getPresenceDotClass(getPartnerPresenceStatus(c))
                              )}
                              title={
                                getPartnerPresenceStatus(c) === "online"
                                  ? "Online"
                                  : getPartnerPresenceStatus(c) === "away"
                                    ? "Away"
                                    : "Offline"
                              }
                            />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden basis-0">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate min-w-0" title={c.partnerDisplayName}>
                                {c.partnerDisplayName}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  {isBlocked && <Ban className="h-3.5 w-3.5" title="Blocked" />}
                                  {isMuted && <BellOff className="h-3.5 w-3.5" title="Muted" />}
                                  {unreadTotal > 0 && <EyeOff className="h-3.5 w-3.5" title="Unread" />}
                                </div>
                                {unreadTotal > 0 && (
                                  <span
                                    className="h-5 min-w-[1.25rem] px-1 rounded-md bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center"
                                    title={`${unreadTotal} unread`}
                                  >
                                    {unreadTotal > 99 ? "99+" : unreadTotal}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums min-w-[2.5rem] text-right">
                                  {format(new Date(c.updatedAt), "HH:mm")}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground truncate min-w-0" title={c.lastMessageContent || undefined}>
                              {display}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </div>
        </div>

        {!isOpen && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && setIsOpen(true)}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2.5 w-full cursor-pointer shrink-0",
              "rounded-2xl border border-primary/30 bg-primary text-primary-foreground shadow-xl hover:shadow-2xl transition-shadow"
            )}
            aria-label="Open messages"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(MESSAGES_PAGE);
              }}
              className="font-semibold text-sm text-primary-foreground hover:underline text-left"
            >
              Messages
            </button>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 relative text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={toggleMute}
                title={soundMuted ? "Unmute notifications" : "Mute notifications"}
              >
                {soundMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                onClick={() => setIsOpen(true)}
                title="Open messages"
                aria-label="Open messages"
              >
                <ChevronUp className="h-4 w-4 text-primary-foreground shrink-0" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit message dialog */}
      <Dialog open={!!editingMessageId} onOpenChange={(open) => !open && (setEditingMessageId(null), setEditingConvId(null))}>
        <DialogContent className="sm:max-w-md data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[50%]">
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
              <Button variant="outline" onClick={() => { setEditingMessageId(null); setEditingConvId(null); }}>Cancel</Button>
              <Button onClick={updateMessage}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete message confirmation */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={(open) => !open && (setDeleteMessageId(null), setDeleteConvId(null))}>
        <AlertDialogContent className="data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[50%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>This message will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMessage}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); confirmDeleteMessage(); }}
            >
              {isDeletingMessage ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete chat confirmation */}
      <AlertDialog open={!!deleteChatId} onOpenChange={(open) => !open && setDeleteChatId(null)}>
        <AlertDialogContent className="data-[state=closed]:animate-none data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-100 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[50%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>This chat and all messages will be permanently removed. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingChat}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); confirmDeleteChat(); }}
            >
              {isDeletingChat ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
