import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentConversations, type RecentConversation } from "@/hooks/useRecentConversations";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
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
  Search,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from "sonner";
import { isNotificationMuted, setNotificationMuted } from "@/lib/notificationSound";

const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000, "Message too long");

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

const MESSAGES_PAGE = "/messages";
const CHAT_BOX_WIDTH = "w-[340px]";
const MAX_OPEN_CHATS = 4;

export function FloatingMessageWidget() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { conversations, loading: convLoading } = useRecentConversations(user ?? null);
  const unreadCount = useUnreadMessagesCount();

  const [isOpen, setIsOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => isNotificationMuted());
  const [listSearch, setListSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"chats" | "requests">("chats");
  const [openChats, setOpenChats] = useState<RecentConversation[]>([]);
  const [collapsedChats, setCollapsedChats] = useState<Record<string, boolean>>({});
  const [archivedChats, setArchivedChats] = useState<Record<string, boolean>>({});
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>({});
  const [blockedChats, setBlockedChats] = useState<Record<string, boolean>>({});
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
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const channelsRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({});
  const endRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefsMap = useRef<Record<string, HTMLInputElement | null>>({});
  const scrollAreaRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingAutoScrollRef = useRef<Record<string, boolean>>({});
  const conversationsRef = useRef<RecentConversation[]>([]);
  const openChatRef = useRef<(conv: RecentConversation, bringToFront?: boolean) => void>(() => {});
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;

  const hideOnMessagesPage = pathname === MESSAGES_PAGE;
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

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
    async (convId: string) => {
      if (!user?.id) return;
      setLoadingMap((prev) => ({ ...prev, [convId]: true }));
      try {
        const { data, error } = await supabase.rpc("get_conversation_messages" as any, {
          _conversation_id: convId,
        });
        if (error) throw error;
        setMessagesMap((prev) => ({ ...prev, [convId]: (data as Message[]) || [] }));
        requestAnimationFrame(() => {
          scrollToEnd(convId);
        });
        await supabase.rpc("mark_conversation_messages_read" as any, {
          _conversation_id: convId,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to load messages");
      } finally {
        setLoadingMap((prev) => ({ ...prev, [convId]: false }));
      }
    },
    [user?.id, scrollToEnd]
  );

  const subscribeToMessages = useCallback((convId: string) => {
    if (channelsRef.current[convId]) return;
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
        }
      )
      .subscribe();
    channelsRef.current[convId] = channel;
  }, []);

  const openChat = useCallback(
    (conv: RecentConversation, bringToFront = false) => {
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
        loadMessages(conv.id);
        subscribeToMessages(conv.id);
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
  }, []);

  useEffect(() => {
    return () => {
      Object.values(channelsRef.current).forEach((ch) => {
        if (ch) supabase.removeChannel(ch);
      });
      channelsRef.current = {};
    };
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
          const msg = payload.new as { conversation_id: string; sender_id: string };
          const uid = userIdRef.current;
          if (!uid || msg.sender_id === uid) return;
          setIsOpen(true);
          const conv = conversationsRef.current.find((c) => c.id === msg.conversation_id);
          if (conv) {
            openChatRef.current(conv, true);
          } else {
            setTimeout(() => {
              const latest = conversationsRef.current.find((c) => c.id === msg.conversation_id);
              if (latest) openChatRef.current(latest, true);
            }, 300);
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

  const handleSend = useCallback(
    async (conv: RecentConversation) => {
      const trimmed = (inputMap[conv.id] ?? "").trim();
      if (!trimmed || !user?.id) return;
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
          setMessagesMap((prev) => ({
            ...prev,
            [conv.id]: (prev[conv.id] || []).map((m) =>
              m.id === tempId ? { ...m, id: String(messageId), created_at: new Date().toISOString() } : m
            ),
          }));
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
        requestAnimationFrame(() => {
          inputRefsMap.current[conv.id]?.focus();
        });
      }
    },
    [user?.id, inputMap]
  );

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
            className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/50 bg-background/95 shrink-0 cursor-pointer rounded-t-2xl"
            aria-label={collapsedChats[conv.id] ? "Expand chat" : "Collapse chat"}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/40">
                <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {conv.partnerProfileUrl ? (
                  <button
                    type="button"
                    className="font-semibold text-sm truncate hover:underline text-left block w-full"
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
                      className="text-left truncate block w-full hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/gig/${conv.gigId}`);
                      }}
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
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerEnter={() => setOpenMenuChatId(conv.id)}
                    title="Chat options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-52 p-2"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerLeave={() => setOpenMenuChatId(null)}
                >
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <span className="text-sm">Archive chat</span>
                    <Switch
                      checked={!!archivedChats[conv.id]}
                      onCheckedChange={(checked) =>
                        setArchivedChats((prev) => ({ ...prev, [conv.id]: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <span className="text-sm">Mute notifications</span>
                    <Switch
                      checked={!!mutedChats[conv.id]}
                      onCheckedChange={(checked) =>
                        setMutedChats((prev) => ({ ...prev, [conv.id]: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                    <span className="text-sm">Block user</span>
                    <Switch
                      checked={!!blockedChats[conv.id]}
                      onCheckedChange={(checked) =>
                        setBlockedChats((prev) => ({ ...prev, [conv.id]: checked }))
                      }
                    />
                  </div>
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
              "flex-1 min-h-0 flex flex-col transition-opacity duration-200 rounded-b-2xl overflow-hidden",
              collapsedChats[conv.id] ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <ScrollArea
              ref={(el) => (scrollAreaRefsMap.current[conv.id] = el)}
              className="flex-1 min-h-0 px-3 border-border/30"
            >
              {loadingMap[conv.id] ? (
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
                    .map((m) => {
                      const isOwn = m.sender_id === user.id;
                      const showActions = isOwn && !m.id.startsWith("temp-");
                      return (
                        <div key={m.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                          <div
                            className={cn(
                              "group relative min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-3 py-2.5 text-sm shadow-sm",
                              showActions && "pr-10",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md border border-border/40"
                            )}
                          >
                            {showActions && (
                              <div className="absolute top-1.5 right-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-7 w-7",
                                        isOwn
                                          ? "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/20"
                                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                      title="Message options"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 bg-popover">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditMessage(conv.id, m.id);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyMessage(m.content || "");
                                      }}
                                    >
                                      <Copy className="h-4 w-4 mr-2" />
                                      Copy
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteMessage(conv.id, m.id);
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                            <p className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {format(new Date(m.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  <div ref={(el) => (endRefsMap.current[conv.id] = el)} />
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t border-border/50 bg-background shrink-0 rounded-b-2xl">
              <div className="flex gap-2 items-center">
                <Input
                  ref={(el) => (inputRefsMap.current[conv.id] = el)}
                  value={inputMap[conv.id] ?? ""}
                  onChange={(e) => setInputMap((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(conv);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 text-foreground text-sm h-10 rounded-xl border-border/60"
                  disabled={sendingMap[conv.id]}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => handleSend(conv)}
                  disabled={!(inputMap[conv.id] ?? "").trim() || sendingMap[conv.id]}
                  title="Send"
                >
                  {sendingMap[conv.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className={cn("flex flex-col items-end", listPanelWidth)}>
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
              className="flex items-center justify-between gap-3 px-4 py-2.5 shrink-0 border-b border-border/50 bg-background/95 cursor-pointer rounded-t-2xl"
              aria-label="Collapse messages"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(MESSAGES_PAGE);
                }}
                className="font-semibold text-sm text-foreground hover:underline text-left"
              >
                Messages
              </button>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 relative"
                  onClick={toggleMute}
                  title={soundMuted ? "Unmute notifications" : "Mute notifications"}
                >
                  {soundMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </Button>
                <ChevronUp className="h-4 w-4 rotate-180 shrink-0 text-muted-foreground" aria-hidden />
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
                    const display = snippet.length > 45 ? snippet.slice(0, 45) + "…" : snippet;
                    const isOpenChat = openChats.some((o) => o.id === c.id);
                    return (
                      <li key={c.id} className="min-w-0 max-w-full overflow-hidden list-none">
                        <button
                          type="button"
                          className="w-full max-w-full min-w-0 flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left overflow-hidden"
                          onClick={() => openChat(c)}
                        >
                          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50 flex-shrink-0">
                            <AvatarImage src={c.partnerAvatarUrl || undefined} alt="" />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {c.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 overflow-hidden basis-0">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate min-w-0">{c.partnerDisplayName}</span>
                              <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap tabular-nums min-w-[2.5rem] text-right">
                                {format(new Date(c.updatedAt), "HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate min-w-0" title={c.lastMessageContent || undefined}>
                              {display}
                            </p>
                          </div>
                          {c.unreadCount > 0 && !isOpenChat && (
                            <span className="h-2.5 min-w-[10px] rounded-full bg-primary shrink-0 flex-shrink-0" />
                          )}
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
              "rounded-2xl border border-border/60 bg-card shadow-xl hover:shadow-2xl transition-shadow"
            )}
            aria-label="Open messages"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(MESSAGES_PAGE);
              }}
              className="font-semibold text-sm text-foreground hover:underline text-left"
            >
              Messages
            </button>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 relative"
                onClick={toggleMute}
                title={soundMuted ? "Unmute notifications" : "Mute notifications"}
              >
                {soundMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </Button>
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        )}
      </div>

      {/* Edit message dialog */}
      <Dialog open={!!editingMessageId} onOpenChange={(open) => !open && (setEditingMessageId(null), setEditingConvId(null))}>
        <DialogContent className="sm:max-w-md">
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
        <AlertDialogContent>
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
    </div>
  );
}
