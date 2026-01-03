import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search, DollarSign, Briefcase, Map } from "lucide-react";
import { DiggerAdvancedFilters } from "@/components/DiggerAdvancedFilters";
import { MapView } from "@/components/MapView";
import { SavedSearchesList } from "@/components/SavedSearchesList";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { generateBreadcrumbSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useDiggerPresence } from "@/hooks/useDiggerPresence";
import { DirectoryDiggerCard } from "@/components/DirectoryDiggerCard";

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
  country?: string;
}

interface Digger {
  id: string;
  user_id: string;
  handle: string | null;
  profession: string | null;
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
  sic_code: string[] | null;
  naics_code: string[] | null;
  custom_occupation_title: string | null;
  location_lat: number | null;
  location_lng: number | null;
  country: string | null;
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
  const { onlineDiggers } = useDiggerPresence();
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
    country: undefined,
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
    if (filters.country) {
      query = query.eq("country", filters.country);
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
    if (!searchTerm) return true; // Show all if no search term
    
    const searchLower = searchTerm.toLowerCase();
    const customOccupation = digger.custom_occupation_title || "";
    const profession = digger.profession || "";
    
    return (
      profession.toLowerCase().includes(searchLower) ||
      digger.handle?.toLowerCase().includes(searchLower) ||
      digger.bio?.toLowerCase().includes(searchLower) ||
      customOccupation.toLowerCase().includes(searchLower)
    );
  });

  const getDisplayProfession = (digger: Digger) => {
    if (digger.custom_occupation_title) {
      return digger.custom_occupation_title;
    }
    return digger.profession || "Professional";
  };

  const getOccupationBadge = (digger: Digger) => {
    if (digger.sic_code && digger.sic_code.length > 0) {
      return `SIC: ${digger.sic_code.join(", ")}`;
    }
    if (digger.naics_code && digger.naics_code.length > 0) {
      return `NAICS: ${digger.naics_code.join(", ")}`;
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

  const getCountryFlag = (countryName: string): string => {
    const flags: { [key: string]: string } = {
      "United States": "🇺🇸",
      "Canada": "🇨🇦",
      "United Kingdom": "🇬🇧",
      "Australia": "🇦🇺",
      "Germany": "🇩🇪",
      "France": "🇫🇷",
      "Spain": "🇪🇸",
      "Italy": "🇮🇹",
      "Mexico": "🇲🇽",
      "Brazil": "🇧🇷",
      "India": "🇮🇳",
      "China": "🇨🇳",
      "Japan": "🇯🇵",
      "South Korea": "🇰🇷",
      "Netherlands": "🇳🇱",
      "Sweden": "🇸🇪",
      "Norway": "🇳🇴",
      "Denmark": "🇩🇰",
      "Finland": "🇫🇮",
      "Poland": "🇵🇱",
      "Ireland": "🇮🇪",
      "Switzerland": "🇨🇭",
      "Austria": "🇦🇹",
      "Belgium": "🇧🇪",
      "Portugal": "🇵🇹",
      "Greece": "🇬🇷",
      "New Zealand": "🇳🇿",
      "Singapore": "🇸🇬",
      "South Africa": "🇿🇦",
      "Argentina": "🇦🇷",
      "Chile": "🇨🇱",
      "Colombia": "🇨🇴",
      "Peru": "🇵🇪",
      "Israel": "🇮🇱",
      "UAE": "🇦🇪",
      "Saudi Arabia": "🇸🇦",
      "Turkey": "🇹🇷",
      "Thailand": "🇹🇭",
      "Vietnam": "🇻🇳",
      "Philippines": "🇵🇭",
      "Indonesia": "🇮🇩",
      "Malaysia": "🇲🇾",
      "Egypt": "🇪🇬",
      "Nigeria": "🇳🇬",
      "Kenya": "🇰🇪",
      "Other": "🌍"
    };
    return flags[countryName] || "🌍";
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
                    {filteredDiggers.map((digger) => {
                      const isOnline = onlineDiggers.has(digger.id);
                      return (
                        <DirectoryDiggerCard
                          key={digger.id}
                          id={digger.id}
                          profession={digger.profession || "Professional"}
                          customOccupationTitle={digger.custom_occupation_title}
                          categories={(digger.digger_categories || []).map(dc => dc.categories?.name || '').filter(Boolean)}
                          rating={digger.average_rating}
                          reviewCount={digger.total_ratings}
                          profileImageUrl={digger.profile_image_url}
                          yearsExperience={digger.years_experience}
                          hourlyRateMin={digger.hourly_rate_min}
                          hourlyRateMax={digger.hourly_rate_max}
                          isInsured={digger.is_insured}
                          isBonded={digger.is_bonded}
                          isLicensed={digger.is_licensed}
                          offersFreeEstimates={digger.offers_free_estimates}
                          isOnline={isOnline}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map">
                <MapView 
                  items={filteredDiggers.map(d => ({
                    id: d.id,
                    title: `@${d.handle || "anonymous"} - ${d.profession || "Professional"}`,
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