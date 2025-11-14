import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";
import { ArrowLeft, DollarSign, Calendar, Tag, User, Loader2, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BidForm } from "@/components/BidForm";
import { BidsList } from "@/components/BidsList";

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
  location: string;
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
  const { toast } = useToast();
  const { calculateCommission } = useCommissionCalculator();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  const [existingBid, setExistingBid] = useState<any>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro' | 'premium'>('free');

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
      
      const userIsDigger = profile?.user_type === "digger";
      setIsDigger(userIsDigger);

      if (userIsDigger) {
        // Get digger profile and subscription status
        const { data: diggerProfile } = await supabase
          .from("digger_profiles" as any)
          .select("id, subscription_tier")
          .eq("user_id", session.user.id)
          .single();

        if (diggerProfile) {
          setDiggerId((diggerProfile as any)?.id);
          setSubscriptionTier((diggerProfile as any)?.subscription_tier || 'free');

          // Check for existing bid
          const { data: bid } = await supabase
            .from("bids" as any)
            .select("*")
            .eq("gig_id", id)
            .eq("digger_id", (diggerProfile as any)?.id)
            .single();

          setExistingBid(bid as any);
        }
      }
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
      toast({
        title: "Gig not found",
        variant: "destructive",
      });
      navigate("/browse-gigs");
      return;
    }

    setGig(gigData);
    setIsOwner(session?.user?.id === gigData.consumer_id);
    setLoading(false);
  };

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'pro':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gig) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={gig.status === 'open' ? 'default' : 'secondary'}>
                    {gig.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}
                  </span>
                </div>
                <CardTitle className="text-3xl">{gig.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{gig.description}</p>
                </div>

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold">Budget</div>
                      <div className="text-muted-foreground">
                        {formatBudget(gig.budget_min, gig.budget_max)}
                      </div>
                    </div>
                  </div>

                  {gig.deadline && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">Deadline</div>
                        <div className="text-muted-foreground">
                          {new Date(gig.deadline).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {gig.categories && (
                    <div className="flex items-start gap-3">
                      <Tag className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">Category</div>
                        <div className="text-muted-foreground">{gig.categories.name}</div>
                      </div>
                    </div>
                  )}

                  {gig.location && (
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">Location</div>
                        <div className="text-muted-foreground">{gig.location}</div>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <div className="font-semibold mb-2">Posted by</div>
                  <div className="text-muted-foreground">
                    {gig.profiles.full_name || 'Anonymous'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bids Section */}
            {(isOwner || isDigger) && (
              <BidsList gigId={id!} isOwner={isOwner} />
            )}
          </div>

          <div className="space-y-6">
            {/* Subscription Info for Diggers */}
            {isDigger && (
              <Card className={getTierBadgeColor(subscriptionTier)}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    <CardTitle className="text-lg">
                      {subscriptionTier === 'free' ? 'Free Tier' :
                       subscriptionTier === 'pro' ? 'Pro Member' :
                       'Premium Member'}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Commission Rate:</span>
                      <span className="font-bold">
                        {subscriptionTier === 'premium' ? '0%' : 
                         subscriptionTier === 'pro' ? '4%' : '9%'}
                        {subscriptionTier !== 'premium' && ' ($5 min)'}
                      </span>
                    </div>
                    {gig?.budget_min && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>On ${gig.budget_min.toLocaleString()} gig:</span>
                        <span>
                          ${calculateCommission(gig.budget_min, subscriptionTier).commissionAmount.toFixed(2)} commission
                        </span>
                      </div>
                    )}
                    {subscriptionTier === 'free' && (
                      <Button
                        variant="secondary"
                        className="w-full mt-4"
                        onClick={() => navigate('/subscription')}
                      >
                        Upgrade to Lower Fees
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bid Form */}
            {isDigger && diggerId && gig.status === 'open' && !existingBid && (
              <BidForm
                gigId={id!}
                diggerId={diggerId}
                onSuccess={() => {
                  toast({
                    title: "Bid submitted!",
                    description: "The client will review your bid.",
                  });
                  loadData();
                }}
              />
            )}

            {existingBid && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Bid</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-bold">${existingBid.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timeline:</span>
                    <span>{existingBid.timeline}</span>
                  </div>
                  <Badge variant={
                    existingBid.status === 'accepted' ? 'default' :
                    existingBid.status === 'rejected' ? 'destructive' :
                    'secondary'
                  }>
                    {existingBid.status}
                  </Badge>
                </CardContent>
              </Card>
            )}

            {!isDigger && !isOwner && gig.status === 'open' && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground mb-4">
                    Want to bid on this gig?
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    Sign In as Digger
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GigDetail;
