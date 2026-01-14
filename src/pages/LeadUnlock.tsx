import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  User
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

export default function LeadUnlock() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [diggerId, setDiggerId] = useState<string | null>(null);

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
    return Math.max(9, Math.min(49, price));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) return null;

  const leadPrice = getLeadPrice();

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
              <div className="bg-muted/50 border border-border rounded-lg p-6 text-center">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Client Contact Hidden</h3>
                <p className="text-muted-foreground mb-6">
                  Unlock this lead to see the client's name, email, and phone number.
                </p>
                
                <div className="bg-primary/10 rounded-lg p-4 mb-6">
                  <div className="text-3xl font-bold text-primary mb-1">
                    ${leadPrice.toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    One-time payment • No commissions
                  </div>
                </div>

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
                      Unlock for ${leadPrice.toFixed(0)}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground mt-4">
                  Bogus leads are fully refundable. No questions asked.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
