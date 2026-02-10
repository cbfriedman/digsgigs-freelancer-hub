import { useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "@/components/AIChatbot";
import { useAuth } from "@/contexts/AuthContext";

const AI_CHAT_PAGES = ["/", "/pricing", "/how-it-works"];

export function FloatingChatButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showButton = AI_CHAT_PAGES.includes(pathname);
  // Flush left, bottom - fully matched to left side to align with AI panel.
  const positionClass = "bottom-5 left-4 md:bottom-6 md:left-4";

  if (!showButton) return null;

  return (
    <>
      {!chatOpen && (
        <Button
          onClick={() => setChatOpen(true)}
          className={`fixed ${positionClass} z-[98]
          h-12 w-12 p-0 rounded-full
          sm:h-11 sm:w-auto sm:min-w-[140px] sm:px-4 sm:gap-2.5
          md:min-w-[152px] md:px-5
          bg-primary hover:bg-primary/90 text-primary-foreground
          shadow-md hover:shadow-lg border-0
          font-medium text-sm
          transition-shadow duration-200`}
        aria-label="Open AI assistant"
      >
        <MessageCircle className="h-5 w-5 shrink-0 sm:h-[18px] sm:w-[18px]" />
        <span className="hidden sm:inline">Ask AI</span>
      </Button>
      )}

      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
