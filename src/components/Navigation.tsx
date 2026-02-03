import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/digsandgigs-logo.png";
import { 
  ShoppingCart, 
  ChevronDown, 
  User, 
  Menu, 
  Home, 
  LayoutDashboard, 
  LogOut,
  Sparkles
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, userRoles, activeRole, switchRole, signOut } = useAuth();
  const { cartCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);

  // Fetch user profile photo and display name
  useEffect(() => {
    if (!user?.id) {
      setUserPhotoUrl(null);
      setUserDisplayName(null);
      return;
    }
    const fetchUserProfile = async () => {
      try {
        // Get profile photo from digger_profiles (if user has digger role)
        if (userRoles.includes('digger')) {
          const { data: diggerProfile } = await supabase
            .from('digger_profiles')
            .select('profile_image_url')
            .eq('user_id', user.id)
            .not('profile_image_url', 'is', null)
            .limit(1)
            .maybeSingle();
          if (diggerProfile?.profile_image_url) {
            setUserPhotoUrl(diggerProfile.profile_image_url);
          }
        }
        // Get display name from profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.full_name) {
          setUserDisplayName(profile.full_name);
        }
      } catch {
        // Silently fail - fallback to initials
      }
    };
    fetchUserProfile();
  }, [user?.id, userRoles]);

  // Scroll detection for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinkClass = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-md hover:bg-accent/50";
  const navLinkActiveClass = "text-foreground bg-accent/50";

  const isActive = (path: string) => location.pathname === path;

  const getUserInitials = () => {
    if (userDisplayName) {
      const parts = userDisplayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return userDisplayName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <>
      <nav 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm" 
            : "bg-background/95 backdrop-blur-sm border-b border-border/30"
        )}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate("/")}
            >
              <img 
                src={logo} 
                alt="Digs & Gigs" 
                className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              {/* Primary Nav Links */}
              <button
                onClick={() => navigate("/")}
                className={cn(navLinkClass, isActive("/") && navLinkActiveClass)}
              >
                Home
              </button>

              {user && (
                <button
                  onClick={() => navigate("/role-dashboard")}
                  className={cn(navLinkClass, isActive("/role-dashboard") && navLinkActiveClass)}
                >
                  Dashboard
                </button>
              )}

              {user && userRoles.includes('admin') && (
                <button
                  onClick={() => navigate("/admin/users")}
                  className={cn(navLinkClass, isActive("/admin/users") && navLinkActiveClass, "flex items-center gap-1.5")}
                >
                  <span>👑</span>
                  Admin
                </button>
              )}

              {/* When not logged in: Dark Mode in bar (no avatar dropdown) */}
              {!user && (
                <>
                  <ThemeToggle className="shrink-0" />
                  <div className="h-6 w-px bg-border/50 mx-2" />
                </>
              )}

              {/* Auth Section */}
              {!user ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/register?mode=signin")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Sign In
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate("/get-free-quote")}
                    className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Get Started
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* User Menu (avatar dropdown: Dark Mode, Role, Dashboard, Sign Out) */}
                  <DropdownMenu modal={true}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={userPhotoUrl || undefined} alt="Profile" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      sideOffset={8}
                      className="w-52 bg-background/95 backdrop-blur-xl border shadow-xl z-[10000]"
                    >
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium truncate">{userDisplayName || user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/my-profiles')} className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Dark Mode - prevent close on toggle */}
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent focus:outline-none">
                        <ThemeToggle className="w-full" />
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Role selection */}
                      {userRoles.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role</DropdownMenuLabel>
                          {userRoles.map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => switchRole(role)}
                              className={cn(
                                "cursor-pointer transition-colors",
                                activeRole === role && "bg-accent/50"
                              )}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <span>{roleConfig[role].emoji}</span>
                                  <span>{roleConfig[role].label}</span>
                                </div>
                                {activeRole === role && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    Active
                                  </Badge>
                                )}
                              </div>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => navigate('/role-dashboard')} className="cursor-pointer">
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Cart */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Button>


              {showBackButton && (
                <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                  {backLabel}
                </Button>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-1">
              {/* Cart - Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9"
                onClick={() => setCartOpen(true)}
              >
                <ShoppingCart className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Button>

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-border/50">
                      <SheetHeader>
                        <SheetTitle className="text-left">Menu</SheetTitle>
                      </SheetHeader>
                    </div>

                    {/* User Info */}
                    {user && (
                      <div className="p-4 bg-muted/30 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={userPhotoUrl || undefined} alt="Profile" />
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-sm font-medium">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{userDisplayName || user.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      <div className="flex items-center justify-between py-2 px-1 mb-2 border-b border-border/50">
                        <ThemeToggle />
                      </div>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/") 
                            ? "bg-accent text-accent-foreground" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          navigate("/");
                          setMobileMenuOpen(false);
                        }}
                      >
                        <Home className="h-4 w-4" />
                        <span className="font-medium">Home</span>
                      </button>

                      {user && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/role-dashboard") 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            navigate("/role-dashboard");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          <span className="font-medium">Dashboard</span>
                        </button>
                      )}

                      {user && userRoles.includes('admin') && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/admin/users") 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            navigate("/admin/users");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <span>👑</span>
                          <span className="font-medium">Admin</span>
                        </button>
                      )}

                      {/* Role Switcher */}
                      {user && userRoles.length > 0 && (
                        <>
                          <div className="pt-4 pb-2">
                            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Switch Role
                            </p>
                          </div>
                          {userRoles.map((role) => (
                            <button
                              key={role}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                                activeRole === role 
                                  ? "bg-primary/10 text-primary" 
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => {
                                switchRole(role);
                                setMobileMenuOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <span>{roleConfig[role].emoji}</span>
                                <span className="font-medium">{roleConfig[role].label}</span>
                              </div>
                              {activeRole === role && (
                                <Badge variant="secondary" className="text-[10px]">Active</Badge>
                              )}
                            </button>
                          ))}
                        </>
                      )}

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-border/50 space-y-2">
                      {!user ? (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              navigate("/register?mode=signin");
                              setMobileMenuOpen(false);
                            }}
                          >
                            Sign In
                          </Button>
                          <Button
                            className="w-full bg-gradient-to-r from-accent to-accent/80"
                            onClick={() => {
                              navigate("/get-free-quote");
                              setMobileMenuOpen(false);
                            }}
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Get Started
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            signOut();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
