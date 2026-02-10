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
import { MessageCircle, Send, ArrowLeft, Loader2, ChevronUp, ExternalLink, MoreHorizontal } from "lucide-react";
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

export function FloatingMessageWidget() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { conversations, loading: convLoading } = useRecentConversations(user ?? null);
  const unreadCount = useUnreadMessagesCount();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<RecentConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      setLoadingMessages(true);
      try {
        const { data, error } = await supabase.rpc("get_conversation_messages" as any, {
          _conversation_id: convId,
        });
        if (error) throw error;
        setMessages((data as Message[]) || []);
        await supabase.rpc("mark_conversation_messages_read" as any, {
          _conversation_id: convId,
        });
      } catch (e: any) {
        toast.error(e?.message || "Failed to load messages");
      } finally {
        setLoadingMessages(false);
      }
    },
    [user?.id]
  );

  const subscribeToMessages = useCallback((convId: string) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel(`float-msg:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    channelRef.current = channel;
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
      subscribeToMessages(selectedConv.id);
    } else {
      setMessages([]);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedConv?.id, loadMessages, subscribeToMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedConv || !user?.id) return;
    const parsed = messageSchema.safeParse(trimmed);
    if (!parsed.success) {
      toast.error("Message must be 1-5000 characters");
      return;
    }
    setSending(true);
    setInput("");
    try {
      const { data: messageId, error } = await supabase.rpc("send_message" as any, {
        _conversation_id: selectedConv.id,
        _content: parsed.data,
        _attachments: [],
      });
      if (error) throw error;
      if (messageId) {
        supabase.functions
          .invoke("enqueue-message-notification", {
            body: { conversation_id: selectedConv.id, message_id: messageId },
          })
          .catch(() => {});
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openFullMessages = () => {
    setIsOpen(false);
    navigate(selectedConv ? `/messages?conversation=${selectedConv.id}` : "/messages");
  };

  if (!user || hideOnMessagesPage) return null;

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-4 md:p-5 flex flex-col items-end gap-0 pointer-events-none [&>*]:pointer-events-auto">
      {/* Chat panel - opens upward, above the trigger */}
      {isOpen && (
        <div
          className={cn(
            "flex flex-col overflow-hidden mb-2",
            "w-[calc(100vw-2rem)] max-w-[400px] h-[min(480px,calc(100vh-10rem))]",
            "rounded-t-xl rounded-b-none border border-b-0 border-border/60 bg-card shadow-2xl",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          )}
        >
          {/* Header - matches reference: avatar, title, ellipsis, external link, minimize */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {selectedConv ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 -ml-1"
                  onClick={() => setSelectedConv(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              <div className="relative">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                  <AvatarImage src={(selectedConv?.partnerAvatarUrl || userAvatarUrl) || undefined} alt="" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {(selectedConv?.partnerDisplayName?.[0] ?? getUserInitials()[0])?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                {(unreadCount > 0 || (selectedConv && selectedConv.unreadCount > 0)) && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                )}
              </div>
              <h3 className="font-semibold text-sm truncate">
                {selectedConv ? selectedConv.partnerDisplayName : "Messaging"}
              </h3>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openFullMessages}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open full Messages
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={openFullMessages}
                title="Open in new view"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
                title="Minimize"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 flex flex-col">
            {!selectedConv ? (
              /* Conversation list */
              <ScrollArea className="flex-1">
                {convLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No conversations yet</p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={openFullMessages}
                    >
                      Go to Messages
                    </Button>
                  </div>
                ) : (
                  <ul className="py-2">
                    {conversations.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                          onClick={() => setSelectedConv(c)}
                        >
                          <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
                            <AvatarImage src={c.partnerAvatarUrl || undefined} alt="" />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {c.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">{c.partnerDisplayName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {format(new Date(c.updatedAt), "HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {c.lastMessageFromMe ? "You: " : ""}
                              {c.lastMessageContent || "No messages"}
                            </p>
                          </div>
                          {c.unreadCount > 0 && (
                            <span className="h-2.5 min-w-[10px] rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            ) : (
              /* Chat view */
              <>
                <ScrollArea className="flex-1 px-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                      No messages yet. Say hello!
                    </div>
                  ) : (
                    <div className="py-4 space-y-3">
                      {messages.map((m) => {
                        const isOwn = m.sender_id === user.id;
                        return (
                          <div
                            key={m.id}
                            className={cn(
                              "flex",
                              isOwn ? "justify-end" : "justify-start"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted rounded-bl-md"
                              )}
                            >
                              <p className="break-words whitespace-pre-wrap">{m.content}</p>
                              <p
                                className={cn(
                                  "text-[10px] mt-1",
                                  isOwn ? "text-primary-foreground/80" : "text-muted-foreground"
                                )}
                              >
                                {format(new Date(m.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t bg-background shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1"
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="shrink-0 rounded-full"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Trigger bar - locked at bottom, LinkedIn-style: avatar + Messaging + chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-t-xl rounded-b-md",
          "bg-card border border-b-0 border-border/60 shadow-lg hover:shadow-xl",
          "transition-all duration-200 hover:bg-muted/50",
          isOpen && "rounded-b-none"
        )}
        aria-label={isOpen ? "Minimize messages" : "Open messages"}
      >
        <div className="relative">
          <Avatar className="h-9 w-9 ring-1 ring-border/50">
            <AvatarImage src={userAvatarUrl || undefined} alt="" />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          {unreadCount > 0 && (
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>
        <span className="font-medium text-sm text-foreground hidden sm:inline">Messaging</span>
        <ChevronUp
          className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")}
        />
        {unreadCount > 0 && (
          <span className="h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary text-[11px] font-semibold text-primary-foreground flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
