import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowUp, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIChatbot from "@/components/AIChatbot";
import { DiggerProfileSelector } from "@/components/DiggerProfileSelector";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCartDrawer } from "@/components/ProfileCartDrawer";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";

interface NavigationProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
}

export function Navigation({ showBackButton = false, backTo = "/", backLabel = "Back to Home" }: NavigationProps) {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileCartOpen, setProfileCartOpen] = useState(false);
  const { user } = useAuth();
  const { cartCount } = useCart();
  const [profileCartCount, setProfileCartCount] = useState(0);

  // Clear old profile cart data since profiles now save directly to database
  useEffect(() => {
    localStorage.removeItem("profileCart");
    setProfileCartCount(0);
  }, []);

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
            {/* Home Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="font-semibold"
            >
              HOME
            </Button>
            {user && <DiggerProfileSelector />}
            
            {/* Cart Icon */}
            <Button
              variant="outline"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {cartCount}
                </Badge>
              )}
            </Button>

            <div className="relative">
              <Button 
                variant="default" 
                onClick={() => setChatOpen(true)}
                className="gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat with us
              </Button>
              <ArrowUp className="absolute -bottom-6 left-1/2 -translate-x-1/2 h-6 w-6 text-accent animate-pulse drop-shadow-[0_0_8px_hsl(var(--accent))] filter brightness-125" />
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
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ProfileCartDrawer open={profileCartOpen} onClose={() => setProfileCartOpen(false)} />
    </>
  );
}
