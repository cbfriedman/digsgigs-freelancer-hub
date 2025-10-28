import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, DollarSign, Calendar, Tag, User, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Gig {
  id: string;
  consumer_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  status: string;
  created_at: string;
  categories: {
    name: string;
    description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  };
}

const GigDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [leadPrice, setLeadPrice] = useState<number>(50);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user || null);

    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", session.user.id)
        .single();
      
      setIsDigger(profile?.user_type === "digger");
    }

    const { data: gigData, error: gigError } = await supabase
      .from("gigs")
      .select(`
        *,
        categories (name, description),
        profiles!gigs_consumer_id_fkey (full_name)
      `)
      .eq("id", id)
      .single();

    if (gigError || !gigData) {
      toast.error("Gig not found");
      navigate("/browse-gigs");
      return;
    }

    setGig(gigData);

    const { data: priceData } = await supabase.rpc("calculate_lead_price", {
      gig_budget_min: gigData.budget_min,
      gig_budget_max: gigData.budget_max,
    });

    if (priceData) {
      setLeadPrice(priceData);
    }

    setLoading(false);
  };

  const handlePurchaseLead = async () => {
    if (!currentUser) {
      toast.error("Please sign in to purchase this lead");
      navigate("/auth");
      return;
    }

    if (!isDigger) {
      toast.error("Only diggers can purchase leads");
      return;
    }

    toast.info("Lead purchase will be enabled with Stripe integration");
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `From $${min.toLocaleString()}`;
    if (max) return `Up to $${max.toLocaleString()}`;
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <h1 
              className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate("/")}
            >
              digsandgiggs
            </h1>
          </div>
        </nav>
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!gig) return null;

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
          <Button variant="ghost" onClick={() => navigate("/browse-gigs")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Browse
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-8">
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">{gig.title}</h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Posted by {gig.profiles?.full_name || "Anonymous"}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <Badge variant={gig.status === "open" ? "secondary" : "outline"}>
                      {gig.status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm mb-6">
                    {gig.categories && (
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{gig.categories.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formatBudget(gig.budget_min, gig.budget_max)}</span>
                    </div>
                    {gig.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Due {new Date(gig.deadline).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Project Description
                  </h2>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {gig.description}
                  </p>
                </div>

                {gig.categories?.description && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h2 className="text-lg font-semibold mb-3">Category Info</h2>
                      <p className="text-sm text-muted-foreground">
                        {gig.categories.description}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-center">Purchase Lead</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary mb-2">
                    ${leadPrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    One-time fee for client contact info
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price calculation:</span>
                    <span className="font-medium">0.5% of budget</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Minimum:</span>
                    <span className="font-medium">$50.00</span>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePurchaseLead}
                  disabled={!isDigger || gig.status !== "open"}
                >
                  {!currentUser ? "Sign In to Purchase" : !isDigger ? "Diggers Only" : "Purchase Lead"}
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  You'll receive the client's contact information immediately after purchase
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigDetail;