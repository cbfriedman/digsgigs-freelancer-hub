import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  DollarSign, 
  Target, 
  Zap, 
  Shield, 
  Star, 
  Check,
  ArrowRight,
  Clock,
  Users
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useGoogleAdsConversion } from '@/hooks/useGoogleAdsConversion';
import { useUTMTracking } from '@/hooks/useUTMTracking';

const FBDiggerLanding = () => {
  const { trackEvent, trackCustomEvent } = useFacebookPixel();
  const { trackPageView } = useGoogleAdsConversion();
  const { getCampaignData } = useUTMTracking();
  
  const scrollTracked = useRef({ 25: false, 50: false, 75: false });

  // Track page view on mount
  useEffect(() => {
    trackEvent('ViewContent', {
      content_name: 'FB Digger Landing',
      content_category: 'landing_page',
      source: 'facebook_ads'
    });
    trackPageView('/fb-digger');
  }, [trackEvent, trackPageView]);

  // Scroll depth tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= 25 && !scrollTracked.current[25]) {
        scrollTracked.current[25] = true;
        trackCustomEvent('FB_Landing_25_Scroll', { page: 'fb-digger' });
      }
      if (scrollPercent >= 50 && !scrollTracked.current[50]) {
        scrollTracked.current[50] = true;
        trackCustomEvent('FB_Landing_50_Scroll', { page: 'fb-digger' });
      }
      if (scrollPercent >= 75 && !scrollTracked.current[75]) {
        scrollTracked.current[75] = true;
        trackCustomEvent('FB_Landing_75_Scroll', { page: 'fb-digger' });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackCustomEvent]);

  const handleCTAClick = () => {
    const campaignData = getCampaignData();
    trackEvent('Lead', {
      content_name: 'FB Digger Signup CTA',
      source: 'facebook_ads',
      ...campaignData
    });
  };

  // Build registration URL with UTM params preserved
  const getRegistrationUrl = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('mode', 'signup');
    params.set('type', 'digger');
    return `/register?${params.toString()}`;
  };

  const testimonials = [
    {
      name: "Marcus T.",
      role: "Web Developer",
      quote: "Finally, a platform that doesn't take a cut of my hard work. I've increased my take-home by 25%.",
      rating: 5,
      joined: "2 weeks ago"
    },
    {
      name: "Sarah K.",
      role: "Marketing Consultant",
      quote: "No more racing to the bottom. I only pay for leads I actually want.",
      rating: 5,
      joined: "3 weeks ago"
    },
    {
      name: "David L.",
      role: "UI/UX Designer",
      quote: "The 5% advance on exclusive jobs is genius. Shows clients are serious.",
      rating: 5,
      joined: "1 week ago"
    }
  ];

  return (
    <>
      <SEOHead
        title="Join Digs & Gigs | Keep 100% of Your Freelance Earnings"
        description="Stop paying 20% platform fees. Join a freelance marketplace with zero commissions, no bidding wars, and leads delivered directly to you."
        canonical="/fb-digger"
        keywords="freelancer no commission, keep 100% earnings, freelance leads, no bidding"
        noindex={true}
      />
      
      <div className="min-h-screen bg-background">
        {/* Minimal Header - Logo Only */}
        <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="inline-block">
              <span className="text-2xl font-bold">
                <span className="text-primary">Digs</span>
                <span className="text-muted-foreground">&</span>
                <span className="text-primary">Gigs</span>
              </span>
            </Link>
          </div>
        </header>

        {/* Hero Section - Critical Above the Fold */}
        <section className="py-12 md:py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Limited Early Access
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Stop Giving Away{' '}
              <span className="text-primary">20%</span>{' '}
              of Your Earnings
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join freelancers who keep <strong className="text-foreground">100% of what they earn</strong>. 
              No commissions. No bidding wars. Ever.
            </p>
            
            <Link to={getRegistrationUrl()} onClick={handleCTAClick}>
              <Button size="lg" className="bg-[hsl(var(--hero-orange))] hover:bg-[hsl(var(--hero-orange))]/90 text-white text-lg px-8 py-6 h-auto">
                Get Early Access
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" /> Free to join
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" /> No credit card
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-4 w-4 text-green-500" /> 2-minute signup
              </span>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: DollarSign, text: "Tired of 20% platform fees eating your profits?" },
                { icon: Users, text: "Sick of racing to the bottom against 50 bidders?" },
                { icon: Clock, text: "Hate spending hours on proposals that go nowhere?" }
              ].map((item, index) => (
                <Card key={index} className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-6 text-center">
                    <item.icon className="h-8 w-8 text-destructive mx-auto mb-3" />
                    <p className="font-medium text-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Value Props Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Here's What You <span className="text-primary">Actually Get</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: DollarSign,
                  title: "Zero Commissions",
                  description: "Keep 100% of every dollar you earn. We never take a cut of your projects."
                },
                {
                  icon: Target,
                  title: "No Bidding Wars",
                  description: "Leads come directly to you. No racing against dozens of competitors."
                },
                {
                  icon: Zap,
                  title: "Leads Delivered to You",
                  description: "Matching projects land in your inbox. You choose which ones to pursue."
                },
                {
                  icon: Shield,
                  title: "5% Advance on Awards",
                  description: "When a client hires you exclusively, they put 5% down. You get it as an advance."
                }
              ].map((item, index) => (
                <Card key={index} className="border-primary/20">
                  <CardContent className="p-6 flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <item.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How It Works
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Create Free Profile", desc: "Takes 2 minutes. Tell us your skills and service area." },
                { step: "2", title: "Receive Matching Leads", desc: "Projects matching your skills are delivered to your inbox." },
                { step: "3", title: "Unlock Leads You Want", desc: "Pay only for leads you choose. Keep 100% of earnings." }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Transparency */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-center text-muted-foreground mb-10">No subscriptions. No monthly fees. No commissions.</p>
            
            <Card className="border-2 border-primary">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <p className="font-semibold text-lg">Non-Exclusive Leads</p>
                      <p className="text-sm text-muted-foreground">Pay per lead you unlock</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">$10–$49</p>
                  </div>
                  
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div>
                      <p className="font-semibold text-lg">Exclusive Awards</p>
                      <p className="text-sm text-muted-foreground">3% referral fee (from client deposit)</p>
                    </div>
                    <p className="text-2xl font-bold text-primary">$10–$249</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg">Your Project Earnings</p>
                      <p className="text-sm text-muted-foreground">What you keep from every job</p>
                    </div>
                    <p className="text-2xl font-bold text-green-500">100%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Freelancers Are Making the Switch
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-4 italic">"{testimonial.quote}"</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">Joined {testimonial.joined}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
              Common Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="free">
                <AccordionTrigger className="text-left">Is it really free to join?</AccordionTrigger>
                <AccordionContent>
                  Yes, 100% free. Create your profile, get matched with leads, and only pay when you choose to unlock a lead you're interested in. No monthly fees, no subscriptions.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="cost">
                <AccordionTrigger className="text-left">How much do leads cost?</AccordionTrigger>
                <AccordionContent>
                  Non-exclusive leads range from $10 to $49 depending on the project size (2% of the project midpoint, min $10, max $49). For exclusive awards, there's a 3% referral fee ($50-$249) that comes from the client's deposit—not your pocket.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="advance">
                <AccordionTrigger className="text-left">What's the 5% advance?</AccordionTrigger>
                <AccordionContent>
                  When a client hires you exclusively, they put down a 5% deposit. Once you accept the job, that 5% is released to you as an advance payment toward the project—deducted from what they owe you. It shows the client is serious and gives you working capital.
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="bogus">
                <AccordionTrigger className="text-left">What if a lead is bogus?</AccordionTrigger>
                <AccordionContent>
                  We offer full refunds for bogus leads. If you unlock a lead and the client is unreachable, fake, or the project doesn't match the description, contact us and we'll credit your account.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 px-4 bg-primary/5 border-t border-primary/20">
          <div className="container mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Clock className="h-4 w-4" />
              Early Access Closing Soon
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Keep 100%?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join now and get 3 free lead unlocks in your first month.
            </p>
            
            <Link to={getRegistrationUrl()} onClick={handleCTAClick}>
              <Button size="lg" className="bg-[hsl(var(--hero-orange))] hover:bg-[hsl(var(--hero-orange))]/90 text-white text-lg px-10 py-6 h-auto">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Takes 2 minutes
            </p>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-8 px-4 border-t">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Digs & Gigs. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-2">
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default FBDiggerLanding;
