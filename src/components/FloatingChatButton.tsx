import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "@/components/AIChatbot";

export function FloatingChatButton() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* Mobile: Icon only, smaller size */}
      {/* Tablet: Icon + text, medium size */}
      {/* Desktop: Icon + text, full size */}
      <Button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-4 right-4 z-50 
          h-11 w-11 p-0 rounded-full
          sm:h-12 sm:w-auto sm:px-4 sm:gap-2
          md:bottom-6 md:right-6 md:px-5
          shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground 
          transition-all duration-200 hover:scale-105"
      >
        <MessageSquare className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">Chat</span>
      </Button>

      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
