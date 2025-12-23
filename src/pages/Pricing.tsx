import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [industryType, setIndustryType] = useState<'lv_mv' | 'hv'>('lv_mv');

  const geographicTiers: GeographicTier[] = ['local', 'statewide', 'nationwide'];

  return (
    <>
      <Helmet>
        <title>Simple Subscription Pricing | DigsAndGigs</title>
        <meta name="description" content="Transparent, predictable pricing for service professionals. One monthly subscription, unlimited leads in your coverage area. No per-lead fees." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Crown className="h-3 w-3 mr-1" />
                Simple, Predictable Pricing
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                One Subscription.
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Unlimited Leads.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                No per-click fees. No per-lead charges. Just a simple monthly subscription 
                that gives you access to all consumer leads in your coverage area.
              </p>
              
              {/* Key Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Unlimited leads</span>
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
              {/* Industry Type Toggle */}
              <div className="flex flex-col items-center gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    industryType === 'lv_mv' ? "text-foreground" : "text-muted-foreground"
                  )}>
                    Standard Industries
                  </span>
                  <button
                    onClick={() => setIndustryType(industryType === 'lv_mv' ? 'hv' : 'lv_mv')}
                    className={cn(
                      "relative w-14 h-7 rounded-full transition-colors",
                      industryType === 'hv' ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                      industryType === 'hv' ? "translate-x-8" : "translate-x-1"
                    )} />
                  </button>
                  <span className={cn(
                    "text-sm font-medium transition-colors",
                    industryType === 'hv' ? "text-foreground" : "text-muted-foreground"
                  )}>
                    High-Value Industries
                  </span>
                </div>
                
                {/* Billing Cycle Toggle */}
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

              {/* Pricing Cards */}
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {geographicTiers.map((tier, index) => {
                  const tierKey = `${tier}_${industryType}`;
                  const tierData = SUBSCRIPTION_TIERS[tierKey];
                  if (!tierData) return null;

                  const price = billingCycle === 'monthly' 
                    ? tierData.monthly_price_cents 
                    : tierData.annual_price_cents;
                  const isPopular = tier === 'statewide';

                  return (
                    <Card 
                      key={tier}
                      className={cn(
                        "relative transition-all duration-300 hover:shadow-xl",
                        tierColors[tier],
                        isPopular && "ring-2 ring-primary scale-105 md:scale-110 z-10"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground">
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pb-4">
                        <div className={cn(
                          "w-14 h-14 mx-auto rounded-xl flex items-center justify-center mb-4",
                          tier === 'local' && "bg-blue-500/10 text-blue-600",
                          tier === 'statewide' && "bg-purple-500/10 text-purple-600",
                          tier === 'nationwide' && "bg-amber-500/10 text-amber-600"
                        )}>
                          {tierIcons[tier]}
                        </div>
                        <CardTitle className="text-2xl">{GEOGRAPHIC_TIER_LABELS[tier]}</CardTitle>
                        <CardDescription>{GEOGRAPHIC_TIER_DESCRIPTIONS[tier]}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="text-center">
                        <div className="mb-6">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold">{formatSubscriptionPrice(price)}</span>
                            <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                          </div>
                          {billingCycle === 'annual' && (
                            <p className="text-sm text-green-600 mt-1">
                              Save {formatSubscriptionPrice(tierData.monthly_price_cents * 2)}/year
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            per profile
                          </p>
                        </div>

                        <ul className="space-y-3 text-left mb-6">
                          <li className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">Unlimited leads in your {tier} area</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Lock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{PRICE_LOCK_PERIOD_MONTHS}-month price lock guarantee</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Shield className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">Extended protection with &lt;{PRICE_LOCK_CLICK_THRESHOLD} views/month</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">Cancel anytime, no contracts</span>
                          </li>
                        </ul>

                        <Button 
                          className="w-full" 
                          variant={isPopular ? "default" : "outline"}
                          onClick={() => navigate("/register?mode=signup&type=digger")}
                        >
                          Get Started
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
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

        {/* High-Value Industries Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <Badge variant="outline" className="mb-4">
                  <Building2 className="h-3 w-3 mr-1" />
                  Industry Categories
                </Badge>
                <h2 className="text-3xl font-bold mb-4">Standard vs. High-Value Industries</h2>
                <p className="text-muted-foreground">
                  Pricing varies based on industry type. High-value industries typically have higher 
                  lead values and more competitive markets.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Standard Industries
                    </CardTitle>
                    <CardDescription>
                      Most service professions including home services, trades, and general consulting
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Examples: Plumbing, Electrical, HVAC, Cleaning, Landscaping, Tutoring, Photography, Web Design, and more.
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">From {formatSubscriptionPrice(1900)}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      High-Value Industries
                    </CardTitle>
                    <CardDescription>
                      Industries with higher lead values and competitive customer acquisition costs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="mb-4">
                      <AccordionItem value="industries" className="border-none">
                        <AccordionTrigger className="text-sm py-2">
                          View all high-value industries
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                            {HIGH_VALUE_INDUSTRIES.slice(0, 20).map((industry) => (
                              <span key={industry}>{industry}</span>
                            ))}
                            {HIGH_VALUE_INDUSTRIES.length > 20 && (
                              <span className="text-primary">+{HIGH_VALUE_INDUSTRIES.length - 20} more</span>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">From {formatSubscriptionPrice(3900)}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">How Subscription Works</h2>
                <p className="text-muted-foreground">
                  Simple, transparent pricing with no surprises
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
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
                  <h3 className="font-semibold mb-2">2. Choose Your Coverage</h3>
                  <p className="text-sm text-muted-foreground">
                    Select local, statewide, or nationwide coverage based on where you serve customers.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Receive Unlimited Leads</h3>
                  <p className="text-sm text-muted-foreground">
                    Get all matching leads in your area. No per-lead fees, just one predictable monthly cost.
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
                <AccordionItem value="per-profile" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    Is pricing per profile or per account?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Pricing is <strong>per profile</strong>. If you offer multiple services in different 
                    industries or need different geographic coverage for different services, you can 
                    create separate profiles. Each profile has its own subscription based on its 
                    industry type and coverage area.
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="mixed-industries" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    What if I have both standard and high-value professions?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If a single profile contains both standard and high-value professions, the 
                    <strong> higher rate applies</strong>. To optimize costs, we recommend creating 
                    separate profiles for standard and high-value services.
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
                    After your initial 12-month price lock, we check your monthly profile views. 
                    If you receive fewer than {PRICE_LOCK_CLICK_THRESHOLD} views, your locked rate 
                    continues. If you receive {PRICE_LOCK_CLICK_THRESHOLD} or more, your rate updates 
                    to current pricing on your next billing cycle.
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