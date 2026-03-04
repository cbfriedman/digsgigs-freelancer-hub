import { useState, useEffect, useRef } from "react";
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
  ArrowRight,
  Receipt,
  Search
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
import { useRecentPostedGigs } from "@/hooks/useRecentPostedGigs";
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
import { Input } from "@/components/ui/input";

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
  const [headerGigSearch, setHeaderGigSearch] = useState("");
  const isDiggerMode = activeRole === "digger";
  const headerSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync header search from URL when on browse-gigs (e.g. landed with ?q=)
  useEffect(() => {
    if (location.pathname === "/browse-gigs") {
      const q = new URLSearchParams(location.search).get("q");
      setHeaderGigSearch(q ?? "");
    }
  }, [location.pathname, location.search]);

  // When on browse-gigs, typing in header updates URL (debounced) so page filters as you type
  useEffect(() => {
    if (location.pathname !== "/browse-gigs" || !isDiggerMode) return;
    if (headerSearchDebounceRef.current) clearTimeout(headerSearchDebounceRef.current);
    headerSearchDebounceRef.current = setTimeout(() => {
      const q = headerGigSearch.trim();
      const wantSearch = q ? `?q=${encodeURIComponent(q)}` : "";
      const currentSearch = location.search ? location.search : "";
      if (wantSearch !== currentSearch) {
        navigate(`/browse-gigs${wantSearch}`, { replace: true });
      }
      headerSearchDebounceRef.current = null;
    }, 280);
    return () => {
      if (headerSearchDebounceRef.current) clearTimeout(headerSearchDebounceRef.current);
    };
  }, [headerGigSearch, location.pathname, location.search, isDiggerMode, navigate]);
  const isGiggerMode = activeRole === "gigger";
  const hasProjectShortcut = userRoles.includes("gigger") || userRoles.includes("digger");
  const { gigs: recentPostedGigs, totalOpenCount, loading: recentPostedGigsLoading } = useRecentPostedGigs(isDiggerMode && hasProjectShortcut);
  const projectMenuPath = isDiggerMode ? "/browse-gigs" : "/my-gigs";
  const projectMenuTitle = isDiggerMode
    ? (totalOpenCount > 0 ? `Recent posted gigs (${totalOpenCount})` : "Recent posted gigs")
    : "My Projects";
  const projectEmptyLabel = isDiggerMode ? "No recent gigs" : "No projects yet";

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

  /** Status label for gig (capitalize, replace underscore). */
  const gigStatusLabel = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ") : status;
  /** Minimal status text color (no badge). */
  const gigStatusClass = (status: string) => {
    if (status === "completed") return "text-green-700 dark:text-green-600";
    if (status === "open") return "text-violet-600 dark:text-violet-400";
    if (status === "in_progress") return "text-blue-600 dark:text-blue-400";
    if (status === "pending" || status === "pending_confirmation") return "text-gray-500 dark:text-gray-400";
    if (status === "awarded") return "text-green-500 dark:text-green-400";
    return "text-gray-500 dark:text-gray-400";
  };

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
? "bg-background border-b border-border shadow-sm"
            : "bg-background border-b border-border/50"
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
                <DropdownMenuItem onClick={() => navigate("/post-gig?quick=1")} className="cursor-pointer">
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
                {user && (
                  <DropdownMenuItem onClick={() => navigate("/my-leads")} className="cursor-pointer">
                    My leads
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

              {/* About & help */}
              <NavDropdown
                id="why"
                trigger={
                  <button className={cn(navLinkClass, "flex items-center gap-0.5")}>
                    About
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                }
              >
                <DropdownMenuItem onClick={() => navigate("/about")} className="cursor-pointer">
                  About us
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

            {/* Center: Search gigs (Digger mode only, desktop) */}
            {isDiggerMode && (
              <div className="hidden md:flex flex-1 min-w-0 max-w-md mx-2 lg:mx-4">
                <form
                  className="relative w-full"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = headerGigSearch.trim();
                    if (q) navigate(`/browse-gigs?q=${encodeURIComponent(q)}`);
                    else navigate("/browse-gigs");
                  }}
                >
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search gigs..."
                    value={headerGigSearch}
                    onChange={(e) => setHeaderGigSearch(e.target.value)}
                    className="pl-8 h-9 w-full bg-muted/50 border-border/60 text-sm"
                    aria-label="Search gigs"
                  />
                </form>
              </div>
            )}

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
                    className="bg-accent text-accent-foreground font-semibold rounded-lg border-0"
                  >
                    Sign Up
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Gigger mode: prominent "Post a gig" in front of Messages */}
                  {user && isGiggerMode && userRoles.includes("gigger") && (
                    <Button
                      size="sm"
                      className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                      onClick={() => navigate("/post-gig?quick=1")}
                    >
                      Post a gig
                    </Button>
                  )}
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
                    <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[400px] sm:min-w-[280px] sm:w-[400px] p-0 bg-popover border shadow-md z-[10000]">
                      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                        <span className="font-semibold text-sm truncate min-w-0">Recent Messages</span>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); navigate("/messages"); }}
                          className="text-primary hover:underline text-xs font-medium shrink-0 ml-2"
                        >
                          View All
                        </button>
                      </div>
                      <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
                        {recentConversationsLoading ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                        ) : recentConversations.length === 0 ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No conversations yet</div>
                        ) : (
                          <ul className="py-1">
                            {recentConversations.map((conv) => {
                              const unreadCount = conv.unreadCount ?? 0;
                              const meta = conv.lastMessageMetadata;
                              const isAwardEvent = meta?._type === "award_event" && meta?.event;
                              const fullSnippet = isAwardEvent
                                ? `${conv.lastMessageFromMe ? "You: " : ""}${meta!.event === "awarded" ? "🏆 Awarded" : meta!.event === "accepted" ? "✓ Accepted" : meta!.event === "cancelled" ? "⊘ Client cancelled" : "✗ Freelancer declined"}`
                                : conv.lastMessageContent
                                  ? `${conv.lastMessageFromMe ? "You: " : ""}${conv.lastMessageContent}`
                                  : "No messages yet";
                              const maxPreviewLen = 28;
                              const snippet = fullSnippet.length > maxPreviewLen ? fullSnippet.slice(0, maxPreviewLen) + "…" : fullSnippet;
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
                                    className="w-full flex items-start gap-3 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0"
                                    onClick={(e) => { e.preventDefault(); navigate(`/messages?conversation=${conv.id}`); }}
                                  >
                                    <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                                      <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" className="object-cover" />
                                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                        {conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1 overflow-hidden pr-1 min-w-[180px]">
                                      <div className="flex items-center justify-between gap-2 min-w-0">
                                        <Tooltip delayDuration={400}>
                                          <TooltipTrigger asChild>
                                            <span className="font-medium text-sm truncate min-w-0 block">{conv.partnerDisplayName}</span>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[280px]">
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
                                          <span className="text-xs text-muted-foreground shrink-0 text-right tabular-nums">{timeLabel}</span>
                                        </div>
                                      </div>
                                      <Tooltip delayDuration={400}>
                                        <TooltipTrigger asChild>
                                          <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden mt-0.5 cursor-default">{snippet}</p>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[320px]">
                                          <p className="break-words text-xs">{fullSnippet}</p>
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
                    <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[24rem] sm:min-w-[280px] sm:w-96 p-0 bg-popover border shadow-md z-[10000]">
                      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                        <span className="font-semibold text-sm truncate min-w-0">Recent Notifications</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate("/notifications"); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                      </div>
                      <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
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
                                    className={cn("w-full flex flex-col items-start gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0", !n.read && "bg-primary/5")}
                                    onClick={(e) => { e.preventDefault(); navigate(n.link || "/notifications"); }}
                                  >
                                    <div className="w-full min-w-0 flex flex-col items-start gap-0.5 overflow-hidden">
                                      <div className="flex items-start justify-between w-full gap-2">
                                        <span className={cn("font-medium text-sm break-words line-clamp-2 flex-1 min-w-0", !n.read && "font-semibold")}>{n.title || "Notification"}</span>
                                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{timeLabel}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground break-words line-clamp-2 w-full min-w-0">{msg}</p>
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
                  {/* Project/Bids shortcut - role aware; hover shows recent (gigger) */}
                  {hasProjectShortcut && (
                  <HoverCard openDelay={300} closeDelay={150}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(projectMenuPath)}
                        title={projectMenuTitle}
                      >
                        <FolderOpen className="h-4 w-4" />
                        {isDiggerMode && totalOpenCount > 0 && (
                          <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {totalOpenCount > 99 ? "99+" : totalOpenCount}
                          </span>
                        )}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[420px] sm:min-w-[300px] sm:w-[420px] p-0 bg-popover border shadow-md z-[10000]">
                      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                        <span className="font-semibold text-sm truncate min-w-0">{projectMenuTitle}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                      </div>
                      <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
                            {isDiggerMode ? (
                              recentPostedGigsLoading ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                              ) : recentPostedGigs.length === 0 ? (
                                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                              ) : (
                                <ul className="py-1">
                                  {recentPostedGigs.map((g) => {
                                    const timeLabel = format(new Date(g.created_at), "MMM d, yyyy");
                                    const title = g.title || "Untitled gig";
                                    return (
                                      <li key={g.id}>
                                        <button
                                          type="button"
                                          className="w-full flex flex-col items-stretch gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0 justify-center"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            navigate(`/gig/${g.id}`);
                                          }}
                                        >
                                          <span className="font-medium text-sm break-words line-clamp-2" title={title}>{title}</span>
                                          <div className="flex items-center justify-between gap-2 mt-0.5 flex-wrap">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeLabel}</span>
                                            <span className={cn("text-[10px] whitespace-nowrap font-normal", gigStatusClass(g.status))}>{gigStatusLabel(g.status)}</span>
                                          </div>
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
                              <ul className="py-1">
                                {recentGigs.map((g) => {
                                  const d = new Date(g.created_at);
                                  const timeLabel = format(d, "MMM d, yyyy");
                                  const title = g.title || "Untitled project";
                                  return (
                                    <li key={g.id}>
                                      <button
                                        type="button"
                                        className="w-full flex flex-col items-stretch gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0 justify-center"
                                        onClick={(e) => { e.preventDefault(); navigate(`/gig/${g.id}`); }}
                                      >
                                        <span className="font-medium text-sm break-words line-clamp-2" title={title}>{title}</span>
                                        <div className="flex items-center justify-between gap-2 mt-0.5 flex-wrap">
                                          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeLabel}</span>
                                          <span className={cn("text-[10px] whitespace-nowrap font-normal", gigStatusClass(g.status))}>{gigStatusLabel(g.status)}</span>
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
                          <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Show current mode when user has both Digger and Gigger so they're never confused */}
                        {user && userRoles.includes("digger") && userRoles.includes("gigger") && (
                          <span className={cn(
                            "hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
                            activeRole === "digger" ? "bg-primary/10 text-primary border-primary/30" : "bg-accent/50 text-accent-foreground border-accent/50"
                          )}>
                            {activeRole === "digger" ? "🔧 Digger" : "📋 Gigger"}
                          </span>
                        )}
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
                      <DropdownMenuItem onClick={() => navigate('/transactions')} className="cursor-pointer">
                        <Receipt className="h-4 w-4 mr-2" />
                        Transaction
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Dark Mode - prevent close on toggle */}
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-default focus:bg-transparent focus:outline-none">
                        <ThemeToggle className="w-full" />
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Role selection: make Digger vs Gigger mode unmistakable */}
                      {userRoles.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Viewing as: {roleConfig[activeRole]?.emoji} {roleConfig[activeRole]?.label}
                          </DropdownMenuLabel>
                          {userRoles.map((role) => {
                            const isActive = activeRole === role;
                            return (
                              <DropdownMenuItem
                                key={role}
                                onClick={isActive ? undefined : async () => {
                                  await switchRole(role);
                                  if (role === "gigger" && user?.id && (/^\/digger\//.test(location.pathname) || /^\/profile\/[^/]+\/digger/.test(location.pathname))) {
                                    navigate(getCanonicalGiggerProfilePath(user.id));
                                  } else if (role === "digger" && /^\/gigger\//.test(location.pathname)) {
                                    navigate("/my-profile");
                                  }
                                }}
                                className={cn(
                                  isActive ? "cursor-default bg-accent/50 opacity-100" : "cursor-pointer transition-colors",
                                  "transition-colors"
                                )}
                                disabled={isActive}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <span>{roleConfig[role].emoji}</span>
                                    <span>{isActive ? `Current: ${roleConfig[role].label}` : `Switch to ${roleConfig[role].label}`}</span>
                                  </div>
                                  {isActive && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                      Active
                                    </Badge>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            );
                          })}
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
              {/* Post a gig - Mobile (Gigger mode only) */}
              {user && isGiggerMode && userRoles.includes("gigger") && (
                <Button
                  size="sm"
                  className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs px-2.5 h-8"
                  onClick={() => navigate("/post-gig?quick=1")}
                >
                  Post a gig
                </Button>
              )}
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
                  <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[400px] sm:min-w-[280px] sm:w-[400px] p-0 bg-popover border shadow-md z-[10000]">
                    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                      <span className="font-semibold text-sm truncate min-w-0">Recent Messages</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); navigate("/messages"); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                    </div>
                    <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
                      {recentConversationsLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                      ) : recentConversations.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">No conversations yet</div>
                      ) : (
                        <ul className="py-1">
                          {recentConversations.map((conv) => {
                            const unreadCount = conv.unreadCount ?? 0;
                            const meta = conv.lastMessageMetadata;
                            const isAwardEvent = meta?._type === "award_event" && meta?.event;
                            const fullSnippet = isAwardEvent
                              ? `${conv.lastMessageFromMe ? "You: " : ""}${meta!.event === "awarded" ? "🏆 Awarded" : meta!.event === "accepted" ? "✓ Accepted" : meta!.event === "cancelled" ? "⊘ Client cancelled" : "✗ Freelancer declined"}`
                              : conv.lastMessageContent
                                ? `${conv.lastMessageFromMe ? "You: " : ""}${conv.lastMessageContent}`
                                : "No messages yet";
                            const maxPreviewLen = 28;
                            const snippet = fullSnippet.length > maxPreviewLen ? fullSnippet.slice(0, maxPreviewLen) + "…" : fullSnippet;
                            const d = new Date(conv.updatedAt);
                            const isToday = (x: Date) => { const t = new Date(); return x.getDate() === t.getDate() && x.getMonth() === t.getMonth() && x.getFullYear() === t.getFullYear(); };
                            const timeLabel = isToday(d) ? (Date.now() - d.getTime() < 60_000 ? "Just now" : format(d, "HH:mm")) : (Date.now() - d.getTime() < 24 * 60 * 60 * 1000 ? "Yesterday" : format(d, "MMM d"));
                            return (
                              <li key={conv.id}>
                                <button type="button" className="w-full flex items-start gap-3 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 min-h-[44px] sm:min-h-0" onClick={(e) => { e.preventDefault(); navigate(`/messages?conversation=${conv.id}`); }}>
                                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/50">
                                    <AvatarImage src={conv.partnerAvatarUrl || undefined} alt="" className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{conv.partnerDisplayName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1 overflow-hidden pr-1 min-w-[180px]">
                                    <div className="flex items-center justify-between gap-2 min-w-0">
                                      <Tooltip delayDuration={400}>
                                        <TooltipTrigger asChild>
                                          <span className="font-medium text-sm truncate min-w-0 block">{conv.partnerDisplayName}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-[280px]">
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
                                        <span className="text-xs text-muted-foreground shrink-0 text-right tabular-nums">{timeLabel}</span>
                                      </div>
                                    </div>
                                    <Tooltip delayDuration={400}>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden mt-0.5 cursor-default">{snippet}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-[320px]">
                                        <p className="break-words text-xs">{fullSnippet}</p>
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
                  <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[24rem] sm:min-w-[280px] sm:w-96 p-0 bg-popover border shadow-md z-[10000]">
                    <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                      <span className="font-semibold text-sm truncate min-w-0">Recent Notifications</span>
                      <button type="button" onClick={(e) => { e.preventDefault(); navigate("/notifications"); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                    </div>
                    <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
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
                                <button type="button" className={cn("w-full flex flex-col items-start gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0", !n.read && "bg-primary/5")} onClick={(e) => { e.preventDefault(); navigate(n.link || "/notifications"); }}>
                                  <div className="w-full min-w-0 flex flex-col items-start gap-0.5 overflow-hidden">
                                    <div className="flex items-start justify-between w-full gap-2">
                                      <span className={cn("font-medium text-sm break-words line-clamp-2 flex-1 min-w-0", !n.read && "font-semibold")}>{n.title || "Notification"}</span>
                                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{timeLabel}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground break-words line-clamp-2 w-full min-w-0">{msg}</p>
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
              {/* Project/Bids shortcut - Mobile (role aware); tap/hover shows recent */}
              {user && hasProjectShortcut && (
                <HoverCard openDelay={200} closeDelay={150}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                      onClick={() => navigate(projectMenuPath)}
                      title={projectMenuTitle}
                    >
                      <FolderOpen className="h-4 w-4" />
                      {isDiggerMode && totalOpenCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                          {totalOpenCount > 99 ? "99+" : totalOpenCount}
                        </span>
                      )}
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="bottom" align="center" className="w-[calc(100vw-2rem)] min-w-0 max-w-[420px] sm:min-w-[300px] sm:w-[420px] p-0 bg-popover border shadow-md z-[10000]">
                      <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b">
                        <span className="font-semibold text-sm truncate min-w-0">{projectMenuTitle}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); navigate(projectMenuPath); }} className="text-primary hover:underline text-xs font-medium shrink-0 ml-2">View All</button>
                      </div>
                      <ScrollArea className="h-[min(280px,65vh)] sm:h-[320px]">
                          {isDiggerMode ? (
                            recentPostedGigsLoading ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">Loading...</div>
                            ) : recentPostedGigs.length === 0 ? (
                              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">{projectEmptyLabel}</div>
                            ) : (
                              <ul className="py-1">
                                {recentPostedGigs.map((g) => {
                                  const timeLabel = format(new Date(g.created_at), "MMM d, yyyy");
                                  const title = g.title || "Untitled gig";
                                  return (
                                    <li key={g.id}>
                                      <button
                                        type="button"
                                        className="w-full flex flex-col items-stretch gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0 justify-center"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          navigate(`/gig/${g.id}`);
                                        }}
                                      >
                                        <span className="font-medium text-sm break-words line-clamp-2" title={title}>{title}</span>
                                        <div className="flex items-center justify-between gap-2 mt-0.5 flex-wrap">
                                          <span className="text-xs text-muted-foreground whitespace-nowrap">{timeLabel}</span>
                                          <span className={cn("text-[10px] whitespace-nowrap font-normal", gigStatusClass(g.status))}>{gigStatusLabel(g.status)}</span>
                                        </div>
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
                            <ul className="py-1">
                              {recentGigs.map((g) => {
                                const timeLabel = format(new Date(g.created_at), "MMM d, yyyy");
                                const title = g.title || "Untitled project";
                                return (
                                  <li key={g.id}>
                                    <button type="button" className="w-full flex flex-col items-stretch gap-0.5 px-3 py-2.5 sm:px-4 text-left hover:bg-muted/60 transition-colors min-h-[44px] sm:min-h-0 justify-center" onClick={(e) => { e.preventDefault(); navigate(`/gig/${g.id}`); }}>
                                      <span className="font-medium text-sm break-words line-clamp-2" title={title}>{title}</span>
                                      <div className="flex items-center justify-between gap-2 mt-0.5 flex-wrap">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{timeLabel}</span>
                                        <span className={cn("text-[10px] whitespace-nowrap font-normal", gigStatusClass(g.status))}>{gigStatusLabel(g.status)}</span>
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
                            <AvatarFallback className="bg-muted text-foreground text-sm font-medium">
                              {getUserInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{userDisplayName || user.email?.split('@')[0]}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            {/* Show current mode when user has both roles so they're never confused */}
                            {userRoles.includes("digger") && userRoles.includes("gigger") && (
                              <p className="text-xs font-medium mt-1.5 text-foreground/80">
                                Viewing as: {activeRole === "digger" ? "🔧 Digger" : "📋 Gigger"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Links */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      <div className="flex items-center justify-between py-2 px-1 mb-2 border-b border-border/50">
                        <ThemeToggle />
                      </div>
                      {isDiggerMode && (
                        <form
                          className="mb-3"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const q = headerGigSearch.trim();
                            setMobileMenuOpen(false);
                            if (q) navigate(`/browse-gigs?q=${encodeURIComponent(q)}`);
                            else navigate("/browse-gigs");
                          }}
                        >
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="search"
                              placeholder="Search gigs..."
                              value={headerGigSearch}
                              onChange={(e) => setHeaderGigSearch(e.target.value)}
                              className="pl-8 h-9 w-full"
                              aria-label="Search gigs"
                            />
                          </div>
                        </form>
                      )}
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
                        onClick={() => { navigate("/post-gig?quick=1"); setMobileMenuOpen(false); }}
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
                      {user && (
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                            isActive("/my-leads") ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                          )}
                          onClick={() => { navigate("/my-leads"); setMobileMenuOpen(false); }}
                        >
                          <span className="font-medium">My leads</span>
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

                      {/* About */}
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-4 pb-1">About</p>
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

                      {/* Role Switcher: make Digger vs Gigger mode unmistakable */}
                      {user && userRoles.length > 0 && (
                        <>
                          <div className="pt-4 pb-2">
                            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Viewing as: {roleConfig[activeRole]?.emoji} {roleConfig[activeRole]?.label}
                            </p>
                          </div>
                          {userRoles.map((role) => {
                            const isActive = activeRole === role;
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={isActive}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors",
                                  isActive
                                    ? "bg-primary/10 text-primary cursor-default opacity-100"
                                    : "hover:bg-muted/50 active:bg-muted"
                                )}
                                onClick={isActive ? undefined : async () => {
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
                                  <span className="font-medium">{isActive ? `Current: ${roleConfig[role].label}` : `Switch to ${roleConfig[role].label}`}</span>
                                </div>
                                {isActive && (
                                  <Badge variant="secondary" className="text-[10px] shrink-0">Active</Badge>
                                )}
                              </button>
                            );
                          })}
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
                            className="w-full bg-accent text-accent-foreground font-semibold rounded-lg border-0"
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
        <DialogContent className="max-w-2xl sm:rounded-lg">
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
              className="group flex h-full flex-col rounded-lg border border-border bg-background p-5 text-left shadow-sm hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
              className="group flex h-full flex-col rounded-lg border border-border bg-background p-5 text-left shadow-sm hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
