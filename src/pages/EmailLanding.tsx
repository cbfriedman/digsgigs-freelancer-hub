import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Star, Clock, Shield, Users, ArrowRight, Sparkles } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { supabase } from "@/integrations/supabase/client";

const testimonials = [
  {
    name: "Sarah M.",
    location: "Austin, TX",
    text: "Got 4 quotes within 24 hours! Found an amazing contractor and saved $2,000.",
    rating: 5,
    project: "Kitchen Remodel",
  },
  {
    name: "Michael R.",
    location: "Denver, CO",
    text: "So easy to use. No spam calls, just real quotes from verified pros.",
    rating: 5,
    project: "Bathroom Renovation",
  },
  {
    name: "Jennifer L.",
    location: "Phoenix, AZ",
    text: "Finally, a service that respects my time. Quick responses, quality work.",
    rating: 5,
    project: "Roof Repair",
  },
];

const trustBadges = [
  { icon: Users, text: "847+ Projects Posted" },
  { icon: Star, text: "4.8/5 Average Rating" },
  { icon: Shield, text: "Verified Professionals" },
  { icon: Clock, text: "24-Hour Response" },
];

const valueProps = [
  { icon: CheckCircle2, title: "Compare Multiple Quotes", description: "Get up to 5 competitive quotes" },
  { icon: Shield, title: "Verified Local Pros", description: "Background-checked professionals" },
  { icon: Clock, title: "No Spam, No Obligation", description: "We respect your inbox" },
  { icon: Sparkles, title: "100% Free Forever", description: "Never pay to get quotes" },
];

const EmailLanding = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const { getCampaignData, isEmailCampaign } = useUTMTracking();
  const { trackEvent, isConfigured: fbConfigured } = useFacebookPixel();
  const { trackConversion, isConfigured: gaConfigured } = useGoogleAdsConversion();

  // Track page view on mount
  useEffect(() => {
    const campaignData = getCampaignData();
    
    // Track ViewContent event for FB Pixel
    if (fbConfigured) {
      trackEvent('ViewContent', {
        content_name: 'Email Landing Page',
        content_category: 'Landing Page',
        ...campaignData,
      });
    }
    
    // Log page view to campaign_conversions
    const logPageView = async () => {
      try {
        await supabase.functions.invoke('log-campaign-event', {
          body: {
            conversion_type: 'page_view',
            ...campaignData,
          },
        });
      } catch (error) {
        console.error('Failed to log page view:', error);
      }
    };
    
    logPageView();
  }, [getCampaignData, trackEvent, fbConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setLoading(true);
    const campaignData = getCampaignData();
    
    try {
      // Log email capture event
      await supabase.functions.invoke('log-campaign-event', {
        body: {
          conversion_type: 'email_capture',
          email,
          ...campaignData,
        },
      });
      
      // Track Lead event for FB Pixel
      if (fbConfigured) {
        trackEvent('Lead', {
          content_name: 'Email Capture',
          content_category: 'Email Landing',
          value: 1,
        });
      }
      
      // Track conversion for Google Ads
      if (gaConfigured) {
        trackConversion(1);
      }
      
      setSubmitted(true);
      toast.success("Thanks! Check your email for next steps.");
      
      // Store email for registration flow
      sessionStorage.setItem('pendingEmail', email);
      
      // Redirect to registration after brief delay
      setTimeout(() => {
        navigate('/register?returnTo=/post-gig');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting email:', error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Get Free Quotes from Local Pros | DigsAndGigs"
        description="Get 3+ free quotes from verified local professionals in 24 hours. No spam, no obligation. Compare prices and hire with confidence."
        canonical="/email"
        ogType="website"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Hero Section */}
        <section className="relative px-4 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="container mx-auto max-w-4xl text-center">
            {/* Trust badge */}
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
              Trusted by 1,000+ homeowners
            </Badge>
            
            {/* Main headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-4">
              Get <span className="text-primary">3+ Free Quotes</span><br />
              from Local Pros in 24 Hours
            </h1>
            
            {/* Sub-headline */}
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              No commitment. 100% free. Compare prices and hire the best pro for your project.
            </p>
            
            {/* Email capture form */}
            <Card className="max-w-md mx-auto shadow-lg border-0 bg-card/80 backdrop-blur">
              <CardContent className="pt-6">
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base"
                      required
                    />
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-base font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        "Processing..."
                      ) : (
                        <>
                          Get My Free Quotes
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      No spam, ever. We respect your privacy.
                    </p>
                  </form>
                ) : (
                  <div className="py-4 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-semibold text-foreground">You're all set!</p>
                    <p className="text-muted-foreground">Redirecting you to complete your request...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Trust badges */}
        <section className="py-8 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {trustBadges.map((badge, index) => (
                <div key={index} className="flex items-center justify-center gap-2 text-muted-foreground">
                  <badge.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Value propositions */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Why Homeowners Choose Us
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {valueProps.map((prop, index) => (
                <Card key={index} className="text-center p-6 border-0 shadow-sm hover:shadow-md transition-shadow">
                  <prop.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">{prop.title}</h3>
                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Testimonials */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              What Our Users Say
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="p-6 border-0 shadow-sm">
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4">"{testimonial.text}"</p>
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-muted-foreground">{testimonial.location} • {testimonial.project}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
        
        {/* Final CTA */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Start Your Project?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of homeowners who found their perfect pro through DigsAndGigs.
            </p>
            <Button 
              size="lg" 
              className="h-14 px-8 text-lg font-semibold"
              onClick={() => {
                document.querySelector('input[type="email"]')?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center' 
                });
                (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
              }}
            >
              Get Free Quotes Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>
        
        {/* Sticky mobile CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t md:hidden">
          <Button 
            className="w-full h-12 text-base font-semibold"
            onClick={() => {
              document.querySelector('input[type="email"]')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
              });
              (document.querySelector('input[type="email"]') as HTMLInputElement)?.focus();
            }}
          >
            Get My Free Quotes
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
        
        {/* Spacer for mobile sticky CTA */}
        <div className="h-20 md:hidden" />
      </div>
    </>
  );
};

export default EmailLanding;
