import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIChatbot from "@/components/AIChatbot";
import { useAuth } from "@/contexts/AuthContext";

const AI_CHAT_PAGES = ["/", "/pricing", "/how-it-works"];

export function FloatingChatButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const showButton = AI_CHAT_PAGES.includes(pathname);
  // Dock to the left edge as a half-circle style launcher.
  const positionClass = "left-0 bottom-5 md:bottom-6";

  if (!showButton) return null;

  return (
    <>
      {!chatOpen && (
        <Button
          onClick={() => setChatOpen(true)}
          className={`fixed ${positionClass} z-[98]
          group h-9 w-9 p-0 rounded-l-none rounded-r-full
          sm:h-10 sm:w-10 sm:hover:w-[122px] sm:justify-start sm:pl-3
          bg-primary hover:bg-primary/90 text-primary-foreground
          shadow-md hover:shadow-xl border-0
          font-medium text-sm
          transition-all duration-300 ease-smooth-out
          hover:translate-x-2 hover:scale-[1.03]`}
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]" />
        <span
          className="hidden sm:inline-block overflow-hidden whitespace-nowrap max-w-0 opacity-0 -translate-x-1 ml-0
          group-hover:max-w-[72px] group-hover:opacity-100 group-hover:translate-x-0 group-hover:ml-2
          transition-all duration-300 ease-smooth-out"
        >
          Ask AI
        </span>
      </Button>
      )}

      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
