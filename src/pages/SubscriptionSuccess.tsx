import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Crown, 
  Lock, 
  Calendar,
  ArrowRight,
  Loader2,
  Sparkles
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { PRICE_LOCK_PERIOD_MONTHS, PRICE_LOCK_CLICK_THRESHOLD } from "@/config/subscriptionTiers";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [showConfetti, setShowConfetti] = useState(false);
  const { trackEvent, isConfigured } = useFacebookPixel();

  useEffect(() => {
    // Track Purchase event for subscription
    if (isConfigured && sessionId) {
      try {
        trackEvent('Purchase', {
          content_name: 'Subscription',
          content_type: 'subscription',
          value: 0, // Can be enhanced to fetch actual subscription value
          currency: 'USD',
        });
      } catch (error) {
        console.warn('Facebook Pixel: Error tracking Purchase event', error);
      }
    }
  }, [isConfigured, sessionId, trackEvent]);

  useEffect(() => {
    // Trigger confetti on mount
    if (!showConfetti) {
      setShowConfetti(true);
      
      // Load confetti dynamically for code splitting
      import("canvas-confetti").then((confetti) => {
        // Fire confetti
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval: NodeJS.Timeout = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          confetti.default({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti.default({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          });
        }, 250);

        // Return cleanup function
        return () => clearInterval(interval);
      }).catch((err) => {
        console.warn("Failed to load confetti:", err);
      });
    }
  }, [showConfetti]);

  return (
    <>
      <Helmet>
        <title>Subscription Activated! | DigsAndGigs</title>
        <meta name="description" content="Your subscription has been activated. Start receiving leads from consumers in your service area." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <Badge variant="outline" className="gap-1 mb-4">
                <Sparkles className="h-3 w-3" />
                Subscription Active
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Welcome to DigsAndGigs!
              </h1>
              <p className="text-lg text-muted-foreground">
                Your subscription is now active. You're ready to start receiving leads from consumers in your service area.
              </p>
            </div>

            {/* What's Next Card */}
            <Card className="mb-8 text-left">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  What Happens Next
                </CardTitle>
                <CardDescription>
                  Here's what you can expect as a subscribed digger
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Your Profile is Now Visible</p>
                    <p className="text-sm text-muted-foreground">
                      Consumers searching for services in your area can now find and contact you.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Receive Lead Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      When a consumer views your profile, you'll be notified so you can follow up.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Grow Your Business</p>
                    <p className="text-sm text-muted-foreground">
                      Connect with potential customers and expand your client base.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Price Lock Info */}
            <Card className="mb-8 text-left border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-primary">Your Rate is Locked In!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your subscription rate is guaranteed for {PRICE_LOCK_PERIOD_MONTHS} months from today. 
                      After that, it stays locked as long as you receive fewer than {PRICE_LOCK_CLICK_THRESHOLD} profile views per month.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/my-profiles')} className="gap-2">
                View My Profiles
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/browse-gigs')}>
                Browse Available Gigs
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}
