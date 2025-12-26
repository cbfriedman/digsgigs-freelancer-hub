import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Map,
  Globe,
  Check,
  Crown,
  Lock,
  Shield,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  HelpCircle,
  Building2,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUBSCRIPTION_TIERS,
  HIGH_VALUE_INDUSTRIES,
  formatSubscriptionPrice,
  GEOGRAPHIC_TIER_LABELS,
  GEOGRAPHIC_TIER_DESCRIPTIONS,
  PRICE_LOCK_PERIOD_MONTHS,
  PRICE_LOCK_CLICK_THRESHOLD,
  GeographicTier,
  BillingCycle,
} from "@/config/subscriptionTiers";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";
import { LeadCostCalculator } from "@/components/LeadCostCalculator";

const tierIcons: Record<GeographicTier, React.ReactNode> = {
  local: <MapPin className="h-6 w-6" />,
  statewide: <Map className="h-6 w-6" />,
  nationwide: <Globe className="h-6 w-6" />,
};

const tierColors: Record<GeographicTier, string> = {
  local: "border-blue-500/30 bg-blue-500/5",
  statewide: "border-purple-500/30 bg-purple-500/5",
  nationwide: "border-amber-500/30 bg-amber-500/5",
};

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [industryType, setIndustryType] = useState<'lv_mv' | 'hv'>('lv_mv');

  const geographicTiers: GeographicTier[] = ['local', 'statewide', 'nationwide'];
  
  // Check if user wants to create a profile (from "Create New Profile" button)
  const createProfile = searchParams.get('create') === 'true' || searchParams.get('createProfile') === 'true';

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
        <title>Subscription + Pay-Per-Lead Pricing | DigsAndGigs</title>
        <meta name="description" content="Low monthly subscription with pay-per-lead pricing. Get 2 free leads monthly, reduced per-lead rates, and a 12-month price lock guarantee." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3 w-3 mr-1" />
                Subscription + Pay-Per-Lead
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Low Monthly Subscription.
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Pay Only for Leads You Want.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Same subscription pricing for all industries. Subscribers get 2 free leads every month 
                and pay reduced rates to reveal contact info on additional leads.
              </p>
              
              {/* Key Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>2 free leads/month (accumulating)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Cancel anytime</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              {/* Billing Cycle Toggle - No more industry toggle needed */}
              <div className="flex flex-col items-center gap-6 mb-10">
                <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all",
                      billingCycle === 'monthly'
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={cn(
                      "px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2",
                      billingCycle === 'annual'
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Annual
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">
                      2 months free
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Pricing Cards - Unified for all industries */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {/* Local Tier */}
                <Card className={cn("relative transition-all duration-300 hover:shadow-xl", tierColors['local'])}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 bg-blue-500/10 text-blue-600">
                      {tierIcons['local']}
                    </div>
                    <CardTitle className="text-2xl">Local</CardTitle>
                    <CardDescription>Serve customers in your city or metro area</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${billingCycle === 'monthly' ? '29' : '290'}
                        </span>
                        <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-green-600 mt-1">
                          Save $58/year (2 months free)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        per profile
                      </p>
                    </div>

                    <ul className="space-y-3 text-left mb-6">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Access all leads in your local area</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">2 free lead reveals/month (accumulating)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Reduced per-lead pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                      </li>
                    </ul>

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => navigate("/register?mode=signup&type=digger")}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Statewide Tier - Most Popular */}
                <Card className={cn(
                  "relative transition-all duration-300 hover:shadow-xl ring-2 ring-primary scale-105 md:scale-110 z-10",
                  tierColors['statewide']
                )}>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                  
                  <CardHeader className="text-center pb-4">
                    <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 bg-purple-500/10 text-purple-600">
                      {tierIcons['statewide']}
                    </div>
                    <CardTitle className="text-2xl">Statewide</CardTitle>
                    <CardDescription>Serve customers across your entire state</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${billingCycle === 'monthly' ? '59' : '590'}
                        </span>
                        <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        +$15/mo per additional state (max $199/mo)
                      </p>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-green-600 mt-1">
                          Save $118/year (2 months free)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        per profile
                      </p>
                    </div>

                    <ul className="space-y-3 text-left mb-6">
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Access all leads in your statewide area</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">2 free lead reveals/month (accumulating)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Reduced per-lead pricing + add states at $15/mo</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                      </li>
                    </ul>

                    <Button 
                      className="w-full" 
                      variant="default"
                      onClick={() => navigate("/register?mode=signup&type=digger")}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Nationwide Tier */}
                <Card className={cn("relative transition-all duration-300 hover:shadow-xl", tierColors['nationwide'])}>
                  <CardHeader className="text-center pb-4">
                    <div className="w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4 bg-amber-500/10 text-amber-600">
                      {tierIcons['nationwide']}
                    </div>
                    <CardTitle className="text-2xl">Nationwide</CardTitle>
                    <CardDescription>Serve customers anywhere in the country</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${billingCycle === 'monthly' ? '299' : '2,990'}
                        </span>
                        <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-green-600 mt-1">
                          Save $598/year (2 months free)
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        per profile
                      </p>
                    </div>

                    <ul className="space-y-3 text-left mb-6">
                      <li className="flex items-start gap-2">
                        <Globe className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Access all leads across 50 states</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">2 free lead reveals/month (accumulating)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Reduced per-lead pricing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                      </li>
                    </ul>

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => navigate("/register?mode=signup&type=digger")}
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Per Profile Note */}
              <div className="text-center mb-12">
                <p className="text-sm text-muted-foreground">
                  <strong>Pricing is per profile.</strong> Create separate profiles for different professions or coverage areas to optimize your costs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Lead Costs Section with Interactive Dropdown */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Badge variant="outline" className="mb-4">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Pay-Per-Lead Costs
                </Badge>
                <h2 className="text-3xl font-bold mb-4">Lead Reveal Pricing</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  In addition to your subscription, you pay to reveal contact info on leads you want to pursue. 
                  <strong className="text-foreground"> Subscribers get 2 free reveals/month</strong> that accumulate if unused.
                  Confirmed leads (phone-verified) cost 50% more but convert better.
                </p>
              </div>

              {/* Lead Type Selector */}
              <LeadCostCalculator />

              {/* Value Proposition */}
              <div className="mt-10 grid md:grid-cols-3 gap-6">
                <div className="bg-background rounded-lg p-6 border">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">2 Free Leads/Month</h3>
                  <p className="text-sm text-muted-foreground">
                    Every month you get 2 free lead reveals. Unused credits accumulate—never lose them.
                  </p>
                </div>
                <div className="bg-background rounded-lg p-6 border">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Pay Only When Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse all leads for free. Only pay when you're ready to contact a potential customer.
                  </p>
                </div>
                <div className="bg-background rounded-lg p-6 border">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
                    <Shield className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">No Wasted Spend</h3>
                  <p className="text-sm text-muted-foreground">
                    Unlike Google Ads, you don't pay for clicks that don't convert. Only pay for real opportunities.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                <p className="text-muted-foreground">
                  Simple subscription + pay-per-lead model
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Create Your Profile</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up your professional profile with your services, coverage area, and expertise.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MapPin className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Subscribe</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose local, statewide, or nationwide coverage. Get 2 free leads/month with your subscription.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Browse Leads</h3>
                  <p className="text-sm text-muted-foreground">
                    See all matching leads in your area. Review project details before deciding to pursue.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">4. Reveal & Connect</h3>
                  <p className="text-sm text-muted-foreground">
                    Use free credits or pay to reveal contact info. Connect directly with customers you choose.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Price Lock Explanation */}
        <section className="py-16 bg-gradient-to-br from-green-500/5 via-background to-green-500/5 border-y border-green-500/20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Lock className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h2 className="text-3xl font-bold mb-4">{PRICE_LOCK_PERIOD_MONTHS}-Month Price Lock Guarantee</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Your subscription rate is guaranteed for 12 months from sign-up. 
                Even if we raise prices, you keep your locked rate.
              </p>
              <div className="bg-background/80 backdrop-blur-sm rounded-xl p-6 border border-green-500/20 max-w-xl mx-auto">
                <h3 className="font-semibold mb-3">Extended Price Protection</h3>
                <p className="text-sm text-muted-foreground">
                  After your initial 12 months, your price lock continues as long as you receive 
                  fewer than <strong>24 profile views per year</strong>. 
                  This rewards loyal subscribers who may not be receiving high lead volume.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              </div>

              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem value="lead-cost" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    How much do leads cost?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Lead costs depend on your industry type (Standard or High-Value) and your 
                    geographic coverage tier. <strong>Subscribers get 2 free lead reveals per month</strong> that 
                    accumulate if unused. Additional leads range from $16.50 to $158.40 depending 
                    on industry, coverage area, and whether the lead is confirmed (phone-verified). 
                    See the pricing table above for exact costs.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="free-leads" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    What are free leads and how do they work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Every subscriber receives <strong>2 free lead reveals per month</strong>. These credits 
                    accumulate—if you don't use them one month, they roll over to the next. 
                    For example, if you're subscribed for 3 months without revealing any leads, 
                    you'll have 6 free reveals available.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="per-profile" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    Is pricing per profile or per account?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Both subscription and lead costs are <strong>per profile</strong>. Each profile has its 
                    own subscription, its own 2 free monthly leads, and its own per-lead pricing based 
                    on its coverage area. Create separate profiles to optimize costs for different 
                    services or geographic areas.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="confirmed-leads" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    What's the difference between confirmed and unconfirmed leads?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <strong>Confirmed leads</strong> have verified their phone number or email, indicating 
                    higher intent and making them easier to contact. They cost 50% more but typically 
                    convert at higher rates. <strong>Unconfirmed leads</strong> haven't verified their contact 
                    info yet—they're cheaper but may require more follow-up effort.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="geographic" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    Can I have different geographic coverage for different services?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes! Create separate profiles for each coverage area. For example, if you offer 
                    local plumbing services but statewide consulting, create two profiles with 
                    different geographic tiers.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cancel" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    Can I cancel anytime?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes, there are no long-term contracts. You can cancel your subscription at any 
                    time. Your access continues until the end of your current billing period.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="price-lock" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    How does the price lock work after 12 months?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    After your initial 12-month price lock, we check your annual profile views. 
                    If you receive fewer than 24 views, your locked rate continues. If you receive 
                    25 or more, your rate updates to current pricing on your next billing cycle.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of service professionals who trust DigsAndGigs for predictable, 
              quality lead generation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="default"
                onClick={() => navigate("/register?mode=signup&type=digger")}
                className="text-lg px-8"
              >
                Create Your Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/how-it-works")}
                className="text-lg px-8"
              >
                <HelpCircle className="mr-2 h-5 w-5" />
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}