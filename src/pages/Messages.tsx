import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, MessageSquare, Mail, Copy, Check, Inbox, Shield, Clock, Users, UserPlus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
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
import PageLayout from "@/components/layout/PageLayout";

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

  const isAdmin = userRoles.includes("admin");

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
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          gigs(title),
          digger_profiles(handle, profession)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      const list = (data as Conversation[]) || [];

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
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);

      // Mark messages as read
      if (currentUser?.id) {
        await supabase
          .from("messages")
          .update({ read_at: new Date().toISOString() })
          .eq("conversation_id", conversationId)
          .neq("sender_id", currentUser.id)
          .is("read_at", null);
      }
    } catch (error: any) {
      toast({
        title: "Error loading messages",
        description: error.message,
        variant: "destructive",
      });
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
          setMessages((prev) => [...prev, payload.new as Message]);
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

      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConversation,
        sender_id: currentUser.id,
        content: validated.content,
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

  if (loading) {
    return (
      <PageLayout>
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
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-muted-foreground mt-2">
                Communicate securely with clients and professionals
              </p>
            </div>
            
            {/* Trust Indicators + Admin Chat with user */}
            <div className="flex flex-wrap items-center gap-3">
              {isAdmin && (
                <Dialog open={adminChatOpen} onOpenChange={setAdminChatOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Chat with user
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Chat with any user</DialogTitle>
                      <DialogDescription>
                        Search by name and start a support conversation. The user will see it in their Messages.
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
                            {userSearch.trim() ? "No users found. Try a different name." : "Type a name and search."}
                          </p>
                        )}
                        {userSearchLoading && (
                          <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
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
                            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
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
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400">
                <Shield className="h-3.5 w-3.5" />
                Private & Secure
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400">
                <Mail className="h-3.5 w-3.5" />
                Email Integration
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)] animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {/* Conversations List */}
          <Card className="lg:col-span-1 border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/30 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-primary" />
                  Inbox
                </CardTitle>
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {conversations.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-380px)]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2">No conversations yet</h3>
                    <p className="text-sm text-muted-foreground">
                      When you connect with clients or professionals, your messages will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-4 cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                          selectedConversation === conv.id 
                            ? "bg-primary/5 border-l-2 border-l-primary" 
                            : "hover:border-l-2 hover:border-l-transparent"
                        }`}
                        onClick={() => setSelectedConversation(conv.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-border/50">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getConversationPartner(conv)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-foreground truncate">
                                {getConversationPartner(conv)}
                              </p>
                              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(conv.updated_at), {
                                  addSuffix: true,
                                }).replace("about ", "")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {conv?.admin_id ? "Support chat" : (conv?.gigs?.title || "General inquiry")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages View */}
          <Card className="lg:col-span-2 border-border/50 shadow-sm overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <CardHeader className="border-b border-border/50 bg-muted/30 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-border/50">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getConversationPartner(
                            conversations.find((c) => c.id === selectedConversation)
                          )[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {getConversationPartner(
                            conversations.find((c) => c.id === selectedConversation)
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            const sel = conversations.find((c) => c.id === selectedConversation);
                            return sel?.admin_id
                              ? "Support chat"
                              : (sel?.gigs?.title || "General inquiry");
                          })()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1.5 bg-background">
                      <MessageSquare className="h-3 w-3" />
                      In-App + Email
                    </Badge>
                  </div>
                  
                  {/* Proxy Email Section */}
                  <TooltipProvider>
                    <div className="flex flex-col sm:flex-row gap-3 p-3 bg-gradient-to-r from-blue-500/5 to-primary/5 rounded-lg border border-primary/10">
                      {partnerProxyEmail && (
                        <div className="flex items-center gap-2 flex-1">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">Contact via email</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 rounded text-xs font-mono truncate max-w-[200px] border border-border/50">
                                {partnerProxyEmail}
                              </code>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => copyToClipboard(partnerProxyEmail)}
                                  >
                                    {copiedEmail === partnerProxyEmail ? (
                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy email</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      )}
                      {myProxyEmail && (
                        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-border/50 pt-3 sm:pt-0 sm:pl-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">Your proxy email</p>
                            <div className="flex items-center gap-2">
                              <code className="bg-background px-2 py-1 rounded text-xs font-mono truncate max-w-[150px] border border-border/50">
                                {myProxyEmail}
                              </code>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => copyToClipboard(myProxyEmail)}
                                  >
                                    {copiedEmail === myProxyEmail ? (
                                      <Check className="h-3.5 w-3.5 text-green-500" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy your proxy email</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                </CardHeader>

                {/* Messages List */}
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-520px)] p-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="h-12 w-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                            <MessageSquare className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation!
                          </p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${
                              msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                                msg.sender_id === currentUser?.id
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-muted border border-border/50 rounded-bl-md"
                              }`}
                            >
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                              <p className={`text-xs mt-1.5 ${
                                msg.sender_id === currentUser?.id 
                                  ? "text-primary-foreground/70" 
                                  : "text-muted-foreground"
                              }`}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t border-border/50 bg-muted/30">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        maxLength={5000}
                        className="pr-16 bg-background border-border/50 focus-visible:ring-primary/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {newMessage.length}/5000
                      </span>
                    </div>
                    <Button 
                      onClick={sendMessage} 
                      size="icon"
                      disabled={!newMessage.trim()}
                      className="shrink-0 shadow-sm"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Shield className="h-3 w-3 inline mr-1" />
                    Messages are private and only visible to you and the recipient
                  </p>
                </div>
              </>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center max-w-sm">
                  <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-6">
                    <MessageSquare className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start messaging securely with clients or professionals.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
