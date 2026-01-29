import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "@/components/AIChatbot";

export function FloatingChatButton() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-12 gap-2 rounded-full px-5 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 hover:scale-105"
      >
        <MessageSquare className="h-5 w-5" />
        <span>Chat</span>
      </Button>

      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
