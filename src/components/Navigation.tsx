import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/digsandgigs-logo.svg";
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
import { Badge } from "@/components/ui/badge";
import { DiggerProfileSelector } from "@/components/DiggerProfileSelector";
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

  // Scroll detection for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide digger profile selector on client-facing pages
  const hideDiggerSelector = ['/post-gig', '/browse-gigs'].includes(location.pathname);

  const navLinkClass = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-md hover:bg-accent/50";
  const navLinkActiveClass = "text-foreground bg-accent/50";

  const isActive = (path: string) => location.pathname === path;

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
                className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
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

              {/* Divider */}
              <div className="h-6 w-px bg-border/50 mx-2" />

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
                  {/* Role Switcher */}
                  {userRoles.length > 0 && (
                    <DropdownMenu modal={true}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                          <div className="flex gap-0.5">
                            {userRoles.slice(0, 3).map((role) => (
                              <span key={role} className="text-sm" title={roleConfig[role].label}>
                                {roleConfig[role].emoji}
                              </span>
                            ))}
                          </div>
                          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        sideOffset={8}
                        className="w-52 bg-background/95 backdrop-blur-xl border shadow-xl z-[10000]"
                      >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Switch Role</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* User Menu */}
                  <DropdownMenu modal={true}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 px-2">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      sideOffset={8}
                      className="w-52 bg-background/95 backdrop-blur-xl border shadow-xl z-[10000]"
                    >
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
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

                  {/* Digger Profile Selector */}
                  {!hideDiggerSelector && location.pathname !== '/register' && userRoles.includes('digger') && (
                    <DiggerProfileSelector />
                  )}
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
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
