/**
 * Facebook Ads Landing Page for Digger Acquisition
 * URL: /apply-digger-fb
 * 
 * Optimized for FB ad messaging:
 * - "Bid for Exclusive Jobs — Pay Only if Selected"
 * - Two-path structure: Non-Exclusive Leads vs Exclusive Awards
 * - Clear pricing: $10-$49 leads, 3% referral fee from client's 5% deposit
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
  UserPlus,
  Handshake
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { useFacebookPixel } from '@/hooks/useFacebookPixel';
import { useGoogleAdsConversion } from '@/hooks/useGoogleAdsConversion';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { useRedditPixel } from '@/hooks/useRedditPixel';

const ApplyDiggerFB = () => {
  const { trackEvent, trackCustomEvent } = useFacebookPixel();
  const { trackEvent: trackRedditEvent } = useRedditPixel();
  const { trackPageView } = useGoogleAdsConversion();
  const { getCampaignData } = useUTMTracking();
  const [searchParams] = useSearchParams();
  
  // Scroll tracking refs
  const scrollTracked = useRef({ 25: false, 50: false, 75: false });
  const redditScrollTracked = useRef({ 50: false });

  // Track page view on mount
  useEffect(() => {
    trackEvent('ViewContent', {
      content_name: 'Apply Digger FB Landing',
      content_category: 'landing_page',
      source: 'facebook_ads'
    });
    trackPageView('/apply-digger-fb');
    
    // Reddit Pixel: Track PageVisit with page metadata
    trackRedditEvent('PageVisit', {
      page: 'apply-digger-fb',
      content_category: 'landing_page'
    });
  }, [trackEvent, trackPageView, trackRedditEvent]);

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
        
        // Reddit Pixel: Track ViewContent at 50% scroll
        if (!redditScrollTracked.current[50]) {
          redditScrollTracked.current[50] = true;
          trackRedditEvent('ViewContent', {
            page: 'apply-digger-fb',
            scroll_depth: 50
          });
        }
      }
      if (scrollPercent >= 75 && !scrollTracked.current[75]) {
        scrollTracked.current[75] = true;
        trackCustomEvent('FB_ApplyDigger_75_Scroll');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [trackCustomEvent, trackRedditEvent]);

  const handleCTAClick = (ctaLocation: string) => {
    const campaignData = getCampaignData();
    trackEvent('Lead', {
      content_name: `Apply Digger FB - ${ctaLocation}`,
      source: 'facebook_ads',
      ...campaignData
    });
    
    // Reddit Pixel: Track Lead event on CTA click
    trackRedditEvent('Lead', {
      content_name: `Apply Digger FB - ${ctaLocation}`,
      source: 'reddit_ads'
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
        description="Get vetted project requests from $10. Bid for exclusive jobs and pay only when selected. No subscriptions, no platform fees. Join free today."
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

        {/* SECTION 1: Hero (Above the Fold) */}
        <section className="py-12 md:py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
              Bid for Exclusive Jobs — <span className="text-primary">Pay Only if Selected</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get vetted project requests sent to your inbox. Browse what you want from <strong>$10</strong> — or bid for exclusive jobs and pay only when selected.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Hero')}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 h-auto font-semibold">
                  Create Your Free Profile
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              
              <Link to="/subscribe?source=fb_landing" onClick={() => handleCTAClick('Hero-Subscribe')}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto">
                  Just Get Lead Emails
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Free to join • No credit card required
            </p>

            <p className="text-xs text-muted-foreground mt-2 italic">
              Built for independent professionals.
            </p>
          </div>
        </section>

        {/* SECTION 2: Two Paths (Core Differentiator) */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {/* Card A: Non-Exclusive Leads */}
              <Card className="border-2 border-border bg-card">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 rounded-full bg-secondary/50">
                      <Mail className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Browse Projects (Non-Exclusive)
                    </h3>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {[
                      'Project requests sent to your inbox in real time',
                      'Pay only for the projects you choose',
                      '$10–$49 based on project budget',
                      'Other professionals may also engage'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Projects Path')}>
                    <Button variant="outline" className="w-full text-base py-5">
                      Browse Projects
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Card B: Exclusive Awards (Highlighted) */}
              <Card className="border-2 border-primary bg-card relative overflow-hidden shadow-lg shadow-primary/10">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-bl-lg">
                  RECOMMENDED
                </div>
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      Bid for Exclusive Jobs
                    </h3>
                  </div>

                  <p className="text-sm text-primary font-medium mb-6 ml-14">
                    (Pay on Acceptance)
                  </p>

                  <ul className="space-y-4 mb-8">
                    {[
                      'No upfront payment',
                      'Client selects you — job becomes exclusive',
                      'Client pays a 5% deposit when awarding',
                      '3% referral fee deducted from that deposit',
                      "You pay only when you're ready to start"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Exclusive Path')}>
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-base py-5">
                      Bid for Exclusive Jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 3: Simple, Transparent Pricing */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
              Simple, Transparent Pricing
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Box 1: Project Requests */}
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-full bg-secondary/50 w-fit mx-auto mb-4">
                    <Mail className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Project Requests</h3>
                  <div className="text-3xl font-bold text-foreground mb-3">
                    From $10 <span className="text-lg font-normal text-muted-foreground">— Max $49</span>
                  </div>
                  <p className="text-muted-foreground">
                    Pay only for the projects you choose to pursue.
                  </p>
                </CardContent>
              </Card>

              {/* Box 2: Exclusive Awards */}
              <Card className="border-2 border-primary bg-card">
                <CardContent className="p-6 text-center">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                    <Trophy className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Exclusive Awards</h3>
                  <div className="text-3xl font-bold text-foreground mb-3">
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

        {/* SECTION 4: How It Works (4 Steps) */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              How Digs & Gigs Works
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  title: 'Get project requests by email',
                  desc: 'Opportunities delivered straight to your inbox.'
                },
                {
                  icon: Target,
                  step: '3',
                  title: 'Choose your path',
                  desc: 'Browse projects or bid for exclusive awards.'
                },
                {
                  icon: Handshake,
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

        {/* SECTION 5: Why Digs & Gigs */}
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
              Designed for independent professionals.
            </p>
          </div>
        </section>

        {/* SECTION 6: Trust Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Why Join Today
            </h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Simple pricing, no commitments. Start receiving project requests instantly.
            </p>

            <div className="grid sm:grid-cols-3 gap-6">
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">$0 Setup Fee</h3>
                  <p className="text-sm text-muted-foreground">Save $199 when you join today</p>
                </CardContent>
              </Card>
              
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Target className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">Pay Per Project</h3>
                  <p className="text-sm text-muted-foreground">$10–$49 per project, nothing more</p>
                </CardContent>
              </Card>
              
              <Card className="border border-border bg-card">
                <CardContent className="p-6 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold text-foreground mb-2">No Contracts</h3>
                  <p className="text-sm text-muted-foreground">Cancel anytime, no commitments</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 7: Final CTA */}
        <section className="py-16 px-4 bg-primary/5">
          <div className="max-w-2xl mx-auto text-center">
            <Link to={getRegistrationUrl()} onClick={() => handleCTAClick('Final CTA')}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-10 py-6 h-auto font-semibold">
                Create Your Free Profile
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <p className="text-sm text-muted-foreground mt-4 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              Takes 2 minutes • No credit card required
            </p>
          </div>
        </section>

        {/* Info Note */}
        <section className="py-8 px-4 bg-muted/20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">How exclusive awards work:</strong> When a client awards you an exclusive job, they pay a 5% deposit. You receive that deposit — and our 3% referral fee is deducted from it.
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
