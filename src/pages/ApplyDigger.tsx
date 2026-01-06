import { Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { 
  CheckCircle, 
  DollarSign, 
  Users, 
  Shield, 
  Clock, 
  Star,
  ArrowRight,
  Zap,
  Target,
  Lock
} from "lucide-react";

const ApplyDigger = () => {
  const { getCampaignData } = useUTMTracking();
  const { trackEvent, trackCustomEvent } = useFacebookPixel();
  const { trackPageView } = useGoogleAdsConversion();

  // Track page view on mount
  useEffect(() => {
    trackPageView('/apply-digger');
    trackEvent('ViewContent', { content_name: 'Digger Landing Page' });
  }, [trackPageView, trackEvent]);

  const handleCTAClick = () => {
    const campaignData = getCampaignData();
    trackCustomEvent('DiggerCTAClick', campaignData);
    trackEvent('Lead', { content_name: 'Digger Signup CTA' });
  };

  const registrationUrl = "/register?mode=signup&type=digger";

  return (
    <>
      <SEOHead
        title="Apply as a Digger | Freelancing Without the Platform Tax"
        description="Join a curated marketplace where clients find you — and you keep 100% of what you earn. No commissions. No bidding wars. 30-day free trial."
        canonical="/apply-digger"
        keywords="freelancer, freelance platform, no commission freelancing, keep 100% earnings"
      />

      <div className="min-h-screen bg-background">
        <Navigation />

        {/* Hero Section */}
        <section className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Freelancing — without the platform tax
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Join a curated marketplace where clients find you — and you keep 100% of what you earn.
              No commissions. No bidding wars. No race-to-the-bottom pricing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                asChild 
                size="lg" 
                className="text-lg px-8 py-6 h-auto"
                onClick={handleCTAClick}
              >
                <Link to={registrationUrl}>
                  Get Early Access
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free to join. Takes 2 minutes. No commissions — ever.
            </p>
          </div>
        </section>

        {/* Promo Box */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="bg-muted/50 rounded-lg border border-border/50 p-6 md:p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  🎉 Early-Access Freelancer Grant Giveaway
                </h2>
                <p className="text-lg text-muted-foreground">
                  Become one of the first 300 approved Diggers and you'll automatically receive free job-lead access for 3 months during our Early-Access launch.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-lg">✅</span>
                  <span className="text-sm font-medium">Free to join</span>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-lg">⏱</span>
                  <span className="text-sm font-medium">Takes 2 minutes</span>
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <span className="text-lg">💜</span>
                  <span className="text-sm font-medium">No commissions — ever</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Eligibility applies after your profile is fully completed and approved. Lead access does not guarantee work. Terms apply.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-8 border-y border-border/40 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-center">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Keep 100% of earnings</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Price-locked for 12 months</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              How it works
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              A straightforward process designed to respect your time and expertise.
            </p>
            
            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "1",
                  title: "Create your profile",
                  description: "Showcase your skills, experience, and the services you offer."
                },
                {
                  step: "2",
                  title: "Get discovered",
                  description: "Clients search for professionals like you. No bidding required."
                },
                {
                  step: "3",
                  title: "Review leads",
                  description: "See project details and budgets before deciding to connect."
                },
                {
                  step: "4",
                  title: "Work directly",
                  description: "Communicate and transact directly with clients. No middleman."
                }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Secondary CTA */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <Button 
              asChild 
              size="lg" 
              className="text-lg px-8 py-6 h-auto w-full md:w-auto"
              onClick={handleCTAClick}
            >
              <Link to={registrationUrl}>
                👉 Apply Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Built differently
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              We believe freelancers deserve better than platform taxes and race-to-the-bottom bidding.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: DollarSign,
                  title: "Zero commissions",
                  description: "Keep every dollar you earn. We don't take a cut of your projects — ever."
                },
                {
                  icon: Target,
                  title: "No bidding wars",
                  description: "Clients find and reach out to you. No competing on price with dozens of others."
                },
                {
                  icon: Zap,
                  title: "Transparent lead pricing",
                  description: "Pay only for leads you want to pursue. Pricing based on project budget, not hidden fees."
                },
                {
                  icon: Users,
                  title: "Quality over quantity",
                  description: "A curated marketplace means less noise and more serious clients."
                },
                {
                  icon: Shield,
                  title: "Your reputation, protected",
                  description: "Build your brand on honest reviews and real completed projects."
                },
                {
                  icon: Clock,
                  title: "Respect for your time",
                  description: "See project details upfront. No wasted time on mismatched opportunities."
                }
              ].map((item, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-6">
                    <item.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Start free. Pay only when you're ready — and only for leads you choose.
            </p>
            
            <Card className="border-primary/20 shadow-lg">
              <CardContent className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="inline-block bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-4">
                      Founder Pricing
                    </div>
                    <h3 className="text-2xl font-bold mb-2">30-day free trial</h3>
                    <p className="text-muted-foreground mb-4">
                      Then <span className="font-semibold text-foreground">$49/month</span> — locked for 12 months
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Full profile and marketplace access",
                        "Smart matching with relevant projects",
                        "Direct client communication",
                        "No commissions on your earnings"
                      ].map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Lead pricing by project budget</h4>
                    <div className="space-y-3 text-sm">
                      {[
                        { budget: "Under $1,000", price: "$25" },
                        { budget: "$1,000 – $3,000", price: "$35" },
                        { budget: "$3,000 – $7,500", price: "$65" },
                        { budget: "$7,500 – $20,000", price: "$95" },
                        { budget: "$20,000+", price: "$140" }
                      ].map((item, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-muted-foreground">{item.budget}</span>
                          <span className="font-medium">{item.price}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Only pay for leads you choose to unlock.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              What freelancers are saying
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  quote: "Finally, a platform that doesn't treat freelancers like a commodity. The leads are quality and the pricing is fair.",
                  author: "Sarah M.",
                  role: "Interior Designer"
                },
                {
                  quote: "No more racing to the bottom on bids. Clients come to me based on my work, not my willingness to undercut.",
                  author: "Marcus T.",
                  role: "Web Developer"
                }
              ].map((item, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{item.quote}"</p>
                    <div>
                      <p className="font-semibold">{item.author}</p>
                      <p className="text-sm text-muted-foreground">{item.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Common questions
            </h2>
            
            <div className="space-y-6">
              {[
                {
                  question: "How is Digs & Gigs different from other freelance platforms?",
                  answer: "We don't take commissions from your earnings — ever. Instead of bidding against other freelancers, clients find and reach out to you based on your profile and expertise. You only pay for leads you choose to pursue."
                },
                {
                  question: "What happens after my 30-day trial?",
                  answer: "If you decide to continue, you'll be charged $49/month at our Founder rate. This price is locked for 12 months. You can cancel anytime — no questions asked."
                },
                {
                  question: "How much do leads cost?",
                  answer: "Lead pricing is based on the client's project budget, ranging from $25 to $140 per lead. You see project details before deciding to unlock contact information, so you never pay for mismatched opportunities."
                },
                {
                  question: "Can I really keep 100% of what I earn?",
                  answer: "Yes. We don't take any percentage of your project fees. Your earnings are yours. We make money through subscriptions and lead fees, not by taking a cut of your work."
                },
                {
                  question: "What if I'm not getting enough leads?",
                  answer: "We're building a quality-focused marketplace. If leads are slow in your area or specialty, you can pause your subscription and resume when you're ready. No penalties."
                }
              ].map((item, index) => (
                <div key={index} className="border-b border-border/50 pb-6">
                  <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                  <p className="text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to freelance on your terms?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Join a platform that believes your work is worth 100% of what clients pay. Start your free trial today.
            </p>
            <Button 
              asChild 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 h-auto"
              onClick={handleCTAClick}
            >
              <Link to={registrationUrl}>
                Apply for Early Access
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm opacity-75 mt-4">
              30-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </section>

        <Footer />


        {/* Mobile Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:hidden z-50">
          <Button 
            asChild 
            className="w-full"
            onClick={handleCTAClick}
          >
            <Link to={registrationUrl}>
              Apply for Early Access
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Free to join. Takes 2 minutes. No commissions — ever.
          </p>
        </div>
      </div>
    </>
  );
};

export default ApplyDigger;
