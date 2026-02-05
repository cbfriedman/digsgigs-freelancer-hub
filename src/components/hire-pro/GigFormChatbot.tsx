import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { useGigAssistant, GigData, Message } from "@/hooks/useGigAssistant";

interface GigFormChatbotProps {
  onDataUpdate?: (data: GigData) => void;
  onComplete?: (data: GigData) => void;
}

export function GigFormChatbot({ onDataUpdate, onComplete }: GigFormChatbotProps) {
  const { messages, extractedData, isLoading, sendMessage } = useGigAssistant();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Notify parent of data updates
  useEffect(() => {
    if (onDataUpdate) {
      onDataUpdate(extractedData);
    }
    if (extractedData.isComplete && onComplete) {
      onComplete(extractedData);
    }
  }, [extractedData, onDataUpdate, onComplete]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const getCompletionPercentage = () => {
    const fields = [
      extractedData.problemId,
      extractedData.clarifyingAnswer,
      extractedData.description,
      extractedData.budgetMin,
      extractedData.budgetMax,
      extractedData.timeline,
      extractedData.clientName,
      extractedData.clientEmail,
    ];
    const filledFields = fields.filter(f => f !== null && f !== undefined && f !== "").length;
    return Math.round((filledFields / fields.length) * 100);
  };

  return (
    <Card className="flex flex-col h-[500px] border-border/50 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              Morgan
              <Badge variant="secondary" className="text-xs bg-success/10 text-success">
                AI Assistant
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              I'll help you describe your project
            </p>
          </div>
        </div>
        {getCompletionPercentage() > 0 && (
          <Badge variant="outline" className="text-xs">
            {getCompletionPercentage()}% complete
          </Badge>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === "user" 
                  ? "bg-accent/10" 
                  : "bg-primary/10"
              }`}>
                {message.role === "user" ? (
                  <User className="h-4 w-4 text-accent" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Captured data badges */}
      {(extractedData.problemId || extractedData.budgetMin || extractedData.timeline || extractedData.clientName) && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground mb-2">Captured details:</p>
          <div className="flex flex-wrap gap-1">
            {extractedData.problemId && (
              <Badge variant="outline" className="text-xs">
                Type: {extractedData.problemId.replace(/-/g, ' ')}
              </Badge>
            )}
            {(extractedData.budgetMin || extractedData.budgetMax) && (
              <Badge variant="outline" className="text-xs">
                Budget: ${extractedData.budgetMin || '?'} - ${extractedData.budgetMax || '?'}
              </Badge>
            )}
            {extractedData.timeline && (
              <Badge variant="outline" className="text-xs">
                Timeline: {extractedData.timeline.replace(/-/g, ' ')}
              </Badge>
            )}
            {extractedData.clientName && (
              <Badge variant="outline" className="text-xs">
                Name: {extractedData.clientName}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || !input.trim()}
            className="bg-gradient-primary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
