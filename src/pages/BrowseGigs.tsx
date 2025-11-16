import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Search, DollarSign, Calendar, Tag, Users, ShoppingCart, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";

interface Category {
  id: string;
  name: string;
}

interface Gig {
  id: string;
  consumer_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  purchase_count: number;
  created_at: string;
  categories: {
    name: string;
  } | null;
}

const BrowseGigs = () => {
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [budgetFilter, setBudgetFilter] = useState<string>("all");
  const [diggerProfile, setDiggerProfile] = useState<any>(null);
  const [leadsPurchasedThisPeriod, setLeadsPurchasedThisPeriod] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();

  useEffect(() => {
    loadDiggerData();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedCategory, budgetFilter, diggerProfile]);

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

        // Count leads purchased in current period
        if ((profile as any).lead_limit_enabled && (profile as any).lead_limit) {
          const now = new Date();
          let startDate = new Date();

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

    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name")
      .is("parent_category_id", null)
      .order("name");

    setCategories(categoriesData || []);

    let query = supabase
      .from("gigs")
      .select(`
        *,
        categories (name)
      `)
      .eq("status", "open")
      .order("created_at", { ascending: false });

    if (selectedCategory !== "all") {
      // Get all subcategories of the selected parent category
      const { data: subcategories } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_category_id", selectedCategory);
      
      const categoryIds = [selectedCategory, ...(subcategories?.map(sc => sc.id) || [])];
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

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load gigs");
      setLoading(false);
      return;
    }

    setGigs(data || []);
    setLoading(false);
  };

  const filteredGigs = gigs.filter((gig) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      gig.title.toLowerCase().includes(searchLower) ||
      gig.description.toLowerCase().includes(searchLower)
    );
  });

  const isOldGig = (createdAt: string) => {
    const gigAge = Date.now() - new Date(createdAt).getTime();
    return gigAge > 24 * 60 * 60 * 1000; // >24 hours
  };

  const newGigs = filteredGigs.filter(gig => !isOldGig(gig.created_at));
  const oldGigs = filteredGigs.filter(gig => isOldGig(gig.created_at));

  const displayGigs = limitReached && (diggerProfile as any)?.lead_limit_enabled 
    ? oldGigs  // If limit reached, only show old gigs
    : filteredGigs; // Otherwise show all gigs

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "";
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {cartCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {cartCount}
                </Badge>
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </nav>
      
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Gigs</h1>
          <p className="text-muted-foreground">Find projects that match your skills</p>
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
              {categories.map((cat) => (
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
        </div>

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
                            location: "",
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
                      {inCart && (
                        <Badge variant="secondary" className="mb-2">
                          In Cart
                        </Badge>
                      )}
                      <h3 className="text-xl font-semibold mb-2 hover:text-primary transition-colors">
                        {gig.title}
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {gig.description}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {gig.categories && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Tag className="h-4 w-4" />
                            <span>{gig.categories.name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                        </div>
                        {gig.deadline && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Due {new Date(gig.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="lg:text-right space-y-2">
                      {diggerProfile?.hourly_rate || diggerProfile?.hourly_rate_min ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="default" className="mb-2 bg-primary text-primary-foreground cursor-help inline-flex items-center gap-1">
                                Lead Cost: ${Math.max(100, diggerProfile.hourly_rate || diggerProfile.hourly_rate_min)} (min $100)
                                <Info className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Hourly Rate Auction</p>
                              <p className="text-sm">
                                You pay 1 hour of your advertised rate per lead (minimum $100). This creates competitive pricing - diggers with lower hourly rates compete better for leads, incentivizing market-rate pricing.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseGigs;