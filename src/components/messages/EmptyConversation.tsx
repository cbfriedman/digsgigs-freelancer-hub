import { MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyConversationProps {
  variant?: "no-selection" | "no-messages";
  partnerName?: string;
  className?: string;
}

export function EmptyConversation({ 
  variant = "no-selection", 
  partnerName,
  className 
}: EmptyConversationProps) {
  if (variant === "no-messages") {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center max-w-sm animate-fade-in">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Send className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Start the conversation</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Say hello to {partnerName || "them"} and start chatting about the gig.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 flex items-center justify-center p-8 bg-gradient-subtle", className)}>
      <div className="text-center max-w-sm animate-fade-in">
        <div className="h-20 w-20 mx-auto rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-5">
          <MessageSquare className="h-9 w-9 text-primary/60" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Select a conversation</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Pick a chat from the list to view messages and keep the conversation going.
        </p>
      </div>
    </div>
  );
}

export default EmptyConversation;
