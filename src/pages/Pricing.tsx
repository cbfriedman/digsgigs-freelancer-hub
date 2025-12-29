import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Rocket,
  Lock,
  ArrowRight,
  Zap,
  Star,
  Users,
  Eye,
  Award,
  FileText,
  Mail,
  Phone,
  Calendar,
  Paperclip,
  Heart,
  Target,
  Shield,
  AlertTriangle
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";
import { supabase } from "@/integrations/supabase/client";

// Analytics tracking helper
const trackConversion = (eventName: string, eventData?: Record<string, unknown>) => {
  console.log(`[CONVERSION] ${eventName}`, eventData);
  
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }
  
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, eventData);
  }
};

// Budget-based lead pricing
const LEAD_PRICING = [
  { budget: "Under $1,000", price: "$25" },
  { budget: "$1,000–$3,000", price: "$35" },
  { budget: "$3,000–$7,500", price: "$65" },
  { budget: "$7,500–$20,000", price: "$95" },
  { budget: "$20,000+", price: "$140" }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [foundingSpotsRemaining, setFoundingSpotsRemaining] = useState<number>(500);

  // Fetch founding digger count
  useEffect(() => {
    const fetchFoundingCount = async () => {
      try {
        const { count, error } = await supabase
          .from('digger_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_founding_digger', true);
        
        if (!error && count !== null) {
          setFoundingSpotsRemaining(Math.max(0, 500 - count));
        }
      } catch (err) {
        console.error('Error fetching founding count:', err);
      }
    };
    
    if (!searchParams.get('create')) {
      fetchFoundingCount();
    }
  }, [searchParams]);

  const createProfile = searchParams.get('create') === 'true' || searchParams.get('createProfile') === 'true';

  const handleCtaClick = (ctaName: string) => {
    trackConversion('cta_click', { cta_name: ctaName, page: 'pricing' });
    navigate("/register?mode=signup&type=digger");
  };

  // If user is logged in and wants to create a profile, show the profile creation form
  if (user && createProfile) {
    return (
      <>
        <Helmet>
          <title>Create New Digger Profile | DigsAndGigs</title>
          <meta name="description" content="Create a new digger profile to start receiving leads for your services." />
        </Helmet>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/my-profiles')}
                  className="mb-4"
                >
                  ← Back to My Profiles
                </Button>
                <h1 className="text-3xl font-bold mb-2">Create New Profile</h1>
                <p className="text-muted-foreground">
                  Set up a new profile to organize your services, target different locations, or market separate specializations.
                </p>
              </div>
              <CategoryBrowserWithDescription />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Pricing — Simple. Fair. Transparent. | Digs & Gigs</title>
        <meta name="description" content="Pay a fair monthly membership and only purchase verified leads you actually want. Freelancers keep 100% of what they earn. No commissions." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* SECTION 1 — HERO */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-amber-500/10 text-amber-600 border-amber-500/20 px-4 py-1">
                <Crown className="h-3 w-3 mr-1" />
                Limited to the First 500 Founding Diggers
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Pricing — Simple. Fair. Transparent.
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Digs & Gigs does not take a commission from your earnings. Freelancers pay a monthly membership after a free trial, and only purchase verified leads they wish to unlock.
              </p>
              
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 mb-4"
                onClick={() => handleCtaClick('hero_cta')}
              >
                Start Free — No Credit Card Required
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                30-day free trial. Cancel anytime.
              </p>
              
              {/* Founders Spots Counter */}
              <div className="mt-8 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2">
                <Crown className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-700">
                  {foundingSpotsRemaining} Founder Spots Remaining
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — SUBSCRIPTION PLAN */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card className="relative border-2 border-primary shadow-2xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-4 py-1 text-sm font-semibold">
                    Free for 30 Days
                  </Badge>
                </div>
                
                <CardHeader className="text-center pt-10 pb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Founding Digger Plan
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="text-center pb-8">
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl font-bold">$0</span>
                      <span className="text-2xl text-muted-foreground">for 30 days</span>
                    </div>
                    <p className="text-lg text-muted-foreground mt-3">
                      Then <span className="font-semibold text-foreground">$49/month</span>
                    </p>
                    <p className="text-sm text-amber-600 font-medium mt-2">
                      Founder pricing is locked for 12 months.
                    </p>
                  </div>
                  
                  <div className="space-y-3 text-left mb-6 max-w-sm mx-auto">
                    {[
                      "Create your professional profile",
                      "Get matched leads",
                      "Apply to projects",
                      "Keep 100% of your earnings",
                      "Cancel anytime"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full text-lg py-6 mb-4"
                    onClick={() => handleCtaClick('subscription_cta')}
                  >
                    Start Free — No Credit Card Required
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  
                  <p className="text-sm text-amber-600 font-medium">
                    Limited to the first 500 Founding Diggers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 3 — LEAD PRICING */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Lead Pricing Based on Client Budget
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Lead pricing is based on the LOW end of the client's stated budget range — so you never overpay for smaller projects.
                </p>
              </div>
              
              {/* Pricing Table */}
              <div className="max-w-2xl mx-auto mb-12">
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-2 bg-muted/50 border-b border-border">
                    <div className="p-4 font-semibold text-center">Client Budget</div>
                    <div className="p-4 font-semibold text-center">Lead Price</div>
                  </div>
                  {LEAD_PRICING.map((tier, i) => (
                    <div key={i} className={`grid grid-cols-2 ${i < LEAD_PRICING.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="p-4 text-center text-muted-foreground">{tier.budget}</div>
                      <div className="p-4 text-center font-bold text-primary text-lg">{tier.price}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Guarantees */}
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                <div className="flex items-center gap-2 justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">No commissions</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">No pay-per-click</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">You only unlock leads you want</span>
                </div>
                <div className="flex items-center gap-2 justify-center">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Lead protection included</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — WHAT'S INCLUDED IN LEADS */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Before Purchase */}
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      What You See Before You Buy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span>Category</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span>Short summary</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span>Budget range</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                        <span>Location (if provided)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                {/* After Purchase */}
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      What You Unlock After Purchase
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-green-600" />
                        <span>Client name</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-green-600" />
                        <span>Email</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span>Phone</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span>Full description</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Paperclip className="h-4 w-4 text-green-600" />
                        <span>Attachments (if provided)</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span>Timeline</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — FOUNDER PRICING GUARANTEE BANNER */}
        <section className="py-16 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Founder Pricing Guarantee
              </h2>
              <p className="text-xl text-muted-foreground">
                Your <span className="font-semibold text-foreground">$49/month subscription is locked for 12 months</span>
              </p>
              <p className="text-muted-foreground mt-2">
                (Exclusive to the first 500 Founding Diggers)
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — PREMIUM FEATURED PLACEMENT (CATEGORY DOMINANCE) */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Premium Featured Placement (Optional)</h2>
                <p className="text-muted-foreground">
                  Upgrade to Category Dominance for increased visibility within your service category niche.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Featured Visibility Package */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                      <Rocket className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Featured Visibility Package</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$29–$49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground text-sm">
                      Boosted profile + Featured badge bundled together.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Category Dominance */}
                <Card className="hover:shadow-lg transition-shadow border-2 border-amber-500/30 bg-amber-500/5">
                  <CardHeader className="text-center">
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white">
                      Premium
                    </Badge>
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3 mt-2">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg">Category Dominance</CardTitle>
                    <div className="flex flex-col items-center mt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-amber-600">$99</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        (Founder rate — Future: $149–$199/mo)
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground text-sm mb-4">
                      Top-tier featured exposure within your specific service category niche.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>Priority listing placement</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>Premium profile highlight</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-amber-600" />
                        <span>Priority matching exposure</span>
                      </div>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                      Limited to 3–5 freelancers per niche.
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center mt-8">
                <Button variant="outline" onClick={() => navigate("/contact")}>
                  Learn About Visibility Upgrades
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — WHY DIGS & GIGS */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why Freelancers Choose Digs & Gigs
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Heart className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Keep 100% Of What You Earn</h3>
                      <p className="text-muted-foreground text-sm">
                        We never take a percentage of your income. No hidden fees. Ever.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Only Pay For Leads You Want</h3>
                      <p className="text-muted-foreground text-sm">
                        Browse real projects. Unlock only the ones that fit you.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Lead Protection</h3>
                      <p className="text-muted-foreground text-sm">
                        Invalid or fake leads are covered under our refund policy.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-none bg-transparent">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                      <Rocket className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Visibility — Only If You Want It</h3>
                      <p className="text-muted-foreground text-sm">
                        Upgrade to boost your profile, but never required.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-none bg-transparent md:col-span-2">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Crown className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Founder Pricing (12-Month Guarantee)</h3>
                      <p className="text-muted-foreground text-sm">
                        The first 500 freelancers get their $49/month rate locked for 12 months.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8 — LEAD PROTECTION POLICY */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Lead Protection Policy
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Eligible for refund */}
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-lg text-green-700">
                      Refund eligible if:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Invalid contact details</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Scam or fraud</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Completely unresponsive after reasonable attempts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Not the category stated</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Clearly fake project</span>
                      </li>
                    </ul>
                    <p className="text-sm text-muted-foreground mt-4">
                      Requests must be submitted within 7 days.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Not refundable */}
                <Card className="border-amber-500/30 bg-amber-500/5">
                  <CardHeader>
                    <CardTitle className="text-lg text-amber-700">
                      NOT eligible when:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Client chose someone else</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Pricing misalignment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>No deal occurred</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>Freelancer delay</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <p className="text-center text-muted-foreground mt-8">
                We actively monitor and block spam. We want freelancers to succeed here.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Pay a fair monthly membership and only purchase verified leads you actually want. Keep 100% of what you earn.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6"
                  onClick={() => handleCtaClick('final_cta')}
                >
                  Apply as a Digger
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-6"
                  onClick={() => navigate("/post-gig")}
                >
                  Post a Project
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                30-day free trial. No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}
