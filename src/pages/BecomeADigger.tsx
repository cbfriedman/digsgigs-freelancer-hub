import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useRedditPixel } from "@/hooks/useRedditPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { Mail, CheckCircle2, Zap, DollarSign, Users, Star, ArrowRight, Crown } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function BecomeADigger() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [subscriberId, setSubscriberId] = useState<string | null>(null);

  const { trackEvent } = useFacebookPixel();
  const { trackEvent: trackRedditEvent } = useRedditPixel();
  const { trackConversion } = useGoogleAdsConversion();
  const { getUTMParams } = useUTMTracking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const utmParams = getUTMParams();

      // NOTE: Do not request returned rows for anonymous inserts.
      // PostgREST will attempt a SELECT to return the inserted row, which can fail under RLS.
      const { error } = await supabase.from("subscribers").insert({
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        source: "become-a-digger",
        utm_source: utmParams?.utm_source || null,
        utm_medium: utmParams?.utm_medium || null,
        utm_campaign: utmParams?.utm_campaign || null,
        utm_content: utmParams?.utm_content || null,
      });

      if (error) {
        // If the email is already subscribed, treat as success.
        if (error.code !== "23505") throw error;
      }

      // We intentionally do not set subscriberId here to avoid any anonymous SELECT.
      setSubscriberId(null);

      // Fire conversion pixels
      trackEvent("Lead", { 
        content_name: "digger_signup",
        content_category: "become-a-digger" 
      });
      trackRedditEvent("Lead", {
        conversionType: "digger_signup"
      });
      trackConversion(0, "USD");

      // Show Pro upgrade modal
      setShowProModal(true);

    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || "Failed to sign up. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclinePro = () => {
    setShowProModal(false);
    setShowThankYou(true);
  };

  const handleAcceptPro = () => {
    // Store the subscriber info for pre-filling the registration
    sessionStorage.setItem("digger_prefill", JSON.stringify({
      fullName,
      email,
      phone,
      subscriberId,
    }));
    navigate("/pro-digger-signup");
  };

  if (showThankYou) {
    return (
      <>
        <SEOHead
          title="You're In! | Digs & Gigs"
          description="Welcome to Digs & Gigs. You'll receive project opportunities in your inbox."
          canonical="/become-a-digger"
          noindex={true}
        />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">You're In!</CardTitle>
              <CardDescription className="text-base">
                We've added you to our lead notification list. You'll receive emails when clients need your services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Two Payment Options */}
              <div className="space-y-3 mb-4">
                <h3 className="font-semibold text-sm text-center">Two Ways to Get Work:</h3>
                
                {/* Option 1: Pay Per Lead */}
                <div className="bg-muted rounded-lg p-4 border-l-4 border-primary">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-semibold text-sm">Option 1: Pay Per Lead</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Browse leads and unlock the ones you want for <span className="font-medium text-foreground">$9-$49</span>. 
                        Contact info revealed instantly. No further fees.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 2: Get Awarded */}
                <div className="bg-muted rounded-lg p-4 border-l-4 border-accent">
                  <div className="flex items-start gap-3">
                    <Star className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-semibold text-sm">Option 2: Get Awarded a Project</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        When a client chooses you, pay only <span className="font-medium text-foreground">8% referral fee</span>. 
                        Keep 92% of your earnings—no upfront cost.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Option 3: Pro Upgrade */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border-l-4 border-primary">
                  <div className="flex items-start gap-3">
                    <Crown className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-left">
                      <h4 className="font-semibold text-sm">Option 3: Upgrade to Pro — $29/mo</h4>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        <li className="flex items-start gap-1.5">
                          <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <span><span className="font-medium text-foreground">Instant leads</span> — get notified the moment they're posted (vs 2 hours later)</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <Users className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                          <span><span className="font-medium text-foreground">Featured listing</span> — appear in our searchable Diggers directory</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Benefits */}
              <div className="bg-card border rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>You'll receive emails instantly when new projects match your skills</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Choose to unlock leads ($9-$49) OR wait to be awarded (8% fee)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>No subscriptions or commitments required</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                  Go to Homepage
                </Button>
                <Button onClick={handleAcceptPro} variant="default" className="w-full">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Pro ($29/mo)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Become a Digger | Get Tech Freelance Leads | Digs & Gigs"
        description="Join Digs & Gigs to receive tech project leads directly in your inbox. Free to join, pay only for leads you want."
        canonical="/become-a-digger"
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Get Tech Project Leads <span className="text-primary">Instantly</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join 500+ freelancers receiving project opportunities. No fees until you win work.
            </p>
          </div>

          {/* Benefit Highlight */}
          <div className="bg-card border rounded-lg p-4 text-center mb-8 max-w-md mx-auto">
            <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Instant Delivery</h3>
            <p className="text-sm text-muted-foreground">Get leads emailed the moment clients post</p>
          </div>

          {/* Simple Form */}
          <Card className="max-w-md mx-auto shadow-lg border-primary/20">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Start Getting Leads
              </CardTitle>
              <CardDescription>
                Just 3 fields. Takes 30 seconds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Your Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    className="h-12 text-base"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-gradient-primary hover:opacity-90" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Joining..." : "Join Free & Get Leads"}
                  {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Free to join. By signing up, you agree to our{" "}
                  <Link to="/terms" className="underline">Terms</Link> &{" "}
                  <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Trust Indicators */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Trusted by freelancers in</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-muted-foreground">
              <span>Web Development</span>
              <span>•</span>
              <span>Mobile Apps</span>
              <span>•</span>
              <span>AI/ML</span>
              <span>•</span>
              <span>DevOps</span>
              <span>•</span>
              <span>UI/UX Design</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pro Upgrade Modal */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-center text-xl">
              Want Clients to Find You?
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Upgrade to <span className="font-semibold text-primary">Pro Digger</span> for $29/month and get discovered by clients in our directory.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">Pro Digger Benefits:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Appear in our searchable directory</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Showcase your portfolio, reviews & ratings</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Clients can contact you directly</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Priority lead matching</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleAcceptPro} className="w-full bg-gradient-primary hover:opacity-90">
                Upgrade to Pro — $29/mo
              </Button>
              <Button onClick={handleDeclinePro} variant="ghost" className="w-full text-muted-foreground">
                No thanks, just emails for now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
