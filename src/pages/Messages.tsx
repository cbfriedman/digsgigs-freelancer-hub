import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, MessageSquare, Mail, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { Navigation } from "@/components/Navigation";
import { useProxyEmail } from "@/hooks/useProxyEmail";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// SECURITY: Input validation schema
const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(5000, "Message must be less than 5000 characters"),
});

interface Conversation {
  id: string;
  gig_id: string;
  consumer_id: string;
  digger_id: string;
  updated_at: string;
  gigs: {
    title: string;
  } | null;
  digger_profiles: {
    handle: string;
    profession: string;
  } | null;
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

  // Get current user's proxy email
  const { proxyEmail: myProxyEmail } = useProxyEmail(currentUser?.id || null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

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

    // Get the other user's ID
    const partnerId = currentUser.id === conv.consumer_id 
      ? conv.digger_id // Partner is the digger - need to get user_id from digger_profiles
      : conv.consumer_id;

    if (!partnerId) return;

    try {
      // If current user is consumer, partner is digger - need to get digger's user_id
      let partnerUserId = partnerId;
      
      if (currentUser.id === conv.consumer_id && conv.digger_id) {
        const { data: diggerProfile } = await supabase
          .from('digger_profiles')
          .select('user_id')
          .eq('id', conv.digger_id)
          .single();
        
        if (diggerProfile) {
          partnerUserId = diggerProfile.user_id;
        }
      }

      const { data, error } = await supabase.functions.invoke('get-proxy-email', {
        body: { user_id: partnerUserId }
      });

      if (!error && data?.proxy_email) {
        setPartnerProxyEmail(data.proxy_email);
      }
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
      setConversations((data as Conversation[]) || []);
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

  const getConversationPartner = (conv: Conversation) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgigs
          </h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold">Messages</h2>
              </div>
              <ScrollArea className="h-[calc(100vh-280px)]">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                        selectedConversation === conv.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getConversationPartner(conv)[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {getConversationPartner(conv)}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.gigs?.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conv.updated_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Messages View */}
          <Card className="lg:col-span-2">
            {selectedConversation ? (
              <CardContent className="p-0 flex flex-col h-full">
                <div className="p-4 border-b border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">
                      {conversations.find((c) => c.id === selectedConversation)?.gigs?.title || "Conversation"}
                    </h3>
                    <Badge variant="outline" className="text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      In-App + Email
                    </Badge>
                  </div>
                  
                  {/* Proxy Email Section */}
                  <TooltipProvider>
                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                      {partnerProxyEmail && (
                        <div className="flex items-center gap-2 flex-1">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Contact via email:</span>
                          <code className="bg-background px-2 py-0.5 rounded text-xs truncate max-w-[200px]">
                            {partnerProxyEmail}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(partnerProxyEmail)}
                              >
                                {copiedEmail === partnerProxyEmail ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy email</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                      {myProxyEmail && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-2">
                          <span>Your proxy:</span>
                          <code className="bg-background px-2 py-0.5 rounded truncate max-w-[150px]">
                            {myProxyEmail}
                          </code>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(myProxyEmail)}
                              >
                                {copiedEmail === myProxyEmail ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy your proxy email</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                </div>
                <ScrollArea className="flex-1 p-4 h-[calc(100vh-400px)]">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`mb-4 flex ${
                        msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.sender_id === currentUser?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                <div className="p-4 border-t border-border">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                        maxLength={5000}
                      />
                      <Button onClick={sendMessage} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {newMessage.length}/5000 characters
                    </p>
                  </div>
                </div>
              </CardContent>
            ) : (
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
