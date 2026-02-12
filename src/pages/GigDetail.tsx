import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Tag, User, Loader2, Award, MessageSquare, RefreshCw, Copy, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { BidSubmissionTemplate } from "@/components/BidSubmissionTemplate";
import { BidsList } from "@/components/BidsList";
import { FreeEstimateDiggers } from "@/components/FreeEstimateDiggers";
import SEOHead from "@/components/SEOHead";
import { generateJobPostingSchema } from "@/components/StructuredData";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useAuth } from "@/contexts/AuthContext";
import { formatSelectionDisplay, getCodeForCountryName } from "@/config/regionOptions";

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
  created_at: string;
  location: string;
  timeline?: string | null;
  category_id?: string | null;
  requirements?: string | null;
  preferred_regions?: string[] | null;
  skills_required?: string[] | null;
  consumer_email?: string | null;
  consumer_phone?: string | null;
  poster_country?: string | null;
  categories: {
    name: string;
    description: string | null;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
}

const GigDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  const [existingBid, setExistingBid] = useState<any>(null);
  const [canSeeBudget, setCanSeeBudget] = useState(false);
  const [hasLeadPurchase, setHasLeadPurchase] = useState(false);
  const REFERRAL_FEE_RATE = 0.08;
  const { trackEvent: trackFBEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { userRoles, activeRole } = useAuth();
  /** In gigger mode we hide digger-only content (bid form, budget analysis, etc.); in digger mode or no role we show it for diggers */
  const showDiggerContent = isDigger && (activeRole !== "gigger");

  useEffect(() => {
    loadData();
  }, [id, userRoles]);

  useEffect(() => {
    // Scroll to bid section (#bid) only after gig is loaded so the target (form or Sign In card) exists
    if (window.location.hash !== '#bid' || loading || !gig) return;

    const scrollToBid = () => {
      const bidElement = document.getElementById('bid');
      if (bidElement) {
        bidElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return true;
      }
      return false;
    };

    if (!scrollToBid()) {
      // Brief retry in case DOM just updated
      const t = setTimeout(() => scrollToBid(), 300);
      return () => clearTimeout(t);
    }
  }, [id, loading, gig, isDigger, diggerId, existingBid]);

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
      // Treat as digger if profiles.user_type is "digger" OR user has digger role (user_roles table)
      const userIsDigger = profile?.user_type === "digger" || (userRoles && userRoles.includes("digger"));
      setIsDigger(userIsDigger);

      if (userIsDigger) {
        const { data: diggerProfile } = await supabase
          .from("digger_profiles" as any)
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (diggerProfile) {
          setDiggerId((diggerProfile as any)?.id);

          // Check for existing bid
          const { data: bid } = await supabase
            .from("bids" as any)
            .select("*")
            .eq("gig_id", id)
            .eq("digger_id", (diggerProfile as any)?.id)
            .single();

          setExistingBid(bid as any);

          // Check if digger has purchased this lead
          const { data: leadPurchase } = await supabase
            .from("lead_purchases")
            .select("id")
            .eq("gig_id", id)
            .eq("digger_id", (diggerProfile as any)?.id)
            .eq("status", "completed")
            .single();

          setHasLeadPurchase(!!leadPurchase);

          // Can see budget if they've bid OR purchased the lead
          setCanSeeBudget(!!bid || !!leadPurchase);
        }
      } else {
        // Non-diggers (consumers) can always see budget
        setCanSeeBudget(true);
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

    // Track ViewContent event for Facebook Pixel
    if (fbConfigured && gigData) {
      trackFBEvent('ViewContent', {
        content_name: gigData.title,
        content_ids: [gigData.id],
        content_type: 'gig',
        value: gigData.budget_min || 0,
        currency: 'USD',
      });
    }
  };

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  const [bumping, setBumping] = useState(false);
  const [reposting, setReposting] = useState(false);

  const handleBump = async () => {
    if (!id || !gig) return;
    setBumping(true);
    const { error } = await supabase
      .from("gigs")
      .update({ bumped_at: new Date().toISOString() } as any)
      .eq("id", id);
    setBumping(false);
    if (error) {
      toast({ title: "Failed to bump listing", variant: "destructive" });
    } else {
      toast({ title: "Listing bumped to the top. More diggers will see it." });
      loadData();
    }
  };

  const handleRepost = async () => {
    if (!gig?.consumer_id) {
      toast({ title: "Sign in with the account that posted this gig to repost.", variant: "destructive" });
      return;
    }
    if (!window.confirm("Create a new listing with the same details? Your current listing stays as is. Diggers will be notified.")) return;
    setReposting(true);
    const insertPayload = {
      title: gig.title,
      description: gig.description,
      budget_min: gig.budget_min ?? null,
      budget_max: gig.budget_max ?? null,
      timeline: gig.timeline ?? null,
      location: gig.location ?? "Remote",
      category_id: gig.category_id ?? null,
      consumer_id: gig.consumer_id,
      requirements: gig.requirements ?? null,
      preferred_regions: gig.preferred_regions ?? null,
      poster_country: gig.poster_country ?? null,
      status: "open",
      consumer_email: gig.consumer_email ?? null,
      client_name: gig.client_name ?? null,
      consumer_phone: gig.consumer_phone ?? null,
      confirmation_status: "confirmed",
      is_confirmed_lead: true,
    };
    const { data: newGig, error } = await supabase.from("gigs").insert(insertPayload).select("id").single();
    setReposting(false);
    if (error) {
      toast({ title: "Failed to repost. Try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Reposted! Your new listing is live and diggers will be notified." });
    supabase.functions.invoke("blast-lead-to-diggers", { body: { leadId: newGig.id, proOnly: true } }).catch(() => {});
    supabase.functions.invoke("blast-lead-to-diggers", { body: { leadId: newGig.id, proOnly: false } }).catch(() => {});
    navigate(`/gig/${newGig.id}`);
  };

  const handleSendMessage = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication required",
        description: "Please log in to send messages",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }

    if (!diggerId) {
      toast({
        title: "Digger profile required",
        description: "Please complete your digger registration first",
        variant: "destructive",
      });
      return;
    }

    try {
      // For anonymous gigs (consumer_id is null), we can't create conversations
      // Diggers should contact via email/phone instead
      if (!gig.consumer_id) {
        toast({
          title: "Contact Information",
          description: "This is an anonymous posting. Please use the contact information provided when you unlock the lead.",
          variant: "default",
        });
        return;
      }

      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from("conversations" as any)
        .select("id")
        .eq("gig_id", id!)
        .eq("digger_id", diggerId)
        .eq("consumer_id", gig.consumer_id)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages?conversation=${(existingConv as any).id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("conversations" as any)
        .insert({
          gig_id: id,
          digger_id: diggerId,
          consumer_id: gig.consumer_id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      navigate(`/messages?conversation=${(newConv as any).id}`);
    } catch (error: any) {
      toast({
        title: "Error starting conversation",
        description: error.message,
        variant: "destructive",
      });
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

  const budgetText = gig.budget_min && gig.budget_max 
    ? `$${gig.budget_min.toLocaleString()} - $${gig.budget_max.toLocaleString()}`
    : gig.budget_min 
    ? `From $${gig.budget_min.toLocaleString()}`
    : 'Budget negotiable';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${gig.title} - Service Project in ${gig.location}`}
        description={`${gig.description.substring(0, 150)}... Budget: ${budgetText}. Posted ${formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}. Find qualified professionals on digsandgigs.`}
        keywords={`${gig.title}, ${gig.location}, service project, hire contractor, ${gig.categories?.name || 'services'}${gig.skills_required?.length ? `, ${gig.skills_required.join(', ')}` : ''}`}
        structuredData={generateJobPostingSchema({
          title: gig.title,
          description: gig.description,
          location: gig.location,
          datePosted: gig.created_at,
          validThrough: gig.deadline || undefined,
          baseSalary: gig.budget_min ? {
            value: gig.budget_min,
            currency: "USD",
            unitText: "PROJECT"
          } : undefined
        })}
      />

      <main className="container mx-auto px-4 py-8">
        <Breadcrumb 
          items={[
            { label: "Browse Gigs", href: "/browse-gigs" },
            { label: gig.title, href: `/gig/${gig.id}` }
          ]} 
        />
        
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
                {isOwner && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-2 border-t">
                    {gig.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBump}
                        disabled={bumping}
                        title="Bump this listing to the top so more diggers see it"
                      >
                        {bumping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                        Bump listing
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRepost}
                      disabled={reposting || !gig.consumer_id}
                      title="Create a new listing with the same details"
                    >
                      {reposting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
                      Repost
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/my-gigs")}>
                      Manage in My Gigs
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* At-a-glance: same key info as browse card so diggers see everything quickly */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground rounded-xl bg-muted/40 px-4 py-3 border border-transparent">
                  {gig.categories && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="h-4 w-4 shrink-0 text-primary" />
                      <span>{gig.categories.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                    <span>{formatBudget(gig.budget_min, gig.budget_max)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span>{gig.location || "Remote"}</span>
                  </div>
                  {gig.preferred_regions && gig.preferred_regions.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-primary opacity-80" />
                      <span className="text-xs">Pref: {formatSelectionDisplay(gig.preferred_regions)}</span>
                    </div>
                  )}
                  {gig.deadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 shrink-0 text-primary" />
                      <span>Due {new Date(gig.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {gig.poster_country && (
                    <div className="flex items-center gap-1.5" title={gig.poster_country}>
                      {getCodeForCountryName(gig.poster_country) ? (
                        <img
                          src={`https://flagcdn.com/w20/${getCodeForCountryName(gig.poster_country).toLowerCase()}.png`}
                          alt=""
                          className="h-4 w-5 object-cover rounded-sm shrink-0"
                          width={20}
                          height={15}
                        />
                      ) : null}
                      <span className="uppercase font-medium text-foreground">{getCodeForCountryName(gig.poster_country) || gig.poster_country}</span>
                    </div>
                  )}
                </div>
                {gig.skills_required && gig.skills_required.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {gig.skills_required.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="rounded-lg px-2.5 py-0.5 font-normal text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{gig.description}</p>
                </div>

                {gig.skills_required && gig.skills_required.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Diggers with these skills can tailor their proposals to your project.
                  </p>
                )}

                <Separator />

                <div className="grid md:grid-cols-2 gap-4">
                  {canSeeBudget && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-semibold">Budget</div>
                        <div className="text-muted-foreground">
                          {formatBudget(gig.budget_min, gig.budget_max)}
                        </div>
                      </div>
                    </div>
                  )}

                  {!canSeeBudget && showDiggerContent && (
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <div className="font-semibold">Budget</div>
                        <div className="text-sm text-muted-foreground italic">
                          Submit a bid to view budget
                        </div>
                      </div>
                    </div>
                  )}

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

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold">Work location</div>
                      <div className="text-muted-foreground">{gig.location || "Remote"}</div>
                    </div>
                  </div>

                  {gig.preferred_regions && gig.preferred_regions.length > 0 && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold">Preferred freelancer locations</div>
                        <div className="text-muted-foreground">{formatSelectionDisplay(gig.preferred_regions)}</div>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* Budget Analysis for Diggers (hidden in gigger mode) */}
            {showDiggerContent && gig.budget_min && (
              <Card className="bg-accent/5 border-accent/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-accent" />
                    Budget Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {gig.budget_min && gig.budget_max ? (
                        <>
                          This gig has a budget range of <strong className="text-foreground">${gig.budget_min.toLocaleString()} - ${gig.budget_max.toLocaleString()}</strong>.
                          {gig.budget_min < 1000 && " This is a smaller project, great for quick turnaround work."}
                          {gig.budget_min >= 1000 && gig.budget_min < 5000 && " This is a mid-sized project with good earning potential."}
                          {gig.budget_min >= 5000 && " This is a substantial project with significant earning potential."}
                        </>
                      ) : (
                        <>
                          This gig has a minimum budget of <strong className="text-foreground">${gig.budget_min.toLocaleString()}+</strong>.
                          {gig.budget_min < 1000 && " This is a smaller project, great for quick turnaround work."}
                          {gig.budget_min >= 1000 && gig.budget_min < 5000 && " This is a mid-sized project with good earning potential."}
                          {gig.budget_min >= 5000 && " This is a substantial project with significant earning potential."}
                        </>
                      )}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-semibold">When you&apos;re awarded:</p>
                    {(() => {
                      const minFee = gig.budget_min * REFERRAL_FEE_RATE;
                      const maxFee = gig.budget_max ? gig.budget_max * REFERRAL_FEE_RATE : null;
                      const minPayout = gig.budget_min - minFee;
                      const maxPayout = gig.budget_max ? gig.budget_max - (maxFee ?? 0) : null;
                      return (
                        <div className="bg-background/50 rounded-lg p-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">If you bid ${gig.budget_min.toLocaleString()}:</span>
                            <span className="font-semibold text-accent">${Math.round(minPayout).toLocaleString()} to you</span>
                          </div>
                          {maxPayout != null && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">If you bid ${gig.budget_max!.toLocaleString()}:</span>
                              <span className="font-semibold text-accent">${Math.round(maxPayout).toLocaleString()} to you</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <span>8% referral fee (from Gigger&apos;s deposit)</span>
                            <span>No membership required</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit proposal — below project details so diggers review first, then bid */}
            {showDiggerContent && diggerId && gig.status === 'open' && !existingBid && (
              <div id="bid">
                <BidSubmissionTemplate
                  gigId={id!}
                  diggerId={diggerId}
                  onSuccess={() => {
                    toast({
                      title: "Bid submitted!",
                      description: "The Gigger will review your bid.",
                    });
                    loadData();
                  }}
                />
              </div>
            )}
            {existingBid && showDiggerContent && (
              <Card id="bid">
                <CardHeader>
                  <CardTitle>Your bid</CardTitle>
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
            {activeRole === 'gigger' && !isOwner && currentUser && gig.status === 'open' && (
              <Card id="bid">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center text-muted-foreground">
                    You’re viewing as a <strong>Gigger</strong>. Post your own gig to receive bids from Diggers.
                  </p>
                  <Button className="w-full" variant="outline" onClick={() => navigate('/post-gig')}>
                    Post a gig
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Have a Digger account? Switch to Digger mode in the nav to bid on this gig.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && !userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Only <strong>Diggers</strong> can bid on gigs. Switch to Digger to bid, or post your own gigs as a Gigger.
                  </p>
                </CardContent>
              </Card>
            )}
            {currentUser && (!isDigger || !diggerId) && !isOwner && gig.status === 'open' && userRoles?.includes('digger') && activeRole !== 'gigger' && (
              <Card id="bid">
                <CardContent className="pt-6 space-y-4">
                  <p className="text-center text-muted-foreground">
                    To place a bid you need an active <strong>Digger</strong> profile.
                  </p>
                  <Button className="w-full" onClick={() => navigate('/role-dashboard')}>
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
            {!currentUser && !isOwner && gig.status === 'open' && (
              <Card id="bid">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground mb-4">Want to bid on this gig?</p>
                  <Button className="w-full" onClick={() => navigate('/register')}>
                    Sign in as Digger
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Free Estimate Diggers - shown to consumers and diggers */}
            <FreeEstimateDiggers 
              gigId={id!} 
              categories={gig.categories?.name ? [gig.categories.name] : undefined}
            />

            {/* Bids Section: owner manages bids; digger sees only their own bid(s) */}
            {(isOwner || showDiggerContent) && (
              <BidsList 
                gigId={id!} 
                gigTitle={gig.title} 
                isOwner={isOwner}
                isFixedPrice={!!(gig.budget_min && gig.budget_max)}
                currentDiggerId={diggerId}
              />
            )}
          </div>

          {/* Right sidebar: client info — quick review for diggers */}
          <div className="space-y-6 lg:min-w-[280px]">
            <Card className="border-muted/50 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  About the client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gig.poster_country ? (
                  <div className="flex items-center gap-3">
                    {getCodeForCountryName(gig.poster_country) ? (
                      <img
                        src={`https://flagcdn.com/w40/${getCodeForCountryName(gig.poster_country).toLowerCase()}.png`}
                        alt=""
                        className="h-8 w-10 object-cover rounded shrink-0"
                        width={40}
                        height={32}
                      />
                    ) : null}
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Client location</div>
                      <div className="font-medium">
                        {getCodeForCountryName(gig.poster_country) ? `${getCodeForCountryName(gig.poster_country)} · ${gig.poster_country}` : gig.poster_country}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Client location not specified.</p>
                )}
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Posted</div>
                  <div className="text-sm font-medium">{formatDistanceToNow(new Date(gig.created_at), { addSuffix: true })}</div>
                </div>
                {!isOwner && gig.status === 'open' && (
                  <p className="text-xs text-muted-foreground border-t pt-3">
                    Submit a proposal below or buy the lead to unlock contact and reach out directly.
                  </p>
                )}
              </CardContent>
            </Card>

            {showDiggerContent && (
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">Bid or buy — no membership</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    When you’re awarded the gig, we charge an <strong>8% referral fee</strong> (from the client’s deposit). 
                    You can also buy the lead upfront to unlock contact. No subscription required.
                  </p>
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
