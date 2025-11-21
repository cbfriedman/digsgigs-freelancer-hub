import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowUp, ShoppingCart, ChevronDown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIChatbot from "@/components/AIChatbot";
import { DiggerProfileSelector } from "@/components/DiggerProfileSelector";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCartDrawer } from "@/components/ProfileCartDrawer";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavigationProps {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
}

type UserAppRole = 'digger' | 'gigger' | 'telemarketer';

const roleConfig: Record<UserAppRole, { label: string; emoji: string; color: string }> = {
  digger: { label: 'Digger', emoji: '🔧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  gigger: { label: 'Gigger', emoji: '📋', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  telemarketer: { label: 'Telemarketer', emoji: '📞', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' },
};

export function Navigation({ showBackButton = false, backTo = "/", backLabel = "Back to Home" }: NavigationProps) {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileCartOpen, setProfileCartOpen] = useState(false);
  const { user, userRoles, activeRole, switchRole, signOut } = useAuth();
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

            {/* Dashboard Button for authenticated users */}
            {user && (
              <Button
                variant="ghost"
                onClick={() => navigate("/role-dashboard")}
                className="font-semibold"
              >
                DASHBOARD
              </Button>
            )}

            {/* Auth Buttons for non-authenticated users */}
            {!user && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                >
                  Sign In
                </Button>
                <Button
                  variant="default"
                  onClick={() => navigate("/register")}
                >
                  Get Started
                </Button>
              </>
            )}

            {/* Role Switcher - Only show if user has roles */}
            {user && userRoles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    {activeRole ? (
                      <>
                        <span>{roleConfig[activeRole].emoji}</span>
                        <span className="hidden sm:inline">{roleConfig[activeRole].label}</span>
                        {userRoles.length > 1 && <ChevronDown className="h-4 w-4 opacity-50" />}
                      </>
                    ) : (
                      <>
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">My Account</span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                  <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {userRoles.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => switchRole(role)}
                      className={`cursor-pointer ${activeRole === role ? 'bg-accent' : ''}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span>{roleConfig[role].emoji}</span>
                          <span>{roleConfig[role].label}</span>
                        </div>
                        {activeRole === role && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/pricing')} className="cursor-pointer">
                    <span className="text-muted-foreground">Manage Profiles</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

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
