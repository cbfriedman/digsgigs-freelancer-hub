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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, DollarSign, Calendar, Tag, ShoppingCart, Map, List, Filter, HandHeart, MapPin, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { StripeConnectBanner } from "@/components/StripeConnectBanner";
import { GigAdvancedFilters, type GigFilters, type IndustryCategoryWithProfessions } from "@/components/GigAdvancedFilters";
import { useStripeConnect } from "@/hooks/useStripeConnect";
import { useProfessions } from "@/hooks/useProfessions";
import { MapView } from "@/components/MapView";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import SEOHead from "@/components/SEOHead";
import PageLayout from "@/components/layout/PageLayout";
import { formatSelectionDisplay, getFlagForCountryName, getCodeForCountryName } from "@/config/regionOptions";
import { cn } from "@/lib/utils";

/** Canonical gig category names used when posting (PostGig) – only these are assigned to gigs. Match filter to platform. */
const GIG_CATEGORY_NAMES = [
  "Web Development",
  "Graphic Design",
  "Digital Marketing",
  "Content Writing",
  "AI & Automation",
  "Business Systems & Operations",
];

interface Category {
  id: string;
  name: string;
  parent_category_id?: string | null;
}

/** Categories that are actually used for gigs on this platform (from DB). Sorted in canonical order. */
function getGigCategoriesForFilter(allCategories: Category[]): Category[] {
  const parentCategories = allCategories.filter((c) => !c.parent_category_id);
  const matched = parentCategories.filter((c) => GIG_CATEGORY_NAMES.includes(c.name));
  return matched.sort((a, b) => {
    const ai = GIG_CATEGORY_NAMES.indexOf(a.name);
    const bi = GIG_CATEGORY_NAMES.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
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
  project_type?: "fixed" | "hourly" | null;
  hourly_rate_min?: number | null;
  hourly_rate_max?: number | null;
  estimated_hours_min?: number | null;
  estimated_hours_max?: number | null;
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
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>("all");
  const [diggerProfile, setDiggerProfile] = useState<any>(null);
  const [leadsPurchasedThisPeriod, setLeadsPurchasedThisPeriod] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
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
  const [expandedDescriptionIds, setExpandedDescriptionIds] = useState<Set<string>>(new Set());
  const [showRefinePanel, setShowRefinePanel] = useState(true);
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
  const { loading: stripeConnectLoading, canReceivePayments } = useStripeConnect();

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
  }, [selectedCategory, budgetFilter, projectTypeFilter, diggerProfile, advancedFilters]);

  // Real-time: new open gigs added to list; updates (e.g. status change to awarded/in_progress) reflected
  const gigsChannelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel("browse-gigs:gigs")
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
                id, consumer_id, title, description, budget_min, budget_max, project_type, hourly_rate_min, hourly_rate_max, estimated_hours_min, estimated_hours_max, timeline, location, category_id,
                preferred_regions, status, created_at, bumped_at, deadline, poster_country, skills_required, purchase_count, calculated_price_cents,
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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "gigs" },
        async (payload) => {
          const row = payload.new as { id: string; status: string };
          if (!row?.id) return;
          try {
            const { data: updatedGig, error } = await (supabase
              .from("gigs") as any)
              .select(
                `
                id, consumer_id, title, description, budget_min, budget_max, project_type, hourly_rate_min, hourly_rate_max, estimated_hours_min, estimated_hours_max, timeline, location, category_id,
                preferred_regions, status, created_at, bumped_at, deadline, poster_country, skills_required, purchase_count, calculated_price_cents,
                categories (name),
                profiles!gigs_consumer_id_fkey (full_name),
                gig_skills (skills (name))
              `
              )
              .eq("id", row.id)
              .single();
            if (error || !updatedGig) return;
            setGigs((prev: any) => {
              const idx = prev.findIndex((g: any) => g.id === updatedGig.id);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = updatedGig as Gig;
              return next;
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
    setAllCategories(allList);

    let query = (supabase
      .from("gigs") as any)
      .select(`
        id, consumer_id, title, description, budget_min, budget_max, project_type, hourly_rate_min, hourly_rate_max, estimated_hours_min, estimated_hours_max, timeline, location, category_id,
        preferred_regions, status, created_at, bumped_at, deadline, poster_country, skills_required, purchase_count, calculated_price_cents,
        categories (name),
        profiles!gigs_consumer_id_fkey (full_name),
        gig_skills (skills (name))
      `)
      .in("status", ["open", "awarded", "in_progress"])
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      const categoryIds = expandCategoryIds([selectedCategory], allList);
      query = query.in("category_id", categoryIds);
    }

    if (projectTypeFilter === "fixed" || projectTypeFilter === "hourly") {
      query = query.eq("project_type", projectTypeFilter);
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

    // Apply advanced filters (budget range only applies to fixed projects in DB; hourly may have null budget)
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

  const formatGigPrice = (gig: Gig) => {
    if (gig.project_type === "hourly") {
      const rMin = gig.hourly_rate_min ?? 0;
      const rMax = gig.hourly_rate_max ?? rMin;
      if (!rMin && !rMax) return "Rate not specified";
      if (rMin && rMax && rMin !== rMax) return `$${Math.round(rMin)}–${Math.round(rMax)}/hr`;
      return `$${Math.round(rMax || rMin)}/hr`;
    }
    return formatBudget(gig.budget_min, gig.budget_max);
  };

  const hasActiveRefine =
    advancedFilters.budgetRange[0] !== 0 ||
    advancedFilters.budgetRange[1] !== 50000 ||
    (advancedFilters.selectedProfessionIds?.length ?? 0) > 0 ||
    (advancedFilters.selectedKeywords?.length ?? 0) > 0 ||
    advancedFilters.selectedCategories.length > 0;

  return (
    <PageLayout maxWidth="wide" padded>
      <SEOHead
        title="Browse Gigs — Find Projects & Bid or Buy Leads | Digs & Gigs"
        description="Find open gigs that match your skills. Filter by category, budget, and when posted. Bid free or buy the lead to contact the client directly."
        keywords="browse gigs, find projects, freelance gigs, bid on gigs, buy leads, Digger jobs"
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="px-4 pt-1 pb-8 sm:pt-2 sm:pb-10">
        {/* Header */}
        <div className="mb-3 sm:mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Browse Gigs</h1>
          {(diggerProfile as any)?.lead_limit_enabled && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant={limitReached ? "destructive" : "secondary"} className="text-sm">
                Leads this period: {leadsPurchasedThisPeriod} / {(diggerProfile as any).lead_limit}
              </Badge>
              {limitReached && (
                <span className="text-sm text-muted-foreground">
                  Limit reached. Older gigs (&gt;24h) at $1.{" "}
                  <Button variant="link" className="p-0 h-auto font-normal text-sm" onClick={() => navigate("/lead-limits")}>
                    Increase limit
                  </Button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Remind Diggers to connect payout so they can receive money when awarded */}
        {diggerProfile && !stripeConnectLoading && !canReceivePayments && (
          <StripeConnectBanner />
        )}

        {/* Single top filter bar — find gigs quickly */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 bg-background"
              />
            </div>
            <Select value={projectTypeFilter} onValueChange={setProjectTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-10">
                <SelectValue placeholder="Project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="fixed">Fixed project</SelectItem>
                <SelectItem value="hourly">Hourly project</SelectItem>
              </SelectContent>
            </Select>
            <Select value={budgetFilter} onValueChange={setBudgetFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <SelectValue placeholder="Budget" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any budget</SelectItem>
                <SelectItem value="under1k">Under $1k</SelectItem>
                <SelectItem value="1k-5k">$1k – $5k</SelectItem>
                <SelectItem value="over5k">$5k+</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={advancedFilters.postedSince}
              onValueChange={(v: GigFilters["postedSince"]) => setAdvancedFilters({ ...advancedFilters, postedSince: v })}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-10">
                <SelectValue placeholder="Posted" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={advancedFilters.sortBy}
              onValueChange={(v: GigFilters["sortBy"]) => setAdvancedFilters({ ...advancedFilters, sortBy: v })}
            >
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="budget_asc">Budget: low → high</SelectItem>
                <SelectItem value="budget_desc">Budget: high → low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={showRefinePanel ? "secondary" : "outline"}
              size="sm"
              className="h-10 shrink-0 gap-1.5"
              onClick={() => setShowRefinePanel((p) => !p)}
            >
              <Filter className="h-4 w-4" />
              Refine
              {hasActiveRefine && <span className="h-2 w-2 rounded-full bg-primary" />}
              {showRefinePanel ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className={cn("grid gap-6", showRefinePanel ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-1")}>
          {showRefinePanel && (
            <aside className="lg:col-span-1 space-y-4 order-2 lg:order-1">
              <GigAdvancedFilters
                categories={getGigCategoriesForFilter(allCategories)}
                categoriesWithProfessions={categoriesWithProfessions}
                filters={advancedFilters}
                onFiltersChange={setAdvancedFilters}
              />
              <SavedSearchesList
                searchType="gigs"
                onApplySearch={(appliedFilters) =>
                  setAdvancedFilters({
                    budgetRange: [0, 50000],
                    selectedCategories: [],
                    selectedProfessionIds: [],
                    selectedKeywords: [],
                    locationRadius: 50,
                    postedSince: "all",
                    sortBy: "newest",
                    ...(appliedFilters as Partial<GigFilters>),
                  })
                }
              />
            </aside>
          )}

          <div className={cn("min-w-0", showRefinePanel && "lg:col-span-1 order-1 lg:order-2")}>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "map")} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4 mr-2" />
                    List
                  </TabsTrigger>
                  <TabsTrigger value="map">
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </TabsTrigger>
                </TabsList>
                <span className="text-sm text-muted-foreground">
                  {displayGigs.length} {displayGigs.length === 1 ? "gig" : "gigs"}
                </span>
              </div>

              <TabsContent value="list">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-muted-foreground text-sm">Loading gigs...</p>
                  </div>
                ) : displayGigs.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <p className="text-muted-foreground mb-2">
                        {limitReached
                          ? "No older gigs available right now. Check back later or increase your lead limit."
                          : "No gigs match your filters."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Try a different category, broader budget, or clear Refine filters.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {displayGigs.map((gig) => {
                      const isOld = isOldGig(gig.created_at);
                      const isNew = !isOld;
                      const showSpecialPrice = isOld && limitReached && (diggerProfile as any)?.lead_limit_enabled;
                      const inCart = isInCart(gig.id);

                      return (
                        <Card
                          key={gig.id}
                          className={cn(
                            "relative overflow-hidden transition-all duration-200",
                            "hover:shadow-md hover:border-primary/20 cursor-pointer"
                          )}
                          onClick={() => navigate(`/gig/${gig.id}`)}
                        >
                          <CardContent className="p-5 sm:p-6">
                            <div
                              className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-md bg-background/95 p-1 shadow-sm ring-1 ring-border/50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                id={`cart-${gig.id}`}
                                checked={inCart && !userLeadPurchases.has(gig.id)}
                                disabled={userLeadPurchases.has(gig.id)}
                                onCheckedChange={(checked) => {
                                  if (userLeadPurchases.has(gig.id)) return;
                                  if (checked) {
                                    addToCart({
                                      id: gig.id,
                                      title: gig.title,
                                      budget_min: gig.budget_min,
                                      budget_max: gig.budget_max,
                                      location: gig.location || "",
                                      description: gig.description,
                                      calculated_price_cents: (gig as any).calculated_price_cents ?? undefined,
                                    });
                                    toast.success("Added to cart");
                                  } else {
                                    removeFromCart(gig.id);
                                    toast.success("Removed from cart");
                                  }
                                }}
                                className="h-4 w-4"
                              />
                              <label htmlFor={`cart-${gig.id}`} className="text-xs text-muted-foreground cursor-pointer select-none pr-0.5">Cart</label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-[7fr_3fr] gap-4 items-start">
                              <div className="min-w-0 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  {isNew && (
                                    <Badge variant="default" className="bg-primary text-primary-foreground text-xs">
                                      New
                                    </Badge>
                                  )}
                                  <Badge
                                    variant={gig.status === "open" ? "default" : "secondary"}
                                    className={cn(
                                      "text-xs",
                                      gig.status === "awarded" && "border-amber-500/50 text-amber-700 dark:text-amber-400",
                                      gig.status === "in_progress" && "border-blue-500/50 text-blue-700 dark:text-blue-400",
                                      gig.status === "completed" && "border-green-600/50 text-green-700 dark:text-green-400",
                                      gig.status === "cancelled" && "text-muted-foreground"
                                    )}
                                  >
                                    {gig.status === "open"
                                      ? "Open"
                                      : gig.status === "awarded"
                                        ? "Awarded"
                                        : gig.status === "in_progress"
                                          ? "In progress"
                                          : gig.status === "completed"
                                            ? "Completed"
                                            : gig.status === "cancelled"
                                              ? "Cancelled"
                                              : gig.status === "pending_confirmation"
                                                ? "Pending"
                                                : gig.status}
                                  </Badge>
                                  {inCart && (
                                    <Badge variant="outline" className="text-xs">In cart</Badge>
                                  )}
                                  {diggerProfile && userBids.has(gig.id) && (
                                    <Badge variant="secondary" className="text-xs gap-1 border-green-600/40 text-green-700 dark:text-green-400 bg-green-500/10">
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                      Proposal submitted
                                    </Badge>
                                  )}
                                  {(gig as any).escrow_requested_by_consumer && (
                                    <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-700 dark:text-blue-400">
                                      Escrow
                                    </Badge>
                                  )}
                                </div>
                                <h3 className="text-lg font-semibold leading-tight hover:text-primary transition-colors line-clamp-2">
                                  {gig.title}
                                </h3>
                                <div className="text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                  <p className={cn("leading-relaxed whitespace-pre-wrap", !expandedDescriptionIds.has(gig.id) && "line-clamp-3")}>
                                    {gig.description}
                                  </p>
                                  {gig.description.length > 120 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto py-1 px-0 mt-1 text-primary text-xs"
                                      onClick={(e) => toggleDescription(gig.id, e)}
                                    >
                                      {expandedDescriptionIds.has(gig.id) ? "Show less" : "Read more"}
                                    </Button>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
                        {gig.categories && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-4 w-4 shrink-0" />
                            <span>{gig.categories.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 shrink-0" />
                          <span>{formatGigPrice(gig)}</span>
                          {gig.project_type === "hourly" && (
                            <Badge variant="secondary" className="text-xs ml-1">Hourly</Badge>
                          )}
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
                              <div className="min-w-0 sm:text-right space-y-2" onClick={(e) => e.stopPropagation()}>
                      {showSpecialPrice ? (
                        <Badge variant="default" className="mb-2 bg-accent text-accent-foreground">
                          Old Lead - $1
                        </Badge>
                      ) : null}
                      <div className="text-sm text-muted-foreground">
                        Posted {formatDistanceToNow(new Date(gig.created_at))} ago
                      </div>
                      {/* Digger actions: Bid Now (open only) + Buy lead (open, awarded, in_progress) */}
                      {diggerProfile && (gig.status === 'open' || gig.status === 'awarded' || gig.status === 'in_progress') && (
                        <div className="flex flex-col gap-2 mt-3">
                          {gig.status === 'open' ? (
                            !userBids.has(gig.id) ? (
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
                                      if (userLeadPurchases.has(gig.id)) {
                                        toast.error("You already purchased this lead");
                                      } else {
                                        addToCart({
                                          id: gig.id,
                                          title: gig.title,
                                          budget_min: gig.budget_min,
                                          budget_max: gig.budget_max,
                                          location: gig.location || "",
                                          description: gig.description,
                                          calculated_price_cents: (gig as any).calculated_price_cents ?? undefined,
                                        });
                                        toast.success("Added to cart — checkout when ready");
                                      }
                                    }
                                    setCartOpen(true);
                                  }}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                                  Buy lead
                                </Button>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                  You have already submitted a proposal.
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
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
                                      if (userLeadPurchases.has(gig.id)) {
                                        toast.error("You already purchased this lead");
                                      } else {
                                        addToCart({
                                          id: gig.id,
                                          title: gig.title,
                                          budget_min: gig.budget_min,
                                          budget_max: gig.budget_max,
                                          location: gig.location || "",
                                          description: gig.description,
                                          calculated_price_cents: (gig as any).calculated_price_cents ?? undefined,
                                        });
                                        toast.success("Added to cart — checkout when ready");
                                      }
                                    }
                                    setCartOpen(true);
                                  }}
                                >
                                  <ShoppingCart className="h-4 w-4 mr-2 shrink-0" />
                                  Buy lead
                                </Button>
                                </div>
                              </>
                            )
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                className="flex-1 min-w-[120px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  if (!inCart) {
                                    if (userLeadPurchases.has(gig.id)) {
                                      toast.error("You already purchased this lead");
                                    } else {
                                      addToCart({
                                        id: gig.id,
                                        title: gig.title,
                                        budget_min: gig.budget_min,
                                        budget_max: gig.budget_max,
                                        location: gig.location || "",
                                        description: gig.description,
                                        calculated_price_cents: (gig as any).calculated_price_cents ?? undefined,
                                      });
                                      toast.success("Added to cart — checkout when ready");
                                    }
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
                            {gig.status === 'open'
                              ? "Bid free to compete · Buy lead to unlock contact & reach out"
                              : "Buy lead to unlock client contact"}
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
    </PageLayout>
  );
};

export default BrowseGigs;