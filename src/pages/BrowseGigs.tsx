import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Search, DollarSign, Calendar, Tag, Users, ShoppingCart, Info, Map, List, Filter, HandHeart, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { GigAdvancedFilters, type GigFilters, type IndustryCategoryWithProfessions } from "@/components/GigAdvancedFilters";
import { useProfessions } from "@/hooks/useProfessions";
import { MapView } from "@/components/MapView";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import SEOHead from "@/components/SEOHead";
import { formatSelectionDisplay, getFlagForCountryName, getCodeForCountryName } from "@/config/regionOptions";

/** Names used when posting gigs (PostGig) – show these first in filters so they match project categories. */
const PROJECT_CATEGORY_NAMES = [
  "Web Development",
  "Graphic Design",
  "Digital Marketing",
  "Content Writing",
  "Software & Web Development",
  "Design & Creative",
  "Marketing & Growth",
  "AI & Automation",
  "Business Systems & Operations",
  "Content & Media",
];

interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
}

function sortCategoriesForDisplay<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const aProject = PROJECT_CATEGORY_NAMES.indexOf(a.name);
    const bProject = PROJECT_CATEGORY_NAMES.indexOf(b.name);
    if (aProject !== -1 && bProject !== -1) return aProject - bProject;
    if (aProject !== -1) return -1;
    if (bProject !== -1) return 1;
    return a.name.localeCompare(b.name);
  });
}

/** Expand selected category IDs: when a parent is selected, include all its subcategory IDs so gigs match. */
function expandCategoryIds(selectedIds: string[], allCategories: Category[]): string[] {
  const out = new Set<string>();
  for (const id of selectedIds) {
    out.add(id);
    const children = allCategories.filter((c) => c.parent_category_id === id);
    children.forEach((c) => out.add(c.id));
  }
  return Array.from(out);
}

interface Gig {
  id: string;
  consumer_id: string | null;
  client_name: string | null;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  purchase_count: number;
  created_at: string;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  preferred_regions?: string[] | null;
  skills_required?: string[] | null;
  gig_skills?: { skills: { name: string } | null }[] | null;
  poster_country?: string | null;
  categories: {
    name: string;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

const BrowseGigs = () => {
  const navigate = useNavigate();
  const { categoriesWithProfessions: rawCategoriesWithProfessions } = useProfessions();
  const [gigs, setGigs] = useState<Gig[]>([]);
  /** All categories from DB (parents + subcategories) so all are displayed and filters match project category_id */
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  /** Real professions + keywords for filter UI and keyword matching */
  const categoriesWithProfessions: IndustryCategoryWithProfessions[] = (rawCategoriesWithProfessions || []).map(
    (c) => ({
      id: c.id,
      name: c.name,
      professions: (c.professions || []).map((p) => ({
        id: p.id,
        name: p.name,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
      })),
    })
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [diggerProfile, setDiggerProfile] = useState<any>(null);
  const [leadsPurchasedThisPeriod, setLeadsPurchasedThisPeriod] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [userBids, setUserBids] = useState<Set<string>>(new Set());
  const [userLeadPurchases, setUserLeadPurchases] = useState<Set<string>>(new Set());
  const [advancedFilters, setAdvancedFilters] = useState<GigFilters>({
    budgetRange: [0, 50000],
    selectedCategories: [],
    selectedProfessionIds: [],
    selectedKeywords: [],
    locationRadius: 50,
    postedSince: 'all',
    sortBy: 'newest',
  });
  const [showEscrowGigs, setShowEscrowGigs] = useState(true);
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(new Set());
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();

  const toggleDescription = (gigId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedDescriptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(gigId)) next.delete(gigId);
      else next.add(gigId);
      return next;
    });
  };

  useEffect(() => {
    loadDiggerData();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCategory, budgetFilter, diggerProfile, advancedFilters]);

  // Real-time: when a new open gig is posted, add it to the list without refresh
  const gigsChannelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel("browse-gigs:new-gigs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gigs" },
        async (payload) => {
          const row = payload.new as { id: string; status: string };
          if (row?.status !== "open") return;
          try {
            const { data: newGig, error } = await (supabase
              .from("gigs") as any)
              .select(
                `
                id, consumer_id, title, description, budget_min, budget_max, timeline, location, category_id,
                preferred_regions, status, created_at, bumped_at, deadline, poster_country, skills_required, purchase_count,
                categories (name),
                profiles!gigs_consumer_id_fkey (full_name),
                gig_skills (skills (name))
              `
              )
              .eq("id", row.id)
              .single();
            if (error || !newGig) return;
            setGigs((prev: any) => {
              if (prev.some((g: any) => g.id === newGig.id)) return prev;
              return [newGig as Gig, ...prev];
            });
          } catch {
            // ignore
          }
        }
      )
      .subscribe();
    gigsChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      gigsChannelRef.current = null;
    };
  }, []);

  // Debug: Log digger profile and bids for troubleshooting
  useEffect(() => {
    if (diggerProfile) {
      console.log('[BrowseGigs] Digger profile loaded:', {
        id: diggerProfile.id,
        hasProfile: !!diggerProfile
      });
    }
    console.log('[BrowseGigs] User bids:', Array.from(userBids));
  }, [diggerProfile, userBids]);

  const loadDiggerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get digger profile with lead limit settings
      const { data: profile } = await supabase
        .from('digger_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setDiggerProfile(profile);

        // Fetch user's bids
        const { data: bids } = await supabase
          .from('bids')
          .select('gig_id')
          .eq('digger_id', profile.id);

        if (bids) {
          setUserBids(new Set(bids.map(b => b.gig_id)));
        }

        // Fetch user's lead purchases
        const { data: purchases } = await supabase
          .from('lead_purchases')
          .select('gig_id')
          .eq('digger_id', profile.id)
          .eq('status', 'completed');

        if (purchases) {
          setUserLeadPurchases(new Set(purchases.map(p => p.gig_id)));
        }

        // Count leads purchased in current period
        if ((profile as any).lead_limit_enabled && (profile as any).lead_limit) {
          const now = new Date();
          const startDate = new Date();

          if ((profile as any).lead_limit_period === 'daily') {
            startDate.setHours(0, 0, 0, 0);
          } else if ((profile as any).lead_limit_period === 'weekly') {
            const day = startDate.getDay();
            startDate.setDate(startDate.getDate() - day);
            startDate.setHours(0, 0, 0, 0);
          } else {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
          }

          const { data: purchases } = await supabase
            .from('lead_purchases')
            .select('id')
            .eq('digger_id', profile.id)
            .gte('purchased_at', startDate.toISOString());

          const purchaseCount = purchases?.length || 0;
          setLeadsPurchasedThisPeriod(purchaseCount);
          setLimitReached(purchaseCount >= (profile as any).lead_limit);
        }
      }
    } catch (error) {
      console.error('Error loading digger data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);

    const { data: categoriesData, error: categoriesError } = await supabase
      .from("categories")
      .select("id, name, parent_category_id")
      .order("name");

    if (categoriesError) {
      console.error("Error loading categories:", categoriesError);
      toast.error("Failed to load categories");
    }

    const allList = categoriesData || [];
    setAllCategories(sortCategoriesForDisplay(allList));

    let query = (supabase
      .from("gigs") as any)
      .select(`
        id, consumer_id, title, description, budget_min, budget_max, timeline, location, category_id,
        preferred_regions, status, created_at, bumped_at, deadline, poster_country, skills_required, purchase_count,
        categories (name),
        profiles!gigs_consumer_id_fkey (full_name),
        gig_skills (skills (name))
      `)
      .eq("status", "open")
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      const categoryIds = expandCategoryIds([selectedCategory], allList);
      query = query.in("category_id", categoryIds);
    }

    if (budgetFilter !== "all") {
      if (budgetFilter === "under1k") {
        query = query.lte("budget_max", 1000);
      } else if (budgetFilter === "1k-5k") {
        query = query.gte("budget_min", 1000).lte("budget_max", 5000);
      } else if (budgetFilter === "over5k") {
        query = query.gte("budget_min", 5000);
      }
    }

    // Apply advanced filters
    if (advancedFilters.budgetRange[0] > 0) {
      query = query.gte("budget_min", advancedFilters.budgetRange[0]);
    }
    if (advancedFilters.budgetRange[1] < 50000) {
      query = query.lte("budget_max", advancedFilters.budgetRange[1]);
    }
    if (advancedFilters.selectedCategories.length > 0) {
      const categoryIds = expandCategoryIds(
        advancedFilters.selectedCategories,
        allList
      );
      query = query.in("category_id", categoryIds);
    }

    if (advancedFilters.postedSince !== 'all') {
      const since = new Date();
      if (advancedFilters.postedSince === '24h') since.setDate(since.getDate() - 1);
      else if (advancedFilters.postedSince === '7d') since.setDate(since.getDate() - 7);
      else if (advancedFilters.postedSince === '30d') since.setDate(since.getDate() - 30);
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load gigs");
      setLoading(false);
      return;
    }

    setGigs(data || []);
    setLoading(false);
  };

  const selectedProfessionIds = advancedFilters.selectedProfessionIds ?? [];
  const selectedKeywords = advancedFilters.selectedKeywords ?? [];
  const professionKeywords =
    selectedProfessionIds.length > 0 || selectedKeywords.length > 0
      ? new Set([
          ...categoriesWithProfessions
            .flatMap((c) => c.professions)
            .filter((p) => selectedProfessionIds.includes(p.id))
            .flatMap((p) => (p.keywords || []).map((k) => k.toLowerCase())),
          ...selectedKeywords.map((k) => k.toLowerCase()),
        ])
      : null;

  const filteredGigs = gigs.filter((gig) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchLower ||
      gig.title.toLowerCase().includes(searchLower) ||
      gig.description.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    if (diggerProfile && !showEscrowGigs && (gig as any).escrow_requested_by_consumer) {
      return false;
    }

    if (professionKeywords && professionKeywords.size > 0) {
      const gigText = [
        gig.title,
        gig.description,
        (gig as any).requirements || "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesProfession = [...professionKeywords].some((kw) => gigText.includes(kw));
      if (!matchesProfession) return false;
    }

    return true;
  });

  const isOldGig = (createdAt: string) => {
    const gigAge = Date.now() - new Date(createdAt).getTime();
    return gigAge > 24 * 60 * 60 * 1000; // >24 hours
  };

  const canSeeBudget = () => {
    // Everyone (including diggers) can see budget so diggers can tailor proposals and bid within range
    return true;
  };

  const newGigs = filteredGigs.filter(gig => !isOldGig(gig.created_at));
  const oldGigs = filteredGigs.filter(gig => isOldGig(gig.created_at));

  let displayGigs = limitReached && (diggerProfile as any)?.lead_limit_enabled 
    ? oldGigs 
    : filteredGigs;

  const sortGigs = <T extends { created_at: string; budget_min: number | null; budget_max: number | null }>(list: T[]) => {
    const sorted = [...list];
    switch (advancedFilters.sortBy) {
      case 'oldest':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'budget_asc':
        sorted.sort((a, b) => (a.budget_min ?? 0) - (b.budget_min ?? 0));
        break;
      case 'budget_desc':
        sorted.sort((a, b) => (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0));
        break;
      default:
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  };
  displayGigs = sortGigs(displayGigs);

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Browse Local Service Gigs - Find Projects & Jobs"
        description="Discover open gigs posted by Giggers. Search by category, location, and budget. Bid or buy leads—get awarded and keep the rest."
        keywords="service gigs, local jobs, contractor projects, freelance gigs, home service jobs, find work, service opportunities"
      />
      
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Gigs</h1>
          <p className="text-muted-foreground text-lg">Find projects that match your skills. See budget, location &amp; skills at a glance — bid free or buy the lead to unlock contact.</p>
          {(diggerProfile as any)?.lead_limit_enabled && (
            <div className="mt-4">
              <Badge variant={limitReached ? "destructive" : "secondary"} className="text-sm">
                Leads this period: {leadsPurchasedThisPeriod} / {(diggerProfile as any).lead_limit}
              </Badge>
              {limitReached && (
                <p className="text-sm text-muted-foreground mt-2">
                  Limit reached. Showing older gigs (&gt;24h) at $1 each. New gigs will appear after your period resets or{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto font-normal underline"
                    onClick={() => navigate('/lead-limits')}
                  >
                    increase your limit
                  </Button>.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search gigs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.filter((c) => !c.parent_category_id).map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={budgetFilter} onValueChange={setBudgetFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Budgets</SelectItem>
              <SelectItem value="under1k">Under $1,000</SelectItem>
              <SelectItem value="1k-5k">$1,000 - $5,000</SelectItem>
              <SelectItem value="over5k">Over $5,000</SelectItem>
            </SelectContent>
          </Select>
          {diggerProfile && (
            <div className="flex items-center gap-2 px-4 py-2 border border-border rounded-md bg-background">
              <Checkbox
                id="show-escrow"
                checked={showEscrowGigs}
                onCheckedChange={(checked) => setShowEscrowGigs(checked as boolean)}
              />
              <label
                htmlFor="show-escrow"
                className="text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                Show Escrow Gigs
              </label>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-1">
            <GigAdvancedFilters
              categories={allCategories}
              categoriesWithProfessions={categoriesWithProfessions}
              filters={advancedFilters}
              onFiltersChange={setAdvancedFilters}
            />
            <SavedSearchesList 
              searchType="gigs" 
              onApplySearch={(appliedFilters) => setAdvancedFilters({
                budgetRange: [0, 50000],
                selectedCategories: [],
                selectedProfessionIds: [],
                selectedKeywords: [],
                locationRadius: 50,
                postedSince: 'all',
                sortBy: 'newest',
                ...(appliedFilters as Partial<GigFilters>),
              })}
            />
          </div>

          <div className="md:col-span-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')} className="mb-6">
              <TabsList>
                <TabsTrigger value="list">
                  <List className="h-4 w-4 mr-2" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="map">
                  <Map className="h-4 w-4 mr-2" />
                  Map View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading gigs...</p>
                  </div>
                ) : displayGigs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        {limitReached 
                          ? "No older gigs available. Check back later or increase your lead limit."
                          : "No gigs found. Try adjusting your filters."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
            {displayGigs.map((gig) => {
              const isOld = isOldGig(gig.created_at);
              const showSpecialPrice = isOld && limitReached && (diggerProfile as any)?.lead_limit_enabled;
              const inCart = isInCart(gig.id);
              
              return (
              <Card 
                key={gig.id} 
                className="hover:shadow-[var(--shadow-hover)] transition-all duration-300 relative"
              >
                <CardContent className="p-6">
                  <div className="absolute top-6 left-6 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={inCart}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addToCart({
                            id: gig.id,
                            title: gig.title,
                            budget_min: gig.budget_min,
                            budget_max: gig.budget_max,
                            location: gig.location || "",
                            description: gig.description,
                          });
                          toast.success("Added to cart");
                        } else {
                          removeFromCart(gig.id);
                          toast.success("Removed from cart");
                        }
                      }}
                      className="h-5 w-5 bg-background border-2"
                    />
                  </div>
                  <div 
                    className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 ml-10 cursor-pointer"
                    onClick={() => navigate(`/gig/${gig.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-2 flex-wrap items-center">
                        {gig.status === 'open' && (
                          <Badge variant="default" className="bg-green-500 text-white">
                            ✓ Open for Bidding
                          </Badge>
                        )}
                        {inCart && (
                          <Badge variant="secondary">
                            In Cart
                          </Badge>
                        )}
                        {(gig as any).escrow_requested_by_consumer && (
                          <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
                            🔒 Escrow Required
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                        {gig.title}
                      </h3>
                      <div className="mb-4" onClick={(e) => e.stopPropagation()}>
                        <p className={`text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap ${expandedDescriptionIds.has(gig.id) ? "" : "line-clamp-3"}`}>
                          {gig.description}
                        </p>
                        {gig.description.length > 120 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto py-1 px-0 mt-1 text-primary hover:text-primary font-medium text-xs"
                            onClick={(e) => toggleDescription(gig.id, e)}
                          >
                            {expandedDescriptionIds.has(gig.id) ? "Show less" : "Read more..."}
                          </Button>
                        )}
                      </div>
                      {/* At-a-glance: category, budget, location, preferred regions, deadline, skills — easy to scan */}
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground rounded-lg bg-muted/40 px-3 py-2 border border-transparent">
                        {gig.categories && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4 shrink-0" />
                            <span>{gig.categories.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 shrink-0" />
                          <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>{gig.location || "Remote"}</span>
                        </div>
                        {gig.preferred_regions && gig.preferred_regions.length > 0 && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 shrink-0 opacity-70" />
                            <span className="text-xs">Pref: {formatSelectionDisplay(gig.preferred_regions)}</span>
                          </div>
                        )}
                        {gig.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span>Due {new Date(gig.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        {(gig.poster_country ?? (gig as unknown as Record<string, unknown>).poster_country) && (
                          <div className="flex items-center gap-1.5" title={String(gig.poster_country ?? (gig as unknown as Record<string, unknown>).poster_country ?? "").trim()}>
                            {(() => {
                              const country = String(gig.poster_country ?? (gig as unknown as Record<string, unknown>).poster_country ?? "").trim();
                              const code = country ? getCodeForCountryName(country) : "";
                              const flagEmoji = country ? getFlagForCountryName(country) : "";
                              return (
                                <>
                                  {code ? (
                                    <img
                                      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                                      alt=""
                                      className="h-4 w-5 object-cover rounded-sm shrink-0"
                                      width={20}
                                      height={15}
                                    />
                                  ) : flagEmoji ? (
                                    <span className="text-base leading-none" aria-hidden>{flagEmoji}</span>
                                  ) : null}
                                  <span className="uppercase font-medium">{code || country}</span>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      {(() => {
                        const names = (gig.skills_required && gig.skills_required.length > 0)
                          ? gig.skills_required
                          : (gig.gig_skills || []).map((gs) => gs.skills?.name).filter((n): n is string => Boolean(n));
                        return names.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {names.slice(0, 5).map((skill, i) => (
                              <Badge key={i} variant="secondary" className="text-xs font-normal">
                                {skill}
                              </Badge>
                            ))}
                            {names.length > 5 && (
                              <Badge variant="outline" className="text-xs font-normal">
                                +{names.length - 5}
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <div className="lg:text-right space-y-2">
                      {diggerProfile?.hourly_rate || diggerProfile?.hourly_rate_min ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="default" 
                                className="mb-2 bg-primary text-primary-foreground cursor-help inline-flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/pricing-strategy");
                                }}
                              >
                                Upfront: Tier cost. Awarded: ${diggerProfile.hourly_rate || diggerProfile.hourly_rate_min}/hr
                                <Info className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Hourly Pricing Model</p>
                              <p className="text-sm mb-2">
                                You pay tier-based cost upfront (Free: $3, Pro: $1.50, Premium: $0). When awarded the gig, pay an additional 1 hour of your rate. No commission on completed work.
                              </p>
                              <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => navigate("/pricing-strategy")}>
                                Learn pricing strategies →
                              </Button>
                            </TooltipContent>
                          </Tooltip>
                      ) : showSpecialPrice ? (
                        <Badge variant="default" className="mb-2 bg-accent text-accent-foreground">
                          Old Lead - $1
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="mb-2">
                        <Users className="h-3 w-3 mr-1" />
                        {gig.purchase_count} {gig.purchase_count === 1 ? 'digger' : 'diggers'} interested
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Posted {formatDistanceToNow(new Date(gig.created_at))} ago
                      </div>
                      {/* Digger actions: Bid Now + Buy lead side by side */}
                      {diggerProfile && gig.status === 'open' && (
                        <div className="flex flex-col gap-2 mt-3">
                          {!userBids.has(gig.id) ? (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                className="flex-1 min-w-[120px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  navigate(`/gig/${gig.id}#bid`);
                                }}
                              >
                                <HandHeart className="h-4 w-4 mr-2 shrink-0" />
                                Bid Now
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 min-w-[120px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (!inCart) {
                                    addToCart({
                                      id: gig.id,
                                      title: gig.title,
                                      budget_min: gig.budget_min,
                                      budget_max: gig.budget_max,
                                      location: gig.location || "",
                                      description: gig.description,
                                    });
                                    toast.success("Added to cart — checkout when ready");
                                  }
                                  setCartOpen(true);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                                Buy lead
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                className="flex-1 min-w-[120px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  navigate(`/gig/${gig.id}`);
                                }}
                              >
                                View Your Bid
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 min-w-[120px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (!inCart) {
                                    addToCart({
                                      id: gig.id,
                                      title: gig.title,
                                      budget_min: gig.budget_min,
                                      budget_max: gig.budget_max,
                                      location: gig.location || "",
                                      description: gig.description,
                                    });
                                    toast.success("Added to cart — checkout when ready");
                                  }
                                  setCartOpen(true);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                                Buy lead
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Bid free to compete · Buy lead to unlock contact & reach out
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                </Card>
              );
            })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map">
                <MapView 
                  items={displayGigs.map(g => ({
                    id: g.id,
                    title: g.title,
                    location_lat: g.location_lat,
                    location_lng: g.location_lng,
                  }))}
                  onMarkerClick={(id) => navigate(`/gig/${id}`)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseGigs;