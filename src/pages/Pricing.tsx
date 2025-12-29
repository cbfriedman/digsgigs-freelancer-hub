import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Rocket,
  DollarSign,
  Lock,
  ArrowRight,
  Briefcase,
  Zap,
  Star,
  MapPin,
  TrendingUp,
  MessageSquare,
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
  AlertTriangle,
  X
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";
import { supabase } from "@/integrations/supabase/client";

// Analytics tracking helper
const trackConversion = (eventName: string, eventData?: Record<string, unknown>) => {
  // Track with console for now - can be extended to GA, FB Pixel, etc.
  console.log(`[CONVERSION] ${eventName}`, eventData);
  
  // If Google Analytics is available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventData);
  }
  
  // If Facebook Pixel is available
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, eventData);
  }
};

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [foundingSpotsRemaining, setFoundingSpotsRemaining] = useState<number>(500);

  // Fetch founding digger count
  useEffect(() => {
    const fetchFoundingCount = async () => {
      try {
        // Use empty select with head:true for count-only queries
        const { count, error } = await supabase
          .from('digger_profiles')
          .select('', { count: 'exact', head: true })
          .eq('is_founding_digger', true);
        
        if (!error && count !== null) {
          setFoundingSpotsRemaining(Math.max(0, 500 - count));
        }
      } catch (err) {
        console.error('Error fetching founding count:', err);
      }
    };
    
    fetchFoundingCount();
  }, []);

  // Check if user wants to create a profile (from "Create New Profile" button)
  const createProfile = searchParams.get('create') === 'true' || searchParams.get('createProfile') === 'true';

  // Handle CTA clicks with tracking
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
        <title>Freelancer Pricing — $19 Lifetime Subscription + $10/$25 Leads | Digs & Gigs</title>
        <meta name="description" content="Only 500 Founding Diggers get $19/month forever plus $10/$25 lead pricing for the first year. No commissions, no bidding wars." />
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
                Founders Get The Lowest Prices We Will Ever Offer
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Join as a Founding Digger and lock in lifetime pricing — plus the lowest lead costs we will ever offer. No commissions. Keep 100% of what you earn.
              </p>
              
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 mb-4"
                onClick={() => handleCtaClick('hero_cta')}
              >
                Claim Your Founder Spot — Free for 60 Days
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <p className="text-sm text-muted-foreground">
                No credit card required. Cancel anytime.
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
                    Free for 60 Days
                  </Badge>
                </div>
                
                <CardHeader className="text-center pt-10 pb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl">Founding Digger Plan</CardTitle>
                </CardHeader>
                
                <CardContent className="text-center pb-8">
                  <div className="mb-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl font-bold">$0</span>
                      <span className="text-2xl text-muted-foreground">for 60 days</span>
                    </div>
                    <p className="text-lg text-muted-foreground mt-3">
                      Then <span className="font-semibold text-foreground">$19/month</span> — guaranteed for life
                    </p>
                  </div>
                  
                  <p className="text-muted-foreground mb-6">
                    Your price will never increase as long as your account remains active.
                  </p>
                  
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
                  The Lowest Lead Pricing We Will Ever Offer
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  You only pay to unlock leads you actually want — and you always keep 100% of what you earn.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Standard Leads */}
                <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Standard Leads</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-blue-600">$10</span>
                      <span className="text-muted-foreground">/ reveal</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground mb-4">
                      For categories such as:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Design', 'Writing', 'Admin', 'Video Editing', 'Virtual Assistants', 'Marketing Support', 'General Freelancing'].map((category) => (
                        <Badge key={category} variant="secondary" className="bg-blue-500/10 text-blue-700">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* High-Value Leads */}
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">High-Value Leads</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-amber-600">$25</span>
                      <span className="text-muted-foreground">/ reveal</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground mb-4">
                      For categories such as:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {['Web Development', 'SEO', 'Paid Ads', 'Consulting', 'Accounting', 'Legal', 'Finance'].map((category) => (
                        <Badge key={category} variant="secondary" className="bg-amber-500/10 text-amber-700">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Guarantee checkmarks */}
              <div className="text-center space-y-3 mb-8">
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Lead pricing is guaranteed for your first year</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">No commissions. Ever.</span>
                </div>
              </div>
              
              {/* Lock icon note */}
              <div className="text-center p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg max-w-2xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700 font-medium">Lead pricing may adjust after year one.</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your subscription pricing remains guaranteed for life as long as your account stays active.
                </p>
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

        {/* SECTION 5 — LIFETIME PRICING BANNER */}
        <section className="py-16 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Lifetime Subscription Guarantee
              </h2>
              <p className="text-xl text-muted-foreground">
                Your <span className="font-semibold text-foreground">$19/month subscription is permanently locked for life</span>
              </p>
              <p className="text-muted-foreground mt-2">
                (Exclusive to the first 500 Founding Diggers)
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — OPTIONAL ADD-ONS */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Boost Your Visibility</h2>
                <p className="text-muted-foreground">
                  Optional tools to increase your exposure. Upgrade only if you want to.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Boosted Profile */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                      <Rocket className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Boosted Profile</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$20</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                </Card>
                
                {/* Featured Badge */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                      <Star className="h-6 w-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg">Featured Digger Badge</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$10</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                </Card>
                
                {/* Category Dominance */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Category Dominance</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                </Card>
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
                      <h3 className="font-semibold mb-1">Founder Lifetime Pricing</h3>
                      <p className="text-muted-foreground text-sm">
                        The first 500 freelancers receive lifetime-locked pricing.
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
                      You are eligible for a lead refund credit if:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>The contact details are invalid</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>The client is unreachable after reasonable attempts</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>The project is clearly fake or misleading</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>The project is cancelled before contact is made</span>
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
                      Not refundable:
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>If the client hires someone else</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>If the price quoted was too high</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>If the conversation doesn't lead to paid work</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>If the client changes direction</span>
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
                Join as a Founding Digger and lock in the lowest prices we'll ever offer.
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 mb-4"
                onClick={() => handleCtaClick('final_cta')}
              >
                Claim Your Founder Spot — Free for 60 Days
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required. Cancel anytime.
              </p>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}
