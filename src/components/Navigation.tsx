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
  MessageCircle,
  BellRing,
  FolderOpen,
  Settings,
  Briefcase,
  Rocket,
  ArrowRight
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadMessagesCount } from "@/hooks/useUnreadMessagesCount";
import { useRecentConversations } from "@/hooks/useRecentConversations";
import { useRecentGigs } from "@/hooks/useRecentGigs";
import { usePlatformCounts } from "@/hooks/usePlatformCounts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { goToProfileWorkspace } from "@/lib/profileWorkspaceRoute";
import { getCanonicalGiggerProfilePath } from "@/lib/profileUrls";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

const DEFAULT_AVATAR = "/default-avatar.svg";

export function Navigation({ showBackButton = false, backTo = "/", backLabel = "Back to Home" }: NavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, userRoles, activeRole, switchRole, signOut } = useAuth();
  const { cartCount } = useCart();
  const { unreadCount: notificationUnreadCount, notifications } = useNotifications();
  const unreadMessagesCount = useUnreadMessagesCount();
  const { conversations: recentConversations, loading: recentConversationsLoading } = useRecentConversations(user ?? null);
  const { gigs: recentGigs, loading: recentGigsLoading } = useRecentGigs(user?.id);
  const { hasEnoughDiggers } = usePlatformCounts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [userHandle, setUserHandle] = useState<string | null>(null);
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const [recentBids, setRecentBids] = useState<Array<{
    id: string;
    created_at: string;
    status: string;
    gig_id: string | null;
    gig_title: string;
  }>>([]);
  const [recentBidsLoading, setRecentBidsLoading] = useState(false);
  const isDiggerMode = activeRole === "digger";
  const isGiggerMode = activeRole === "gigger";
  const hasProjectShortcut = userRoles.includes("gigger") || userRoles.includes("digger");
  const projectMenuPath = isDiggerMode ? "/my-bids" : "/my-gigs";
  const projectMenuTitle = isDiggerMode ? "My Bids" : "My Projects";
  const projectEmptyLabel = isDiggerMode ? "No bids yet" : "No projects yet";

  // Fetch user profile photo and display name (header avatar synced with profile photo)
  useEffect(() => {
    if (!user?.id) {
      setUserPhotoUrl(null);
      setUserDisplayName(null);
      setUserHandle(null);
      return;
    }
    const authPhoto = (user as any).user_metadata?.avatar_url || (user as any).user_metadata?.picture || null;
    const authPhotoValid = authPhoto && typeof authPhoto === 'string' && authPhoto.trim().length > 0;
    setUserPhotoUrl(authPhotoValid ? authPhoto : null);
    const fetchUserProfile = async () => {
      try {
        // Fetch profiles.avatar_url, full_name, handle and digger_profiles.profile_image_url, handle
        // Note: profiles.handle exists (migration 20260228110000) but may be missing from generated types
        const [profileResult, diggerResult] = await Promise.all([
          (supabase.from('profiles') as any).select('avatar_url, full_name, handle').eq('id', user.id).maybeSingle(),
          supabase.from('digger_profiles').select('profile_image_url, handle').eq('user_id', user.id).order('is_primary', { ascending: false }).order('created_at', { ascending: true }).limit(1).maybeSingle(),
        ]);
        const profilesAvatar = profileResult.data?.avatar_url;
        const diggerPhoto = diggerResult.data?.profile_image_url;
        const toUrl = (v: unknown) => (v && typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);
        // Prefer profiles.avatar_url when we have profile data so header stays in sync with Gigger/Digger profile (including "no photo")
        const fromProfiles = profileResult.data != null ? (toUrl(profilesAvatar) ?? null) : undefined;
        const syncedPhoto = fromProfiles !== undefined ? fromProfiles : (toUrl(authPhoto) || toUrl(diggerPhoto) || null);
        setUserPhotoUrl(syncedPhoto);
        if (profileResult.data?.full_name) {
          setUserDisplayName(profileResult.data.full_name);
        }
        const handle = (profileResult.data as { handle?: string } | null)?.handle || (diggerResult.data as { handle?: string } | null)?.handle;
        const h = handle && typeof handle === 'string' ? handle.replace(/^@/, '').trim().toLowerCase() : null;
        setUserHandle(h || null);
      } catch {
        if (authPhotoValid) setUserPhotoUrl(authPhoto);
      }
    };
    fetchUserProfile();
  }, [user?.id, user?.user_metadata]);

  // Scroll detection for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user?.id || !userRoles.includes("digger")) {
      setRecentBids([]);
      setRecentBidsLoading(false);
      return;
    }
    let cancelled = false;
    const loadRecentBids = async () => {
      setRecentBidsLoading(true);
      try {
        const { data: diggerProfile } = await supabase
          .from("digger_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!diggerProfile?.id) {
          if (!cancelled) setRecentBids([]);
          return;
        }

        const { data, error } = await supabase
          .from("bids")
          .select(`
            id,
            created_at,
            status,
            gig_id,
            gigs!gig_id (
              title
            )
          `)
          .eq("digger_id", diggerProfile.id)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;
        const mapped = ((data as Array<{
          id: string;
          created_at: string;
          status: string;
          gig_id: string | null;
          gigs?: { title?: string | null } | null;
        }> | null) ?? []).map((b) => ({
          id: b.id,
          created_at: b.created_at,
          status: b.status,
          gig_id: b.gig_id,
          gig_title: b.gigs?.title?.trim() || "Project",
        }));
        if (!cancelled) setRecentBids(mapped);
      } catch {
        if (!cancelled) setRecentBids([]);
      } finally {
        if (!cancelled) setRecentBidsLoading(false);
      }
    };

    loadRecentBids();
    return () => {
      cancelled = true;
    };
  }, [user?.id, userRoles]);

  const navLinkClass = "text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 px-3 py-2 rounded-md hover:bg-accent/50";
  const navLinkActiveClass = "text-foreground bg-accent/50";

  const NavDropdown = ({
    id,
    trigger,
    children,
  }: {
    id: string;
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <DropdownMenu
      modal={false}
      open={openNavMenu === id}
      onOpenChange={(open) => setOpenNavMenu(open ? id : null)}
    >
      <DropdownMenuTrigger asChild>
        <div onPointerEnter={() => setOpenNavMenu(id)}>{trigger}</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-52 min-w-[13rem] py-1.5"
        onPointerEnter={() => setOpenNavMenu(id)}
        onPointerLeave={() => setOpenNavMenu(null)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Logo + menu group (Home, Hire, Find work, Pricing) — right next to logo */}
            <div className="flex items-center min-w-0 gap-2 lg:gap-3">
              <div 
                className="flex-shrink-0 cursor-pointer group"
                onClick={() => navigate("/")}
              >
                <img 
                  src={logo} 
                  alt="Digs & Gigs" 
                  className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              {/* Nav links — immediately after logo (desktop only) */}
              <nav className="hidden md:flex h-full items-center gap-0.5 lg:gap-1">
              <button
                onClick={() => navigate("/")}
                className={cn(navLinkClass, isActive("/") && navLinkActiveClass)}
              >
                Home
              </button>

              {/* Gigger-related menu: show when in Gigger mode or when not in Digger mode (guest or both roles) */}
              {activeRole !== "digger" && (
              <NavDropdown
                id="hire"
                trigger={
                  <button className={cn(navLinkClass, "flex items-center gap-0.5")}>
                    Hire Diggers
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/post-gig")} className="cursor-pointer">
                  Post a gig
                </DropdownMenuItem>
                {hasEnoughDiggers && (
                  <DropdownMenuItem onClick={() => navigate("/browse-diggers")} className="cursor-pointer">
                    Browse Diggers
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/get-free-quote")} className="cursor-pointer">
                  Get free quote
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/hire-a-pro")} className="cursor-pointer">
                  Hire a pro
                </DropdownMenuItem>
                {user && userRoles.includes('gigger') && (
                  <DropdownMenuItem onClick={() => navigate("/my-gigs")} className="cursor-pointer">
                    My gigs
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer">
                  Pricing
                </DropdownMenuItem>
              </NavDropdown>
              )}

              {/* Digger-related menu: show when in Digger mode or when not in Gigger mode (guest or both roles) */}
              {activeRole !== "gigger" && (
              <NavDropdown
                id="find"
                trigger={
                  <button className={cn(navLinkClass, "flex items-center gap-0.5")}>
                    Find gigs
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/browse-gigs")} className="cursor-pointer">
                  Browse gigs
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem onClick={() => navigate("/my-bids")} className="cursor-pointer">
                    My bids
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate("/register?mode=signup&type=digger")} className="cursor-pointer">
                  Become a digger
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/digger-guide")} className="cursor-pointer">
                  Digger guide
                </DropdownMenuItem>
              </NavDropdown>
              )}

              {/* Why Digs & Gigs — trust & info */}
              <NavDropdown
                id="why"
                trigger={
                  <button className={cn(navLinkClass, "flex items-center gap-0.5")}>
                    Why Digs & Gigs
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/about")} className="cursor-pointer">
                  About
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/how-it-works")} className="cursor-pointer">
                  How it works
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/faq")} className="cursor-pointer">
                  FAQ
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/compare")} className="cursor-pointer">
                  Compare
                </DropdownMenuItem>
              </NavDropdown>

              {/* What's new */}
              <NavDropdown
                id="whatsnew"
                trigger={
                  <button className={cn(navLinkClass, "flex items-center gap-0.5")}>
                    What&apos;s new
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/blog")} className="cursor-pointer">
                  Blog
                </DropdownMenuItem>
              </NavDropdown>

              {/* Pricing - direct link */}
              <button
                onClick={() => navigate("/pricing")}
                className={cn(navLinkClass, isActive("/pricing") && navLinkActiveClass)}
              >
                Pricing
              </button>

              {user && userRoles.includes('admin') && (
                <button
                  onClick={() => navigate("/admin/users")}
                  className={cn(navLinkClass, isActive("/admin/users") && navLinkActiveClass, "flex items-center gap-1.5")}
                >
                  <span>👑</span>
                  Admin
                </button>
              )}
              </nav>
            </div>

            {/* Right: Dark mode, Sign In/Sign up or Messages, Notifications, Folder, Avatar, Cart */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-auto">
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
                    onClick={() => navigate("/register")}
                    className="bg-gradient-accent text-accent-foreground font-semibold rounded-lg shadow-accent hover:shadow-accent-lg hover-glow-accent transition-all duration-200 border-0"
                  >
                    Sign Up
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Messages — only when signed in; hover shows recent messages dropdown */}
                  <HoverCard openDelay={300} closeDelay={150}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 shrink-0 overflow-visible text-muted-foreground hover:text-foreground"
                        onClick={() => navigate("/messages")}
                        title={unreadMessagesCount > 0 ? `${unreadMessagesCount} unread messages` : "Messages"}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {unreadMessagesCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center ring-2 ring-background">
                            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                          </span>
                        )}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000]">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="font-semibold text-sm">Recent Messages</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); navigate("/messages"); }}
                          className="text-primary hover:underline text-xs font-medium"
                        >
                          View All
                        </button>
                      </div>
                      <ScrollArea className="h-[320px]">
                        {recentConversationsLoading ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                        ) : recentConversations.length === 0 ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No conversations yet</div>
                        ) : (
                          <ul className="py-1">
                            {recentConversations.map((conv) => {
                              const unreadCount = conv.unreadCount ?? 0;
                              const fullSnippet = conv.lastMessageContent
                                ? `${conv.lastMessageFromMe ? "You: " : ""}${conv.lastMessageContent}`
                                : "No messages yet";
                              const snippet = fullSnippet;
                              const isToday = (d: Date) => {
                                const today = new Date();
                                return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                              };
                              const d = new Date(conv.updatedAt);
                              const timeLabel = isToday(d)
                                ? (Date.now() - d.getTime() < 60_000 ? "Just now" : format(d, "HH:mm"))
                                : (Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? "Yesterday" : format(d, "MMM d"));
                              return (
                                <li key={conv.id}>
                                  <button
                                    type="button"
                                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors"
                                    onClick={(e) => { e.preventDefault(); navigate(`/messages?conversation=${conv.id}`); }}
                                  >
                                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                                      <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" className="object-cover" />
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                        {conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 overflow-hidden pr-1">
                                      <div className="flex items-center justify-between gap-3 min-w-0">
                                        <Tooltip delayDuration={400}>
                                          <TooltipTrigger asChild>
                                            <span className="font-medium text-sm truncate min-w-0 block">{conv.partnerDisplayName}</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[240px]">
                                            <p className="break-words">{conv.partnerDisplayName}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <div className="flex items-center gap-2 shrink-0">
                                          {unreadCount > 0 && (
                                            <span
                                              className="h-5 min-w-[1.25rem] px-1 rounded-md bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center"
                                              title={`${unreadCount} unread`}
                                            >
                                              {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                          )}
                                          <span className="text-xs text-muted-foreground min-w-[4rem] text-right">{timeLabel}</span>
                                        </div>
                                      </div>
                                      <Tooltip delayDuration={400}>
                                        <TooltipTrigger asChild>
                                          <p className="text-xs text-muted-foreground line-clamp-2 break-words mt-0.5 cursor-default">{snippet}</p>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[280px]">
                                          <p className="break-words text-xs">{(conv.lastMessageFromMe ? "You: " : "") + (conv.lastMessageContent || "No messages yet")}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </ScrollArea>
                    </HoverCardContent>
                  </HoverCard>
                  {/* Notifications — only when signed in; hover shows recent */}
                  <HoverCard openDelay={300} closeDelay={150}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate("/notifications")}
                        title="Notifications"
                      >
                        <BellRing className="h-4 w-4" />
                        {notificationUnreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                            {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                          </span>
                        )}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000]">
                      <div className="flex items-center justify-between px-4 py-3 border-b">
                        <span className="font-semibold text-sm">Recent Notifications</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate("/notifications"); }} className="text-primary hover:underline text-xs font-medium">View All</button>
                      </div>
                      <ScrollArea className="h-[320px]">
                        {notifications.length === 0 ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No notifications yet</div>
                        ) : (
                          <ul className="py-1">
                            {notifications.slice(0, 6).map((n) => {
                              const d = new Date(n.created_at);
                              const isToday = (x: Date) => { const t = new Date(); return x.getDate() === t.getDate() && x.getMonth() === t.getMonth() && x.getFullYear() === t.getFullYear(); };
                              const timeLabel = isToday(d) ? (Date.now() - d.getTime() < 60_000 ? "Just now" : format(d, "h:mm a")) : (Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? "Yesterday" : format(d, "MMM d"));
                              const msg = (n.message || "").length > 50 ? (n.message || "").slice(0, 50) + "…" : (n.message || "—");
                              return (
                                <li key={n.id}>
                                  <button
                                    type="button"
                                    className={cn("w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors", !n.read && "bg-primary/5")}
                                    onClick={(e) => { e.preventDefault(); navigate(n.link || "/notifications"); }}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className={cn("font-medium text-sm truncate flex-1", !n.read && "font-semibold")}>{n.title || "Notification"}</span>
                                      <span className="text-xs text-muted-foreground shrink-0">{timeLabel}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate w-full">{msg}</p>
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </ScrollArea>
                    </HoverCardContent>
                  </HoverCard>
                  {/* Project/Bids shortcut - role aware; hover shows recent (gigger) */}
                  {hasProjectShortcut && (
                  <HoverCard openDelay={300} closeDelay={150}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(projectMenuPath)}
                        title={projectMenuTitle}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                        <span className="font-semibold text-sm truncate min-w-0">{projectMenuTitle}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                      </div>
                      <ScrollArea className="h-[320px] w-full min-w-0 max-w-full overflow-hidden">
                          <div className="w-full min-w-0 max-w-full overflow-hidden pr-5">
                            {isDiggerMode ? (
                              recentBidsLoading ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                              ) : recentBids.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                              ) : (
                                <ul className="py-1 w-full min-w-0 list-none">
                                  {recentBids.map((b) => {
                                    const timeLabel = format(new Date(b.created_at), "MMM d, yyyy");
                                    return (
                                      <li key={b.id} className="w-full min-w-0 overflow-hidden border-b-0">
                                        <button
                                          type="button"
                                          className="w-full min-w-0 max-w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors overflow-hidden box-border"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            if (b.gig_id) navigate(`/gig/${b.gig_id}`);
                                            else navigate("/my-bids");
                                          }}
                                        >
                                          <div className="w-full min-w-0 flex items-center justify-between gap-2">
                                            <span className="font-medium text-sm truncate min-w-0 flex-1" title={b.gig_title}>{b.gig_title}</span>
                                            <Badge variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] shrink-0 whitespace-nowrap">{b.status}</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground truncate w-full min-w-0">{timeLabel}</p>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )
                            ) : recentGigsLoading ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                            ) : recentGigs.length === 0 ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                            ) : (
                              <ul className="py-1 w-full min-w-0 list-none">
                                {recentGigs.map((g) => {
                                  const d = new Date(g.created_at);
                                  const timeLabel = format(d, "MMM d, yyyy");
                                  const title = g.title || "Untitled project";
                                  const displayTitle = title.length > 42 ? title.slice(0, 42).trim() + "…" : title;
                                  return (
                                    <li key={g.id} className="w-full min-w-0 overflow-hidden border-b-0">
                                      <button
                                        type="button"
                                        className="w-full min-w-0 max-w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60 transition-colors overflow-hidden box-border"
                                        onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }}
                                      >
                                        <div className="w-full min-w-0 flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm truncate min-w-0 flex-1" title={title}>{displayTitle}</span>
                                          <Badge variant={g.status === "open" ? "default" : "secondary"} className="text-[10px] shrink-0 whitespace-nowrap">{g.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate w-full min-w-0">{timeLabel}</p>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </ScrollArea>
                    </HoverCardContent>
                  </HoverCard>
                  )}
                  {/* User Menu (avatar dropdown: Dark Mode, Role, Dashboard, Sign Out) */}
                  <DropdownMenu modal={false} open={openUserMenu} onOpenChange={setOpenUserMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 px-2"
                        onPointerEnter={() => setOpenUserMenu(true)}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={userPhotoUrl || DEFAULT_AVATAR} alt="Profile" />
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
                      className="w-56 min-w-[14rem] py-2"
                      onPointerEnter={() => setOpenUserMenu(true)}
                      onPointerLeave={() => setOpenUserMenu(false)}
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium truncate">{userDisplayName || user.email?.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (userHandle) navigate(`/profile/${userHandle}`);
                          else if (user?.id && userRoles.includes("gigger")) navigate(getCanonicalGiggerProfilePath(user.id));
                          else navigate("/my-profiles");
                        }}
                        className="cursor-pointer"
                      >
                        <User className="h-4 w-4 mr-2" />
                        View profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Account
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
                              onClick={async () => {
                                await switchRole(role);
                                if (role === "gigger" && user?.id && (/^\/digger\//.test(location.pathname) || /^\/profile\/[^/]+\/digger/.test(location.pathname))) {
                                  navigate(getCanonicalGiggerProfilePath(user.id));
                                } else if (role === "digger" && /^\/gigger\//.test(location.pathname)) {
                                  navigate("/my-profile");
                                }
                              }}
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
                      <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {user && Array.isArray(userRoles) && userRoles.includes('digger') && !isGiggerMode && (
                <>
                  {/* Cart - only for registered Diggers */}
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
                </>
              )}


              {showBackButton && (
                <Button variant="ghost" size="sm" onClick={() => navigate(backTo)}>
                  {backLabel}
                </Button>
              )}
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden items-center gap-1">
              {/* Messages - Mobile (only when signed in); tap/hover shows recent messages */}
              {user && (
                <HoverCard openDelay={200} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 overflow-visible text-muted-foreground hover:text-foreground"
                      onClick={() => navigate("/messages")}
                      title={unreadMessagesCount > 0 ? `${unreadMessagesCount} unread messages` : "Messages"}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {unreadMessagesCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] px-1 rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center ring-2 ring-background">
                          {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                        </span>
                      )}
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000]">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="font-semibold text-sm">Recent Messages</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); navigate("/messages"); }} className="text-primary hover:underline text-xs font-medium">View All</button>
                    </div>
                    <ScrollArea className="h-[320px]">
                      {recentConversationsLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                      ) : recentConversations.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No conversations yet</div>
                      ) : (
                        <ul className="py-1">
                          {recentConversations.map((conv) => {
                            const unreadCount = conv.unreadCount ?? 0;
                            const fullSnippet = conv.lastMessageContent
                              ? `${conv.lastMessageFromMe ? "You: " : ""}${conv.lastMessageContent}`
                              : "No messages yet";
                            const snippet = fullSnippet;
                            const d = new Date(conv.updatedAt);
                            const isToday = (x: Date) => { const t = new Date(); return x.getDate() === t.getDate() && x.getMonth() === t.getMonth() && x.getFullYear() === t.getFullYear(); };
                            const timeLabel = isToday(d) ? (Date.now() - d.getTime() < 60_000 ? "Just now" : format(d, "HH:mm")) : (Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? "Yesterday" : format(d, "MMM d"));
                            return (
                              <li key={conv.id}>
                                <button type="button" className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/60" onClick={(e) => { e.preventDefault(); navigate(`/messages?conversation=${conv.id}`); }}>
                                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                                    <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1 overflow-hidden pr-1">
                                    <div className="flex items-center justify-between gap-3 min-w-0">
                                      <Tooltip delayDuration={400}>
                                        <TooltipTrigger asChild>
                                          <span className="font-medium text-sm truncate min-w-0 block">{conv.partnerDisplayName}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[240px]">
                                          <p className="break-words">{conv.partnerDisplayName}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <div className="flex items-center gap-2 shrink-0">
                                        {unreadCount > 0 && (
                                          <span
                                            className="h-5 min-w-[1.25rem] px-1 rounded-md bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center"
                                            title={`${unreadCount} unread`}
                                          >
                                            {unreadCount > 99 ? "99+" : unreadCount}
                                          </span>
                                        )}
                                        <span className="text-xs text-muted-foreground min-w-[4rem] text-right">{timeLabel}</span>
                                      </div>
                                    </div>
                                    <Tooltip delayDuration={400}>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground line-clamp-2 break-words mt-0.5 cursor-default">{snippet}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[280px]">
                                        <p className="break-words text-xs">{(conv.lastMessageFromMe ? "You: " : "") + (conv.lastMessageContent || "No messages yet")}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
              )}
              {/* Notifications - Mobile (only when signed in); tap/hover shows recent */}
              {user && (
                <HoverCard openDelay={200} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate("/notifications")}
                      title="Notifications"
                    >
                      <BellRing className="h-4 w-4" />
                      {notificationUnreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                          {notificationUnreadCount > 9 ? "9+" : notificationUnreadCount}
                        </span>
                      )}
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000]">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                      <span className="font-semibold text-sm">Recent Notifications</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); navigate("/notifications"); }} className="text-primary hover:underline text-xs font-medium">View All</button>
                    </div>
                    <ScrollArea className="h-[320px]">
                      {notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No notifications yet</div>
                      ) : (
                        <ul className="py-1">
                          {notifications.slice(0, 6).map((n) => {
                            const d = new Date(n.created_at);
                            const isToday = (x: Date) => { const t = new Date(); return x.getDate() === t.getDate() && x.getMonth() === t.getMonth() && x.getFullYear() === t.getFullYear(); };
                            const timeLabel = isToday(d) ? (Date.now() - d.getTime() < 60_000 ? "Just now" : format(d, "h:mm a")) : (Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? "Yesterday" : format(d, "MMM d"));
                            const msg = (n.message || "").length > 50 ? (n.message || "").slice(0, 50) + "…" : (n.message || "—");
                            return (
                              <li key={n.id}>
                                <button type="button" className={cn("w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60", !n.read && "bg-primary/5")} onClick={(e) => { e.preventDefault(); navigate(n.link || "/notifications"); }}>
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span className={cn("font-medium text-sm truncate flex-1", !n.read && "font-semibold")}>{n.title || "Notification"}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{timeLabel}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate w-full">{msg}</p>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
              )}
              {/* Project/Bids shortcut - Mobile (role aware); tap/hover shows recent */}
              {user && hasProjectShortcut && (
                <HoverCard openDelay={200} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(projectMenuPath)}
                      title={projectMenuTitle}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="end" className="w-96 min-w-[320px] max-w-[calc(100vw-2rem)] p-0 bg-popover border shadow-xl z-[10000] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                        <span className="font-semibold text-sm truncate min-w-0">{projectMenuTitle}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                      </div>
                      <ScrollArea className="h-[320px] w-full min-w-0 max-w-full overflow-hidden">
                        <div className="w-full min-w-0 max-w-full overflow-hidden pr-5">
                          {isDiggerMode ? (
                            recentBidsLoading ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                            ) : recentBids.length === 0 ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                            ) : (
                              <ul className="py-1 w-full min-w-0 list-none">
                                {recentBids.map((b) => {
                                  const timeLabel = format(new Date(b.created_at), "MMM d, yyyy");
                                  return (
                                    <li key={b.id} className="w-full min-w-0 overflow-hidden">
                                      <button
                                        type="button"
                                        className="w-full min-w-0 max-w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60 overflow-hidden box-border"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          if (b.gig_id) navigate(`/gig/${b.gig_id}`);
                                          else navigate("/my-bids");
                                        }}
                                      >
                                        <div className="w-full min-w-0 flex items-center justify-between gap-2">
                                          <span className="font-medium text-sm truncate min-w-0 flex-1" title={b.gig_title}>{b.gig_title}</span>
                                          <Badge variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] shrink-0 whitespace-nowrap">{b.status}</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate w-full min-w-0">{timeLabel}</p>
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            )
                          ) : recentGigsLoading ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                          ) : recentGigs.length === 0 ? (
                            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                          ) : (
                            <ul className="py-1 w-full min-w-0 list-none">
                              {recentGigs.map((g) => {
                                const timeLabel = format(new Date(g.created_at), "MMM d, yyyy");
                                const title = g.title || "Untitled project";
                                const displayTitle = title.length > 42 ? title.slice(0, 42).trim() + "…" : title;
                                return (
                                  <li key={g.id} className="w-full min-w-0 overflow-hidden">
                                    <button type="button" className="w-full min-w-0 max-w-full flex flex-col items-start gap-0.5 px-4 py-2.5 text-left hover:bg-muted/60 overflow-hidden box-border" onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }}>
                                      <div className="w-full min-w-0 flex items-center justify-between gap-2">
                                        <span className="font-medium text-sm truncate min-w-0 flex-1" title={title}>{displayTitle}</span>
                                        <Badge variant={g.status === "open" ? "default" : "secondary"} className="text-[10px] shrink-0 whitespace-nowrap">{g.status}</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground truncate w-full min-w-0">{timeLabel}</p>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      </ScrollArea>
                  </HoverCardContent>
                </HoverCard>
              )}
              {user && Array.isArray(userRoles) && userRoles.includes('digger') && !isGiggerMode && (
                <>
                  {/* Cart - Mobile (only for registered Diggers) */}
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
                </>
              )}

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
                            <AvatarImage src={userPhotoUrl || DEFAULT_AVATAR} alt="Profile" />
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

                      {/* Gigger-related: Hire Diggers (hidden in Digger mode) */}
                      {activeRole !== "digger" && (
                      <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Hire Diggers</p>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/post-gig") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/post-gig"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Post a gig</span>
                      </button>
                      {hasEnoughDiggers && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/browse-diggers") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                          )}
                          onClick={() => { navigate("/browse-diggers"); setMobileMenuOpen(false); }}
                        >
                          <span className="font-medium">Browse Diggers</span>
                        </button>
                      )}
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/get-free-quote") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/get-free-quote"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Get free quote</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/hire-a-pro") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/hire-a-pro"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Hire a pro</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/pricing") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/pricing"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Pricing</span>
                      </button>
                      </>
                      )}

                      {/* Digger-related: Find gigs (hidden in Gigger mode) */}
                      {activeRole !== "gigger" && (
                      <>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Find gigs</p>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/browse-gigs") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/browse-gigs"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Browse gigs</span>
                      </button>
                      {user && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/my-bids") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                          )}
                          onClick={() => { navigate("/my-bids"); setMobileMenuOpen(false); }}
                        >
                          <span className="font-medium">My bids</span>
                        </button>
                      )}
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/register") && location.search.includes("type=digger") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/register?mode=signup&type=digger"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Become a digger</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/digger-guide") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/digger-guide"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Digger guide</span>
                      </button>
                      </>
                      )}

                      {/* Why Digs & Gigs */}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">Why Digs & Gigs</p>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/about") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/about"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">About</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/how-it-works") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/how-it-works"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">How it works</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/faq") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/faq"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">FAQ</span>
                      </button>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/compare") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/compare"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Compare</span>
                      </button>

                      {/* What's new */}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">What&apos;s new</p>
                      <button
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isActive("/blog") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                        )}
                        onClick={() => { navigate("/blog"); setMobileMenuOpen(false); }}
                      >
                        <span className="font-medium">Blog</span>
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

                      {user && (
                        <button
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/50"
                          onClick={() => {
                            if (userHandle) navigate(`/profile/${userHandle}`);
                            else if (user?.id && userRoles.includes("gigger")) navigate(getCanonicalGiggerProfilePath(user.id));
                            else navigate("/my-profiles");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <User className="h-4 w-4" />
                          <span className="font-medium">View profile</span>
                        </button>
                      )}

                      {user && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/messages") 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            navigate("/messages");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="font-medium">Messages</span>
                          {unreadMessagesCount > 0 && (
                            <span
                              className="ml-auto h-5 min-w-[1.25rem] px-1 rounded-md bg-destructive text-[10px] font-semibold text-destructive-foreground flex items-center justify-center shrink-0"
                              title={`${unreadMessagesCount} unread messages`}
                            >
                              {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                            </span>
                          )}
                        </button>
                      )}
                      {user && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/notifications") 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            navigate("/notifications");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <BellRing className="h-4 w-4" />
                          <span className="font-medium">Notifications</span>
                        </button>
                      )}
                      {user && userRoles.includes('gigger') && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/my-gigs") 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            navigate("/my-gigs");
                            setMobileMenuOpen(false);
                          }}
                        >
                          <FolderOpen className="h-4 w-4" />
                          <span className="font-medium">My projects</span>
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
                              onClick={async () => {
                                await switchRole(role);
                                if (role === "gigger" && user?.id && (/^\/digger\//.test(location.pathname) || /^\/profile\/[^/]+\/digger/.test(location.pathname))) {
                                  navigate(getCanonicalGiggerProfilePath(user.id));
                                } else if (role === "digger" && /^\/gigger\//.test(location.pathname)) {
                                  navigate("/my-profile");
                                }
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
                            className="w-full bg-gradient-accent text-accent-foreground font-semibold rounded-lg shadow-accent hover-glow-accent transition-all duration-200 border-0"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              navigate("/register");
                            }}
                          >
                            Sign Up
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
      <Dialog open={showGetStartedModal} onOpenChange={setShowGetStartedModal}>
        <DialogContent className="max-w-2xl sm:rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold">How do you want to get started?</DialogTitle>
            <DialogDescription>
              Choose the path that matches your goals and we&apos;ll tailor the onboarding experience for you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setShowGetStartedModal(false);
                navigate("/register?type=gigger");
              }}
              className="group flex h-full flex-col rounded-2xl border border-border/60 bg-background/90 p-5 text-left shadow-sm transition-all hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">For Giggers</p>
                  <h3 className="text-lg font-semibold text-foreground">Hire Diggers for your gigs</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Post gigs for free, review bids from Diggers, and only pay when you award or unlock leads.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGetStartedModal(false);
                navigate("/register?type=digger");
              }}
              className="group flex h-full flex-col rounded-2xl border border-border/60 bg-background/90 p-5 text-left shadow-sm transition-all hover:border-accent hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
                  <Rocket className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">For Diggers</p>
                  <h3 className="text-lg font-semibold text-foreground">Find gigs & snag leads</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Browse open gigs, bid or buy leads, get awarded—and keep the rest. No membership required.
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGetStartedModal(false)}>
              Maybe later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
