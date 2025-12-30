import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, ArrowUp, ShoppingCart, ChevronDown, User, Shovel, Menu, X, Home, LayoutDashboard, LogOut } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50 relative">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            {/* Desktop: Text logo with tagline */}
            <div className="hidden md:flex flex-col">
              <h1 className="text-xl font-bold">
                Digs <span className="text-primary">&amp;</span> Gigs
              </h1>
              <p className="text-xs text-muted-foreground">Where Opportunity Meets Talent</p>
            </div>
            {/* Mobile: Text logo without tagline */}
            <h1 className="block md:hidden text-lg font-bold">
              Digs <span className="text-primary">&amp;</span> Gigs
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 overflow-visible">
            {/* Home Button */}
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="font-semibold text-sm px-3"
            >
              HOME
            </Button>

            {/* My Dashboard Button - only for authenticated users */}
            {user && (
              <Button
                variant="ghost"
                onClick={() => navigate("/role-dashboard")}
                className="font-semibold text-sm px-3"
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
                  onClick={() => navigate("/get-free-quote")}
                >
                  Get Started
                </Button>
              </>
            )}

            {/* User Dropdown Menu */}
            {user && (
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 font-semibold px-3">
                    <User className="h-4 w-4" />
                    <span>{user.email?.split('@')[0] || 'User'}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={8}
                  className="w-48 bg-background border shadow-lg z-[10000] min-w-[12rem]"
                >
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
              <DropdownMenu modal={true}>
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
                <DropdownMenuContent 
                  align="end" 
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={8}
                  className="w-56 bg-background border shadow-lg z-[10000] min-w-[14rem]"
                >
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

            {user && !hideDiggerSelector && window.location.pathname !== '/register' && userRoles.includes('digger') && <DiggerProfileSelector />}
            
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

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {/* User Icon - Mobile */}
            {user && (
              <DropdownMenu modal={true}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="bottom"
                  sideOffset={8}
                  collisionPadding={8}
                  className="w-48 bg-background border shadow-lg z-[10000] min-w-[12rem]"
                >
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

            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  {/* Navigation Links */}
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate("/");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>

                  {user && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate("/role-dashboard");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      My Dashboard
                    </Button>
                  )}

                  {user && userRoles.includes('admin') && (
                    <Button
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        navigate("/admin/users");
                        setMobileMenuOpen(false);
                      }}
                    >
                      👑 Admin
                    </Button>
                  )}

                  {/* Role Switcher - Mobile */}
                  {user && userRoles.length > 0 && (
                    <>
                      <div className="border-t border-border my-2" />
                      <div className="px-2 py-1 text-sm font-semibold text-muted-foreground">
                        Switch Role
                      </div>
                      {userRoles.map((role) => (
                        <Button
                          key={role}
                          variant={activeRole === role ? "default" : "ghost"}
                          className="justify-start"
                          onClick={() => {
                            switchRole(role);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <span className="mr-2">{roleConfig[role].emoji}</span>
                          {roleConfig[role].label}
                          {activeRole === role && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Active
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </>
                  )}

                  {/* Account Actions */}
                  {user && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Button
                        variant="ghost"
                        className="justify-start text-destructive"
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </>
                  )}

                  {/* Auth for non-authenticated */}
                  {!user && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Button
                        variant="ghost"
                        className="justify-start"
                        onClick={() => {
                          navigate("/register?mode=signin");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="default"
                        className="justify-start"
                        onClick={() => {
                          navigate("/get-free-quote");
                          setMobileMenuOpen(false);
                        }}
                      >
                        Get Started
                      </Button>
                    </>
                  )}

                  {/* Cart - Mobile */}
                  <div className="border-t border-border my-2" />
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setCartOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Cart
                    {cartCount > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>

                  {/* Chat - Mobile */}
                  <Button
                    variant="default"
                    className="justify-start"
                    onClick={() => {
                      setChatOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat with us
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      
      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ProfileCartDrawer open={profileCartOpen} onClose={() => setProfileCartOpen(false)} />
    </>
  );
}
