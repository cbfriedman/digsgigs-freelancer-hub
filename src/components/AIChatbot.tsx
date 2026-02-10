import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Send, Bot, User, Trash2, Loader2 } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Generate or retrieve session ID for anonymous users
const getSessionId = () => {
  let sessionId = localStorage.getItem("chatbot_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("chatbot_session_id", sessionId);
  }
  return sessionId;
};

interface AIChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChatbot({ isOpen, onClose }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadChatHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      const query = supabase
        .from("chat_messages")
        .select("role, content")
        .order("created_at", { ascending: true })
        .limit(50);

      if (user) {
        query.eq("user_id", user.id);
      } else {
        query.eq("session_id", sessionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading chat history:", error);
      } else if (data && data.length > 0) {
        setMessages(data.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        })));
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Load chat history when chatbot opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadChatHistory();
    }
  }, [isOpen, messages.length, loadChatHistory]);

  // Scroll to bottom as AI output grows (streaming) and when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isLoading ? "auto" : "smooth", block: "end" });
  }, [messages, isLoading]);

  // Keep focus on input when chat is open so users can type immediately
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isLoading) inputRef.current?.focus();
  }, [isOpen, isLoading]);


  const clearChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const sessionId = getSessionId();

      const query = supabase.from("chat_messages").delete();

      if (user) {
        query.eq("user_id", user.id);
      } else {
        query.eq("session_id", sessionId);
      }

      const { error } = await query;

      if (error) {
        toast({
          title: "Error",
          description: "Failed to clear chat history.",
          variant: "destructive",
        });
      } else {
        setMessages([]);
        toast({
          title: "Success",
          description: "Chat history cleared.",
        });
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
      toast({
        title: "Error",
        description: "Failed to clear chat history.",
        variant: "destructive",
      });
    }
  };

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionId = getSessionId();
      
      // Use session token for authenticated requests, fallback to anon key for public access
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Use environment variable or fallback to match client.ts pattern
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://njpjxasfesdapxukvyth.supabase.co';
      const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-bot`;
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ 
          messages: newMessages,
          userId: session?.user?.id,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = "Failed to send message. Please try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }

        if (response.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 401) {
          toast({
            title: "Configuration Error",
            description: errorMessage || "OpenAI API key is not configured. Please contact support.",
            variant: "destructive",
          });
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Payment Required",
            description: errorMessage || "Please add funds to your OpenAI account.",
            variant: "destructive",
          });
          return;
        }
        
        // For other errors, show the specific error message
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantMessage = "";
      let streamDone = false;

      // Add initial empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            
            if (content) {
              assistantMessage += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantMessage,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Failed to send message. Please try again.";
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast({
          title: "Network Error",
          description: "Unable to connect to the chat service. Please check your internet connection.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput("");
    await streamChat(userMessage);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 animate-in fade-in-0 duration-200" aria-hidden>
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes ai-chat-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes ai-chat-typing-dot {
              0%, 100% { opacity: 0.35; transform: translateY(0) scale(0.9); }
              50% { opacity: 1; transform: translateY(-4px) scale(1.1); }
            }
            #ai-chat-root .ai-chat-spin {
              animation: ai-chat-spin 0.8s linear infinite !important;
            }
            #ai-chat-root .chat-typing-dot {
              animation: ai-chat-typing-dot 0.5s ease-in-out infinite both !important;
            }
            #ai-chat-root .chat-typing-dot-2 { animation-delay: 0.15s !important; }
            #ai-chat-root .chat-typing-dot-3 { animation-delay: 0.3s !important; }
          `}} />
          <Card
            id="ai-chat-root"
            className="ai-chat-allow-animations chat-panel-enter fixed z-50 flex flex-col overflow-hidden
              rounded-2xl border border-border/60 bg-card shadow-2xl
              w-[calc(100vw-2rem)] max-w-[24rem] h-[min(600px,calc(100vh-6rem))]
              bottom-4 left-4 right-4 mx-auto
              sm:left-4 sm:right-auto sm:bottom-6 sm:mx-0 sm:w-96 sm:max-w-none sm:h-[600px]"
          >
          <CardHeader className="shrink-0 flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b border-border/50 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <span>AI Assistant</span>
            </CardTitle>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={clearChatHistory}
                  title="Clear chat history"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
              {isLoadingHistory && (
                <div className="flex flex-col items-center justify-center py-8">
                  <LoadingSpinner label="Loading chat history..." />
                </div>
              )}

              {!isLoadingHistory && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 px-2 text-center text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm leading-relaxed">
                    Hi! I'm your AI assistant. Ask me anything about our platform, pricing, or how to get started.
                  </p>
                </div>
              )}

              <div className="space-y-5">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 sm:gap-4 ${
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[85%] sm:max-w-[80%] ${
                        message.role === "assistant"
                          ? "rounded-bl-md bg-muted/80 text-foreground"
                          : "rounded-br-md bg-primary text-primary-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2 sm:gap-2.5 justify-start">
                    <div className="loading-spinner-wrapper flex w-8 h-8 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-2 ring-primary/20">
                      <Loader2 className="h-4 w-4 text-primary ai-chat-spin" aria-hidden />
                    </div>
                    <div className="rounded-xl rounded-bl-md px-2.5 py-1.5 bg-muted/80 border border-border/40">
                      <div className="flex gap-1 items-center" aria-label="AI is typing">
                        <span className="chat-typing-dot typing-dot-sm rounded-full bg-primary" />
                        <span className="chat-typing-dot chat-typing-dot-2 typing-dot-md rounded-full bg-accent" />
                        <span className="chat-typing-dot chat-typing-dot-3 typing-dot-sm rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} className="h-px shrink-0" aria-hidden />
            </div>

            <div className="shrink-0 border-t border-border/50 bg-card px-3 py-3 sm:px-4 sm:py-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={isLoading}
                  className="min-h-10 flex-1 rounded-xl border-border/60 bg-background text-sm"
                  autoFocus
                  aria-label="Message the AI assistant"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}
    </>
  );
}
