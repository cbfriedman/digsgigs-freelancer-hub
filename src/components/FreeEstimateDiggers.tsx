import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Star, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FreeEstimateDigger {
  id: string;
  handle: string;
  profession: string;
  profile_image_url: string;
  average_rating: number;
  total_ratings: number;
  bio: string;
  location: string;
  subscription_tier: string;
}

interface FreeEstimateDiggersProps {
  gigId: string;
  categories?: string[];
}

export const FreeEstimateDiggers = ({ gigId, categories }: FreeEstimateDiggersProps) => {
  const navigate = useNavigate();
  const [diggers, setDiggers] = useState<FreeEstimateDigger[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const loadDiggers = useCallback(async () => {
    try {
      let query = supabase
        .from("digger_profiles")
        .select(`
          id,
          handle,
          profession,
          profile_image_url,
          average_rating,
          total_ratings,
          bio,
          location,
          subscription_tier
        `)
        .eq("offers_free_estimates", true)
        .limit(5);

      // If categories provided, filter by those
      if (categories && categories.length > 0) {
        const { data: categoryDiggers } = await supabase
          .from("digger_categories")
          .select("digger_id")
          .in("category_id", categories);

        if (categoryDiggers) {
          const diggerIds = categoryDiggers.map((d) => d.digger_id);
          query = query.in("id", diggerIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setDiggers(data || []);
    } catch (error) {
      console.error("Error loading free estimate diggers:", error);
    } finally {
      setLoading(false);
    }
  }, [categories]);

  useEffect(() => {
    loadDiggers();
  }, [loadDiggers]);

  const handleRequestEstimate = async (diggerId: string) => {
    setRequesting(diggerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please sign in to request an estimate");
        navigate("/auth");
        return;
      }

      // Get the digger's subscription tier for the price
      const digger = diggers.find(d => d.id === diggerId);
      const price = getFreeEstimatePrice(digger?.subscription_tier || 'free');

      const { data, error } = await supabase.functions.invoke("request-free-estimate", {
        body: { gigId, diggerId },
      });

      if (error) throw error;

      toast.success(
        `Estimate requested! The digger will be notified and must pay $${price} to accept.`,
        { duration: 5000 }
      );
      
      // Reload to update the UI
      setTimeout(() => loadDiggers(), 1000);
    } catch (error: any) {
      console.error("Error requesting estimate:", error);
      toast.error(error.message || "Failed to request estimate");
    } finally {
      setRequesting(null);
    }
  };

  const getInitials = (handle: string) => {
    return handle
      .split("_")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getFreeEstimatePrice = (subscriptionTier: string) => {
    const tierPricing = {
      free: 150,
      pro: 100,
      premium: 50
    };
    
    return tierPricing[subscriptionTier as keyof typeof tierPricing] || 150;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (diggers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Get Free Estimates</CardTitle>
          <Badge variant="secondary" className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            Pricing by tier
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          These professionals offer free estimates. Pricing: Free tier $150 • Pro $100 • Premium $50
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {diggers.map((digger) => (
            <div
              key={digger.id}
              className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={digger.profile_image_url} />
                  <AvatarFallback>{getInitials(digger.handle)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 
                      className="font-semibold hover:text-primary cursor-pointer"
                      onClick={() => navigate(`/digger/${digger.id}`)}
                    >
                      {digger.handle}
                    </h4>
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Free Estimate
                    </Badge>
                    <Badge variant="default" className="text-xs font-semibold bg-primary">
                      ${getFreeEstimatePrice(digger.subscription_tier)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{digger.profession}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-accent text-accent" />
                    <span className="text-sm font-semibold">
                      {digger.average_rating || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({digger.total_ratings || 0})
                    </span>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{digger.bio}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {digger.location}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleRequestEstimate(digger.id)}
                disabled={requesting === digger.id}
                className="ml-4"
              >
                {requesting === digger.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Request Estimate"
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};