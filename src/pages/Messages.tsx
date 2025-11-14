import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    }
  }, [selectedConversation]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations" as any)
        .select(`
          *,
          gigs(title),
          digger_profiles(handle, profession)
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setConversations(data as any || []);
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
        .from("messages" as any)
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data as any || []);

      // Mark messages as read
      await supabase
        .from("messages" as any)
        .update({ read_at: new Date().toISOString() } as any)
        .eq("conversation_id", conversationId)
        .neq("sender_id", currentUser?.id)
        .is("read_at", null);
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
      const { error } = await supabase.from("messages" as any).insert({
        conversation_id: selectedConversation,
        sender_id: currentUser?.id,
        content: newMessage.trim(),
      } as any);

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getConversationPartner = (conv: Conversation) => {
    if (currentUser?.id === conv.consumer_id) {
      return conv.digger_profiles?.handle || "Unknown Digger";
    }
    return "Client";
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
            digsandgiggs
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
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">
                    {conversations.find((c) => c.id === selectedConversation)?.gigs?.title || "Conversation"}
                  </h3>
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
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
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
