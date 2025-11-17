import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowUp } from "lucide-react";
import AIChatbot from "@/components/AIChatbot";

interface NavigationProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
}

export function Navigation({ showBackButton = false, backTo = "/", backLabel = "Back to Home" }: NavigationProps) {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            digsandgigs
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <ArrowUp className="absolute -top-8 left-1/2 -translate-x-1/2 h-5 w-5 text-primary animate-bounce" />
              <Button 
                variant="default" 
                onClick={() => setChatOpen(true)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat with us
              </Button>
            </div>
            {showBackButton && (
              <Button variant="ghost" onClick={() => navigate(backTo)}>
                {backLabel}
              </Button>
            )}
          </div>
        </div>
      </nav>
      
      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
