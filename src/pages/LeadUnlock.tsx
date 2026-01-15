import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { 
  Lock, 
  Unlock, 
  DollarSign, 
  Calendar, 
  MapPin, 
  FileText,
  Loader2,
  CheckCircle,
  ArrowLeft,
  Mail,
  Phone,
  User,
  Percent,
  CreditCard
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string | null;
  location: string;
  created_at: string;
  calculated_price_cents: number | null;
  client_name: string | null;
  consumer_email: string | null;
  consumer_phone: string | null;
}

type PricingOption = "pay_per_lead" | "success_based";

// Referral fee configuration - must match edge function
const REFERRAL_FEE_RATE = 0.02; // 2%
const REFERRAL_FEE_MIN = 100; // $100 minimum
const REFERRAL_FEE_CAP = 249; // $249 cap

export default function LeadUnlock() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [diggerId, setDiggerId] = useState<string | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<PricingOption>("pay_per_lead");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      setCurrentUser(session?.user || null);

      if (session?.user) {
        // Get digger profile
        const { data: diggerProfile } = await (supabase
          .from("digger_profiles") as any)
          .select("id")
          .eq("user_id", session.user.id)
          .single();

        if (diggerProfile) {
          setDiggerId(diggerProfile.id);

          // Check if already unlocked
          const { data: existingUnlock } = await (supabase
            .from("lead_unlocks") as any)
            .select("id")
            .eq("lead_id", id)
            .eq("digger_id", diggerProfile.id)
            .single();

          if (existingUnlock) {
            setIsUnlocked(true);
          }
        }
      }

      // Fetch lead data
      const { data: leadData, error: leadError } = await supabase
        .from("gigs")
        .select("*")
        .eq("id", id)
        .single();

      if (leadError || !leadData) {
        toast.error("Lead not found");
        navigate("/");
        return;
      }

      setLead(leadData as Lead);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load lead");
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (min: number | null, max: number | null): string => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `$${min?.toLocaleString()}+`;
    if (!min) return `Up to $${max?.toLocaleString()}`;
    return `$${min?.toLocaleString()} - $${max?.toLocaleString()}`;
  };

  const getLeadPrice = (): number => {
    if (lead?.calculated_price_cents) {
      return lead.calculated_price_cents / 100;
    }
    // Fallback calculation
    const min = lead?.budget_min || 0;
    const max = lead?.budget_max || min;
    const avg = (min + max) / 2;
    const price = Math.round(avg * 0.03);
    return Math.min(49, Math.max(1, price)); // No minimum, $49 cap
  };

  const getEstimatedReferralFee = (): { min: number; max: number } => {
    const min = lead?.budget_min || 0;
    const max = lead?.budget_max || min;
    
    // 2% of bid range, with $100 min and $249 cap
    const calcMinFee = min * REFERRAL_FEE_RATE;
    const calcMaxFee = max * REFERRAL_FEE_RATE;
    const minFee = Math.max(REFERRAL_FEE_MIN, Math.min(calcMinFee, REFERRAL_FEE_CAP));
    const maxFee = Math.max(REFERRAL_FEE_MIN, Math.min(calcMaxFee, REFERRAL_FEE_CAP));
    
    return { 
      min: Math.round(minFee), 
      max: Math.round(maxFee) 
    };
  };

  const handleUnlock = async () => {
    if (!currentUser) {
      toast.error("Please sign in to unlock leads");
      navigate(`/register?returnTo=/lead/${id}/unlock`);
      return;
    }

    if (!diggerId) {
      toast.error("Please complete your Digger profile first");
      navigate("/register?mode=signup&type=digger");
      return;
    }

    setUnlocking(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-lead-unlock-checkout", {
        body: { leadId: id }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Unlock error:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSuccessBasedBid = () => {
    if (!currentUser) {
      toast.error("Please sign in to bid on leads");
      navigate(`/register?returnTo=/gig/${id}`);
      return;
    }

    if (!diggerId) {
      toast.error("Please complete your Digger profile first");
      navigate("/register?mode=signup&type=digger");
      return;
    }

    // Navigate to gig detail page with success_based pricing pre-selected
    navigate(`/gig/${id}?pricing=success_based`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return null;

  const leadPrice = getLeadPrice();
  const estimatedFee = getEstimatedReferralFee();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`Unlock Lead: ${lead.title} | Digs & Gigs`}
        description="Unlock this lead to get full client contact details and project information."
      />
      
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline" className="text-sm">
                Posted {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
              </Badge>
              {isUnlocked ? (
                <Badge className="bg-green-500 text-white">
                  <Unlock className="w-3 h-3 mr-1" />
                  Unlocked
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl">{lead.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4" />
              {lead.location}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Project Description
                </h3>
                <p className="text-muted-foreground">{lead.description}</p>
              </div>

              {lead.requirements && (
                <div>
                  <h4 className="font-medium mb-1">Requirements</h4>
                  <p className="text-muted-foreground">{lead.requirements}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Budget & Timeline */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="font-semibold">Budget</div>
                  <div className="text-muted-foreground">
                    {formatBudget(lead.budget_min, lead.budget_max)}
                  </div>
                </div>
              </div>

              {lead.timeline && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="font-semibold">Timeline</div>
                    <div className="text-muted-foreground">{lead.timeline}</div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Client Contact - Locked or Unlocked */}
            {isUnlocked ? (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  Client Contact Information
                </h3>
                <div className="space-y-3">
                  {lead.client_name && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="font-medium">{lead.client_name}</span>
                    </div>
                  )}
                  {lead.consumer_email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-green-600" />
                      <a href={`mailto:${lead.consumer_email}`} className="text-primary hover:underline">
                        {lead.consumer_email}
                      </a>
                    </div>
                  )}
                  {lead.consumer_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-green-600" />
                      <a href={`tel:${lead.consumer_phone}`} className="text-primary hover:underline">
                        {lead.consumer_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Choose Your Engagement Type</h3>
                  <p className="text-muted-foreground mb-6">
                    Select how you'd like to engage with this lead.
                  </p>

                  <RadioGroup
                    value={selectedPricing}
                    onValueChange={(value) => setSelectedPricing(value as PricingOption)}
                    className="grid gap-4"
                  >
                    {/* Option 1: Non-Exclusive Access */}
                    <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      selectedPricing === "pay_per_lead" 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}>
                      <Label 
                        htmlFor="pay_per_lead" 
                        className="flex items-start gap-4 cursor-pointer"
                      >
                        <RadioGroupItem value="pay_per_lead" id="pay_per_lead" className="mt-1" />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <CreditCard className="w-5 h-5 text-primary" />
                              <span className="font-semibold text-lg">Non-Exclusive Access</span>
                            </div>
                            <span className="text-2xl font-bold text-primary">${leadPrice}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Contact the client. Other professionals may also engage.
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Instant access to contact info</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="w-3 h-3" />
                            <span>No additional fees</span>
                          </div>
                        </div>
                      </Label>
                    </div>

                    {/* Option 2: Exclusive (Pay on Acceptance) */}
                    <div className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                      selectedPricing === "success_based" 
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20" 
                        : "border-border hover:border-orange-500/50"
                    }`}>
                      <Label 
                        htmlFor="success_based" 
                        className="flex items-start gap-4 cursor-pointer"
                      >
                        <RadioGroupItem value="success_based" id="success_based" className="mt-1" />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Percent className="w-5 h-5 text-orange-500" />
                              <span className="font-semibold text-lg">Exclusive (Pay on Acceptance)</span>
                            </div>
                            <span className="text-2xl font-bold text-orange-500">$0</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Pay nothing upfront. A one-time 2% referral fee (${REFERRAL_FEE_MIN}–${REFERRAL_FEE_CAP}) applies only if you're awarded and ready to start.
                          </p>
                          {lead.budget_min && lead.budget_max && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Estimated fee if awarded: ${estimatedFee.min} – ${estimatedFee.max}
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Exclusivity — no competition once awarded</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-orange-600">
                            <CheckCircle className="w-3 h-3" />
                            <span>Near-certainty of winning the project</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Action Button */}
                <div className="space-y-3">
                  {selectedPricing === "pay_per_lead" ? (
                    <>
                      <Button 
                        size="lg" 
                        className="w-full"
                        onClick={handleUnlock}
                        disabled={unlocking}
                      >
                        {unlocking ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock Lead — ${leadPrice}
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Bogus leads are fully refundable. No questions asked.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button 
                        size="lg" 
                        className="w-full bg-orange-500 hover:bg-orange-600"
                        onClick={handleSuccessBasedBid}
                      >
                        <Percent className="w-4 h-4 mr-2" />
                        Bid for Exclusive Award
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Submit your bid on the next page. Fee charged only when you accept the award and are ready to start.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
