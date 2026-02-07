import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/digsandgigs-logo.png";
import {
  Menu,
  User,
  LogOut,
  ChevronDown,
  HelpCircle,
  DollarSign
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

export const HomepageNavbar = () => {
  const navigate = useNavigate();
  const { user, userRoles, signOut } = useAuth();
  const { trackButtonClick } = useGA4Tracking();
  const [userName, setUserName] = useState<string>("");
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserName(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setUserPhotoUrl(null);
      return;
    }
    const authPhoto = (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture || null;
    setUserPhotoUrl(authPhoto);
    const fetchUserPhoto = async () => {
      try {
        const [profileResult, diggerResult] = await Promise.all([
          supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle(),
          userRoles?.includes('digger')
            ? supabase.from('digger_profiles').select('profile_image_url').eq('user_id', user.id).not('profile_image_url', 'is', null).limit(1).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        const syncedPhoto = authPhoto || profileResult.data?.avatar_url || diggerResult.data?.profile_image_url || null;
        setUserPhotoUrl(syncedPhoto);
      } catch {
        // Silently fail
      }
    };
    fetchUserPhoto();
  }, [user?.id, user?.user_metadata, userRoles]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchUserName = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    setUserName(data?.full_name || data?.email || "User");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  const getUserInitials = () => {
    if (userName && userName !== "User") {
      const parts = userName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return userName.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-background/95 backdrop-blur-lg border-b border-border/50 shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="container-wide flex h-16 items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          <img 
            src={logo} 
            alt="Digs & Gigs" 
            className="h-10 w-auto object-contain"
          />
        </div>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/pricing")}
            className="text-muted-foreground hover:text-foreground"
          >
            <DollarSign className="mr-1.5 h-4 w-4" />
            Pricing
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/how-it-works")}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="mr-1.5 h-4 w-4" />
            How It Works
          </Button>
          
          <ThemeToggle className="shrink-0" />
          <div className="w-px h-6 bg-border mx-2" />
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 font-medium">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userPhotoUrl || undefined} alt="Profile" />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline">{userName}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-background" align="end">
                <DropdownMenuItem onClick={() => navigate("/role-dashboard")}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => {
                  trackButtonClick('Sign In', 'header');
                  navigate("/register?mode=signin");
                }}
              >
                Sign In
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-accent text-accent-foreground shadow-sm hover:shadow-accent transition-all"
                onClick={() => {
                  trackButtonClick('Get Started', 'header');
                  navigate("/post-gig");
                }}
              >
                Get Started
              </Button>
            </>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px]">
            <SheetHeader className="text-left">
              <SheetTitle className="font-display">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 mt-8">
              <div className="flex items-center justify-between py-2 px-1 mb-2 border-b border-border">
                <ThemeToggle />
              </div>
              <Button 
                variant="ghost" 
                className="justify-start h-12" 
                onClick={() => {
                  navigate("/pricing");
                  setMobileMenuOpen(false);
                }}
              >
                <DollarSign className="mr-3 h-5 w-5 text-primary" />
                Pricing
              </Button>
              <Button 
                variant="ghost" 
                className="justify-start h-12" 
                onClick={() => {
                  navigate("/how-it-works");
                  setMobileMenuOpen(false);
                }}
              >
                <HelpCircle className="mr-3 h-5 w-5 text-primary" />
                How It Works
              </Button>
              
              <div className="h-px bg-border my-4" />
              
              {user ? (
                <>
                  <div className="px-4 py-3 bg-muted rounded-lg mb-2 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={userPhotoUrl || undefined} alt="Profile" />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-muted-foreground">Signed in as</p>
                      <p className="font-medium truncate">{userName}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-12" 
                    onClick={() => {
                      navigate("/role-dashboard");
                      setMobileMenuOpen(false);
                    }}
                  >
                    <User className="mr-3 h-5 w-5" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-12 text-destructive hover:text-destructive" 
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    className="justify-start h-12" 
                    onClick={() => {
                      navigate("/register?mode=signin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Sign In
                  </Button>
                  <Button 
                    className="h-12 bg-gradient-accent text-accent-foreground mt-2"
                    onClick={() => {
                      navigate("/post-gig");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
