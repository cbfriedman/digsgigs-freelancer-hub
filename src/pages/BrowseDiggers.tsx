import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Search, Star, DollarSign, Briefcase, Map } from "lucide-react";
import { DiggerAdvancedFilters } from "@/components/DiggerAdvancedFilters";
import { MapView } from "@/components/MapView";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { generateBreadcrumbSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Category {
  id: string;
  name: string;
  parent_category_id: string | null;
}

interface DiggerFilters {
  hourlyRateRange: [number, number];
  selectedCategories: string[];
  locationRadius: number;
  locationLat?: number;
  locationLng?: number;
  minRating?: number;
  certifications: string[];
  maxResponseTime?: number;
  availability?: string;
  isInsured?: boolean;
  isBonded?: boolean;
  isLicensed?: boolean;
  offersFreeEstimates?: boolean;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  profession: string;
  bio: string | null;
  hourly_rate: number | null;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  years_experience: number | null;
  average_rating: number;
  total_ratings: number;
  profile_image_url: string | null;
  verified: boolean;
  is_insured: boolean;
  is_bonded: boolean;
  is_licensed: string;
  offers_free_estimates: boolean | null;
  subscription_tier: string | null;
  sic_code: string | null;
  naics_code: string | null;
  custom_occupation_title: string | null;
  location_lat: number | null;
  location_lng: number | null;
  profiles: {
    full_name: string | null;
  };
  digger_categories: {
    categories: {
      name: string;
    };
  }[];
}

const BrowseDiggers = () => {
  const navigate = useNavigate();
  const [diggers, setDiggers] = useState<Digger[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [activeView, setActiveView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<DiggerFilters>({
    hourlyRateRange: [0, 500],
    selectedCategories: [],
    locationRadius: 25,
    minRating: 0,
    maxResponseTime: 72,
    certifications: [],
    availability: "any",
    isInsured: false,
    isBonded: false,
    isLicensed: false,
    offersFreeEstimates: false,
  });

  useEffect(() => {
    loadData();
  }, [selectedCategory, sortBy, filters]);

  const loadData = async () => {
    setLoading(true);

    // Load parent categories only
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("id, name, parent_category_id")
      .is("parent_category_id", null)
      .order("name");

    setCategories(categoriesData || []);

    let diggerIds: string[] | null = null;

    if (selectedCategory !== "all") {
      // Get all subcategories of the selected parent category
      const { data: subcategories } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_category_id", selectedCategory);
      
      const categoryIds = [selectedCategory, ...(subcategories?.map(sc => sc.id) || [])];
      
      const { data: categoryDiggers } = await supabase
        .from("digger_categories")
        .select("digger_id")
        .in("category_id", categoryIds);
      
      diggerIds = categoryDiggers?.map(cd => cd.digger_id) || [];
      
      if (diggerIds.length === 0) {
        setDiggers([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("digger_profiles")
      .select(`
        *,
        profiles!digger_profiles_user_id_fkey (full_name),
        digger_categories (
          categories (name)
        )
      `);

    if (diggerIds) {
      query = query.in("id", diggerIds);
    }

    // Apply advanced filters
    if (filters.hourlyRateRange[0] > 0) {
      query = query.gte("hourly_rate_min", filters.hourlyRateRange[0]);
    }
    if (filters.hourlyRateRange[1] < 500) {
      query = query.lte("hourly_rate_max", filters.hourlyRateRange[1]);
    }
    if (filters.minRating && filters.minRating > 0) {
      query = query.gte("average_rating", filters.minRating);
    }
    if (filters.maxResponseTime && filters.maxResponseTime < 72) {
      query = query.lte("response_time_hours", filters.maxResponseTime);
    }
    if (filters.isInsured) {
      query = query.eq("is_insured", true);
    }
    if (filters.isBonded) {
      query = query.eq("is_bonded", true);
    }
    if (filters.isLicensed) {
      query = query.not("is_licensed", "is", null);
    }
    if (filters.availability && filters.availability !== "any") {
      query = query.eq("availability", filters.availability);
    }
    if (filters.certifications.length > 0) {
      query = query.contains("certifications", filters.certifications);
    }
    if (filters.offersFreeEstimates) {
      query = query.eq("offers_free_estimates", true);
    }

    if (sortBy === "rating") {
      query = query.order("average_rating", { ascending: false });
    } else if (sortBy === "experience") {
      query = query.order("years_experience", { ascending: false });
    } else if (sortBy === "rate") {
      query = query.order("hourly_rate", { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load diggers");
      setLoading(false);
      return;
    }

    setDiggers(data || []);
    setLoading(false);
  };

  const filteredDiggers = diggers.filter((digger) => {
    const searchLower = searchTerm.toLowerCase();
    const customOccupation = digger.custom_occupation_title || "";
    return (
      digger.profession.toLowerCase().includes(searchLower) ||
      digger.handle?.toLowerCase().includes(searchLower) ||
      digger.bio?.toLowerCase().includes(searchLower) ||
      customOccupation.toLowerCase().includes(searchLower)
    );
  });

  const getDisplayProfession = (digger: Digger) => {
    if (digger.custom_occupation_title) {
      return digger.custom_occupation_title;
    }
    return digger.profession;
  };

  const getOccupationBadge = (digger: Digger) => {
    if (digger.sic_code) {
      return `SIC: ${digger.sic_code}`;
    }
    if (digger.naics_code) {
      return `NAICS: ${digger.naics_code}`;
    }
    return null;
  };

  const getFreeEstimatePrice = (subscriptionTier: string | null) => {
    const tierPricing = {
      free: 150,
      pro: 100,
      premium: 50
    };
    
    return tierPricing[subscriptionTier as keyof typeof tierPricing] || 150;
  };

  const getInitials = (handle: string | null) => {
    if (!handle) return "DG";
    return handle.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Browse Service Professionals - Find Qualified Contractors"
        description="Find skilled service professionals and contractors for your project. Search by specialty, location, hourly rate, and reviews. Connect with verified plumbers, electricians, landscapers, handymen, and more."
        keywords="hire contractors, find professionals, service providers, skilled workers, local contractors, verified professionals, hire plumber, hire electrician"
        structuredData={generateBreadcrumbSchema([
          { name: "Home", url: "https://digsandgigs.com" },
          { name: "Browse Diggers", url: "https://digsandgigs.com/browse-diggers" }
        ])}
      />
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12">
        <Breadcrumb items={[{ label: "Browse Diggers", href: "/browse-diggers" }]} />
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Talent</h1>
          <p className="text-muted-foreground">Find the perfect freelancer for your project</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, profession, or skills..."
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
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="experience">Most Experience</SelectItem>
              <SelectItem value="rate">Lowest Rate</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={filters.offersFreeEstimates ? "default" : "outline"}
            onClick={() => setFilters({ ...filters, offersFreeEstimates: !filters.offersFreeEstimates })}
            className="w-full md:w-auto"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Free Estimates
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-1">
            <DiggerAdvancedFilters
              categories={categories}
              filters={filters}
              onFiltersChange={setFilters}
            />
            <SavedSearchesList 
              searchType="diggers" 
              onApplySearch={(appliedFilters) => setFilters(appliedFilters as DiggerFilters)}
            />
          </div>

          <div className="md:col-span-3">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "list" | "map")} className="mb-6">
              <TabsList>
                <TabsTrigger value="list">
                  <Briefcase className="h-4 w-4 mr-2" />
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
                    <p className="text-muted-foreground">Loading diggers...</p>
                  </div>
                ) : filteredDiggers.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">No diggers found. Try adjusting your filters.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
            {filteredDiggers.map((digger) => (
              <Card 
                key={digger.id} 
                className="hover:shadow-[var(--shadow-hover)] transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/digger/${digger.id}`)}
              >
                 <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={digger.profile_image_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(digger.handle)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">
                          @{digger.handle || "anonymous"}
                        </h3>
                        <div className="flex gap-1 shrink-0">
                          {digger.verified && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                              ✓
                            </Badge>
                          )}
                          {digger.is_insured && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                              I
                            </Badge>
                          )}
                          {digger.is_bonded && (
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs">
                              B
                            </Badge>
                          )}
                          {digger.is_licensed === 'yes' && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                              L
                            </Badge>
                          )}
                          {digger.offers_free_estimates && (
                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                              <DollarSign className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{getDisplayProfession(digger)}</p>
                      {digger.offers_free_estimates && (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Free Estimate
                          </Badge>
                          <Badge variant="default" className="text-xs bg-primary">
                            ${getFreeEstimatePrice(digger.subscription_tier)}
                          </Badge>
                        </div>
                      )}
                      {getOccupationBadge(digger) && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {getOccupationBadge(digger)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="font-medium">{digger.average_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({digger.total_ratings})</span>
                    </div>
                    {(digger.hourly_rate_min && digger.hourly_rate_max) ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>${digger.hourly_rate_min}-${digger.hourly_rate_max}/hr</span>
                      </div>
                    ) : digger.hourly_rate && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>${digger.hourly_rate}/hr</span>
                      </div>
                    )}
                    {digger.years_experience && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        <span>{digger.years_experience}y</span>
                      </div>
                    )}
                  </div>

                  {digger.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {digger.bio}
                    </p>
                  )}

                  {digger.digger_categories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {digger.digger_categories.slice(0, 3).map((dc, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {dc.categories.name}
                        </Badge>
                      ))}
                      {digger.digger_categories.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{digger.digger_categories.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
                )}
              </TabsContent>

              <TabsContent value="map">
                <MapView 
                  items={filteredDiggers.map(d => ({
                    id: d.id,
                    title: `@${d.handle || "anonymous"} - ${d.profession}`,
                    location_lat: d.location_lat,
                    location_lng: d.location_lng,
                  }))}
                  onMarkerClick={(id) => navigate(`/digger/${id}`)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowseDiggers;