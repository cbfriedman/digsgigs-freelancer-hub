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
import { MessageCircle, Send, Loader2, ChevronUp, ExternalLink, MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000, "Message too long");

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

const MESSAGES_PAGE = "/messages";
const CHAT_BOX_WIDTH = "w-[320px]";
const MAX_OPEN_CHATS = 4;

export function FloatingMessageWidget() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { conversations, loading: convLoading } = useRecentConversations(user ?? null);
  const unreadCount = useUnreadMessagesCount();

  const [isOpen, setIsOpen] = useState(false);
  const [openChats, setOpenChats] = useState<RecentConversation[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [inputMap, setInputMap] = useState<Record<string, string>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const channelsRef = useRef<Record<string, ReturnType<typeof supabase.channel>>>({});
  const endRefsMap = useRef<Record<string, HTMLDivElement | null>>({});

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

  const getUserInitials = () => {
    const name = (user as any)?.user_metadata?.full_name || user?.email?.split("@")[0] || "?";
    return String(name)
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

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
        await supabase.rpc("mark_conversation_messages_read" as any, {
          _conversation_id: convId,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to load messages");
      } finally {
        setLoadingMap((prev) => ({ ...prev, [convId]: false }));
      }
    },
    [user?.id]
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
    (conv: RecentConversation) => {
      setOpenChats((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        if (exists) return prev;
        const next = [...prev, conv].slice(-MAX_OPEN_CHATS);
        return next;
      });
      loadMessages(conv.id);
      subscribeToMessages(conv.id);
    },
    [loadMessages, subscribeToMessages]
  );

  const closeChat = useCallback((convId: string) => {
    setOpenChats((prev) => prev.filter((c) => c.id !== convId));
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
    openChats.forEach((c) => {
      const el = endRefsMap.current[c.id];
      el?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [openChats, messagesMap]);

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
      }
    },
    [user?.id, inputMap]
  );

  const openFullMessages = (conv?: RecentConversation) => {
    setIsOpen(false);
    navigate(conv ? `/messages?conversation=${conv.id}` : "/messages");
  };

  if (!user || hideOnMessagesPage) return null;

  const listPanelWidth = "w-[calc(100vw-2rem)] max-w-[360px]";

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-4 md:p-5 flex flex-row items-end gap-2 pointer-events-none [&>*]:pointer-events-auto">
      {/* Open chat boxes - left to right in order */}
      {openChats.map((conv) => (
        <div
          key={conv.id}
          className={cn(
            "flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-border/60 bg-card shadow-xl",
            CHAT_BOX_WIDTH,
            "h-[min(420px,calc(100vh-10rem))]",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-background shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border/50">
                <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-sm truncate">{conv.partnerDisplayName}</h3>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFullMessages(conv)} title="Open full">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => closeChat(conv.id)} title="Close">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 min-h-0 px-3">
              {loadingMap[conv.id] ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !(messagesMap[conv.id]?.length) ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div className="py-3 space-y-2">
                  {(messagesMap[conv.id] || []).map((m) => {
                    const isOwn = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "min-w-0 max-w-[85%] overflow-hidden rounded-2xl px-3 py-2 text-sm",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          <p className="break-words whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</p>
                          <p
                            className={cn(
                              "text-[10px] mt-0.5",
                              isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
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
            <div className="p-2 border-t bg-background shrink-0">
              <div className="flex gap-2">
                <Input
                  value={inputMap[conv.id] ?? ""}
                  onChange={(e) => setInputMap((prev) => ({ ...prev, [conv.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(conv);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 text-foreground text-sm h-9"
                  disabled={sendingMap[conv.id]}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                  onClick={() => handleSend(conv)}
                  disabled={!(inputMap[conv.id] ?? "").trim() || sendingMap[conv.id]}
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

      {/* Main panel: conversation list */}
      <div className={cn("flex flex-col items-end", listPanelWidth)}>
        <div
          className={cn(
            "flex flex-col overflow-hidden w-full rounded-t-xl border-x border-t border-border/60 bg-card shadow-xl",
            "transition-all duration-300 ease-out origin-bottom",
            isOpen ? "max-h-[min(480px,calc(100vh-10rem))] opacity-100" : "max-h-0 opacity-0 pointer-events-none border-0"
          )}
        >
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                    <AvatarImage src={userAvatarUrl || undefined} alt="" />
                    <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  {unreadCount > 0 && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>
                <h3 className="font-semibold text-sm">Messaging</h3>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openFullMessages()}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open full Messages
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openFullMessages()} title="Open in new view">
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)} title="Minimize">
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ScrollArea className="flex-1 min-w-0 overflow-hidden">
              {convLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <Button variant="link" className="mt-2 text-primary" onClick={() => openFullMessages()}>
                    Go to Messages
                  </Button>
                </div>
              ) : (
                <ul className="py-2 min-w-0 overflow-hidden">
                  {conversations.map((c) => {
                    const snippet = (c.lastMessageFromMe ? "You: " : "") + (c.lastMessageContent || "No messages");
                    const display = snippet.length > 55 ? snippet.slice(0, 55) + "…" : snippet;
                    const isOpenChat = openChats.some((o) => o.id === c.id);
                    return (
                      <li key={c.id} className="min-w-0 overflow-hidden">
                        <button
                          type="button"
                          className="w-full min-w-0 flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left overflow-hidden"
                          onClick={() => openChat(c)}
                        >
                          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
                            <AvatarImage src={c.partnerAvatarUrl || undefined} alt="" />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {c.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-medium text-sm truncate min-w-0">{c.partnerDisplayName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(c.updatedAt), "HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate min-w-0" title={c.lastMessageContent || undefined}>
                              {display}
                            </p>
                          </div>
                          {c.unreadCount > 0 && !isOpenChat && (
                            <span className="h-2.5 min-w-[10px] rounded-full bg-primary shrink-0" />
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

        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            "flex items-center justify-between gap-2.5 px-3 py-2 w-full",
            "rounded-t-xl rounded-b-md border border-border/60 bg-card shadow-lg",
            "hover:bg-muted/50 transition-colors"
          )}
          aria-label={isOpen ? "Minimize messages" : "Open messages"}
        >
          <div className="relative">
            <Avatar className="h-9 w-9 ring-1 ring-border/50">
              <AvatarImage src={userAvatarUrl || undefined} alt="" />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">{getUserInitials()}</AvatarFallback>
            </Avatar>
            {unreadCount > 0 && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
            )}
          </div>
          <span className="font-medium text-sm text-foreground hidden sm:inline">Messaging</span>
          <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          {unreadCount > 0 && (
            <span className="h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
