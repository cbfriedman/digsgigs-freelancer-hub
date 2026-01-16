/**
 * Facebook Ads Landing Page for Digger Acquisition
 * URL: /apply-digger-fb
 * 
 * Optimized for FB ad messaging:
 * - "Bid for Exclusive Jobs — Pay Only if Selected"
 * - Two-path structure: Non-Exclusive Leads vs Exclusive Awards
 * - Clear pricing: $3-$49 leads, 3% referral fee from client's 5% deposit
 */

import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Mail, 
  Trophy, 
  DollarSign, 
  CheckCircle, 
  Users, 
  Zap,
  Shield,
  ArrowRight,
  Clock,
  Target,
  Briefcase,
  UserPlus
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useGoogleAdsConversion } from '@/hooks/useGoogleAdsConversion';
import { useUTMTracking } from '@/hooks/useUTMTracking';

const ApplyDiggerFB = () => {
  const { trackEvent, trackCustomEvent } = useFacebookPixel();
  const { trackPageView } = useGoogleAdsConversion();
  const { getCampaignData } = useUTMTracking();
  const [searchParams] = useSearchParams();
  
  // Scroll tracking refs
  const scrollTracked = useRef({ 25: false, 50: false, 75: false });

  // Track page view on mount
  useEffect(() => {
    trackEvent('ViewContent', {
      content_name: 'Apply Digger FB Landing',
      content_category: 'landing_page',
      source: 'facebook_ads'
    });
    trackPageView('/apply-digger-fb');
  }, [trackEvent, trackPageView]);

  // Scroll depth tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      
      if (scrollPercent >= 25 && !scrollTracked.current[25]) {
        scrollTracked.current[25] = true;
        trackCustomEvent('FB_ApplyDigger_25_Scroll');
      }
      if (scrollPercent >= 50 && !scrollTracked.current[50]) {
        scrollTracked.current[50] = true;
        trackCustomEvent('FB_ApplyDigger_50_Scroll');
      }
      if (scrollPercent >= 75 && !scrollTracked.current[75]) {
        scrollTracked.current[75] = true;
        trackCustomEvent('FB_ApplyDigger_75_Scroll');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackCustomEvent]);

  const handleCTAClick = (ctaLocation: string) => {
    const campaignData = getCampaignData();
    trackEvent('Lead', {
      content_name: `Apply Digger FB - ${ctaLocation}`,
      source: 'facebook_ads',
      ...campaignData
    });
  };

  // Build registration URL with UTM params
  const getRegistrationUrl = () => {
    const baseUrl = '/register?mode=signup&type=digger';
    const utmSource = searchParams.get('utm_source') || 'facebook';
    const utmMedium = searchParams.get('utm_medium') || 'paid_social';
    const utmCampaign = searchParams.get('utm_campaign') || 'digger_acquisition';
    const utmContent = searchParams.get('utm_content') || '';
    
    let url = `${baseUrl}&utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
    if (utmContent) url += `&utm_content=${utmContent}`;
    return url;
  };

  return (
    <>
      <SEOHead
        title="Bid for Exclusive Jobs — Pay Only if Selected | Digs & Gigs"
        description="Get leads from $3 or bid for exclusive jobs and pay only when selected. No subscriptions, no platform fees. Join free today."
        canonical="/apply-digger-fb"
        noindex={true}
      />

      <div className="min-h-screen bg-background">
        {/* Minimal Header - Logo Only */}
        <header className="py-4 px-4 border-b border-border/50">
          <div className="max-w-6xl mx-auto">
            <Link to="/" className="text-xl font-bold text-foreground">
              Digs<span className="text-primary">&</span>Gigs
            </Link>
          </div>
        </header>

        {/* Section 1: Hero */}
        <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Bid for Exclusive Jobs — <span className="text-primary">Pay Only if Selected</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get leads emailed to you. Unlock what you want from <strong>$3</strong> — or bid for exclusive jobs and pay only when selected.
            </p>

            <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Hero')}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 h-auto">
                Create Your Free Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground mt-4">
              Free to join • No credit card required
            </p>
          </div>
        </section>

        {/* Section 2: Two Paths */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              Choose How You Want to Work
            </h2>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Non-Exclusive Leads */}
              <Card className="border-2 border-border bg-card">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-secondary/50">
                      <Mail className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Unlock Leads (Non-Exclusive)
                    </h3>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {[
                      'Leads emailed in real time',
                      'Pay only for what you unlock',
                      '$3–$49 based on budget',
                      'Other pros may also engage'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Leads Path')}>
                    <Button variant="outline" className="w-full">
                      Get Leads
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Exclusive Awards */}
              <Card className="border-2 border-primary bg-card relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-bl-lg">
                  RECOMMENDED
                </div>
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Bid for Exclusive Jobs
                    </h3>
                  </div>

                  <p className="text-sm text-primary font-medium mb-4">
                    Pay on Acceptance
                  </p>

                  <ul className="space-y-3 mb-6">
                    {[
                      'No upfront payment',
                      'Client selects you — job becomes exclusive',
                      'Client pays a 5% deposit when awarding',
                      '3% referral fee deducted from that deposit',
                      'You pay only when you\'re ready to start'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Exclusive Path')}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      Bid for Exclusive Jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 3: How It Works */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              How Digs & Gigs Works
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: UserPlus,
                  step: '1',
                  title: 'Create your free profile',
                  desc: 'Tell us what you do best.'
                },
                {
                  icon: Mail,
                  step: '2',
                  title: 'Get leads by email',
                  desc: 'Projects delivered to your inbox.'
                },
                {
                  icon: Target,
                  step: '3',
                  title: 'Choose your path',
                  desc: 'Unlock leads or bid for exclusive awards.'
                },
                {
                  icon: Briefcase,
                  step: '4',
                  title: 'Work directly with clients',
                  desc: 'No bidding wars. No middleman.'
                }
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <item.icon className="h-7 w-7 text-primary" />
                    <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Simple Pricing */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>

            <div className="grid md:grid-cols-2 gap-6 mt-10">
              {/* Leads Pricing */}
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-full bg-secondary/50 w-fit mx-auto mb-4">
                    <Mail className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Leads</h3>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    From $3 <span className="text-lg font-normal text-muted-foreground">— Max $49</span>
                  </div>
                  <p className="text-muted-foreground">
                    Pay only for the leads you want.
                  </p>
                </CardContent>
              </Card>

              {/* Exclusive Awards Pricing */}
              <Card className="border-2 border-primary bg-card">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Exclusive Awards</h3>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    3% <span className="text-lg font-normal text-muted-foreground">referral fee (up to $249)</span>
                  </div>
                  <p className="text-muted-foreground">
                    Deducted from the client's 5% deposit when you're ready to start.
                  </p>
                </CardContent>
              </Card>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8 bg-muted/50 p-4 rounded-lg">
              <Shield className="h-4 w-4 inline-block mr-2 text-primary" />
              <strong>You are never charged unless you accept an awarded job.</strong>
            </p>
          </div>
        </section>

        {/* Section 5: Why Digs & Gigs */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
              Why Freelancers Choose Digs & Gigs
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: DollarSign, text: 'No subscriptions' },
                { icon: Zap, text: 'No ongoing commissions' },
                { icon: Users, text: 'No bidding wars' },
                { icon: Shield, text: 'No platform tax' },
                { icon: Target, text: 'You choose how you engage' },
                { icon: Briefcase, text: 'You work directly with clients' }
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8 italic">
              "Built for independent professionals."
            </p>
          </div>
        </section>

        {/* Section 6: Social Proof */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Trusted by Independent Professionals
            </h2>
            <p className="text-muted-foreground mb-8">
              Join hundreds of freelancers using Digs & Gigs
            </p>

            {/* Placeholder testimonial cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((_, index) => (
                <Card key={index} className="border border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex justify-center mb-3">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="text-yellow-400">★</span>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-sm italic mb-4">
                      "Testimonial coming soon..."
                    </p>
                    <div className="w-10 h-10 rounded-full bg-muted mx-auto"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
              Ready to Get Started?
            </h2>

            <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Final CTA')}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 h-auto">
                Create Your Free Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              Takes 2 minutes • No card required
            </p>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="py-6 px-4 border-t border-border">
          <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Digs & Gigs. All rights reserved.</p>
            <div className="flex justify-center gap-4 mt-2">
              <Link to="/legal" className="hover:text-foreground">Privacy</Link>
              <Link to="/legal" className="hover:text-foreground">Terms</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default ApplyDiggerFB;
