import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Search, DollarSign, Calendar, Tag, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

  useEffect(() => {
    loadData();
  }, [selectedCategory, budgetFilter]);

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
      query = query.eq("category_id", selectedCategory);
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
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Browse Gigs</h1>
          <p className="text-muted-foreground">Find projects that match your skills</p>
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
        ) : filteredGigs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No gigs found. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGigs.map((gig) => (
              <Card 
                key={gig.id} 
                className="hover:shadow-[var(--shadow-hover)] transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/gig/${gig.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
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
                      <Badge variant="secondary">Open</Badge>
                      {gig.purchase_count > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1 ml-2">
                          <Users className="h-3 w-3" />
                          {gig.purchase_count}
                        </Badge>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseGigs;