import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowUp, ShoppingCart, ChevronDown, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AIChatbot from "@/components/AIChatbot";
import { DiggerProfileSelector } from "@/components/DiggerProfileSelector";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileCartDrawer } from "@/components/ProfileCartDrawer";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
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

type UserAppRole = 'digger' | 'gigger' | 'telemarketer' | 'admin';

const roleConfig: Record<UserAppRole, { label: string; emoji: string; color: string }> = {
  digger: { label: 'Digger', emoji: '🔧', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  gigger: { label: 'Gigger', emoji: '📋', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' },
  telemarketer: { label: 'Telemarketer', emoji: '📞', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100' },
  admin: { label: 'Admin', emoji: '👑', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100' },
};

export function Navigation({ showBackButton = false, backTo = "/", backLabel = "Back to Home" }: NavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [profileCartOpen, setProfileCartOpen] = useState(false);
  const { user, userRoles, activeRole, switchRole, signOut } = useAuth();
  const { cartCount } = useCart();
  const [profileCartCount, setProfileCartCount] = useState(0);
  const [adminId, setAdminId] = useState<string | null>(null);

  // Hide digger profile selector on client-facing pages (gig posting, etc.)
  const hideDiggerSelector = ['/post-gig', '/browse-gigs'].includes(location.pathname);

  // Clear old profile cart data since profiles now save directly to database
  useEffect(() => {
    localStorage.removeItem("profileCart");
    setProfileCartCount(0);
  }, []);

  // Fetch admin ID if user is admin
  useEffect(() => {
    const fetchAdminId = async () => {
      if (user && userRoles.includes('admin')) {
        const { data, error } = await supabase
          .from('user_app_roles')
          .select('created_at, user_id')
          .eq('app_role', 'admin' as any)
          .order('created_at', { ascending: true });

        if (!error && data) {
          const position = data.findIndex((role) => role.user_id === user.id);
          if (position !== -1) {
            setAdminId(`DG-${position + 1}`);
          }
        }
      }
    };

    fetchAdminId();
  }, [user, userRoles]);

  return (
    <>
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            Digs and Gigs
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

            {/* My Dashboard Button - only for authenticated users */}
            {user && (
              <Button
                variant="ghost"
                onClick={() => navigate("/role-dashboard")}
                className="font-semibold"
              >
                MY DASHBOARD
              </Button>
            )}

            {/* Admin Button - only for admins */}
            {user && userRoles.includes('admin') && (
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/users")}
                className="font-semibold flex items-center gap-2"
              >
                👑 ADMIN
              </Button>
            )}

            {/* Auth Buttons for non-authenticated users */}
            {!user && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/register?mode=signin")}
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

            {/* User Dropdown Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    <span>{user.email?.split('@')[0] || 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
                  <DropdownMenuItem onClick={() => navigate('/role-dashboard')} className="cursor-pointer">
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Role Icons for authenticated users */}
            {user && userRoles.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {userRoles.map((role) => (
                          <span key={role} className="text-base" title={roleConfig[role].label}>
                            {roleConfig[role].emoji}
                          </span>
                        ))}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </div>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && !hideDiggerSelector && <DiggerProfileSelector />}
            
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
