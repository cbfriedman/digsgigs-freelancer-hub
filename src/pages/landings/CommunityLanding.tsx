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
import SEOHead from "@/components/SEOHead";
import {
  Mail, CheckCircle2, Zap, DollarSign, Users, Star,
  ArrowRight, Crown, Code, Rocket, Terminal, Globe
} from "lucide-react";

export interface CommunityLandingConfig {
  source: string;
  platformName: string;
  heroTitle: React.ReactNode;
  heroSubtitle: string;
  ctaText: string;
  socialProofLine: string;
  showGigsCTA: boolean;
  seoTitle: string;
  seoDescription: string;
  canonicalPath: string;
  accentIcon: React.ReactNode;
  benefits: { icon: React.ReactNode; title: string; description: string }[];
}

export default function CommunityLanding({ config }: { config: CommunityLandingConfig }) {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  const { trackEvent } = useFacebookPixel();
  const { trackEvent: trackRedditEvent } = useRedditPixel();
  const { trackConversion } = useGoogleAdsConversion();
  const { getUTMParams, getCampaignData } = useUTMTracking();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsSubmitting(true);

    try {
      const utmParams = getUTMParams();
      const campaignData = getCampaignData();

      const { error } = await supabase.from("subscribers").insert({
        email: email.toLowerCase().trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        source: config.source,
        utm_source: utmParams?.utm_source || config.source,
        utm_medium: utmParams?.utm_medium || "community",
        utm_campaign: utmParams?.utm_campaign || null,
        utm_content: utmParams?.utm_content || null,
      });

      if (error && error.code !== "23505") throw error;

      // Log conversion
      // Log conversion (non-critical)
      supabase.from("campaign_conversions").insert({
        conversion_type: "digger_signup",
        email: email.toLowerCase().trim(),
        utm_source: config.source,
        utm_medium: "community",
        utm_campaign: utmParams?.utm_campaign || null,
        utm_content: utmParams?.utm_content || null,
        landing_page: config.canonicalPath,
        referrer: campaignData.referrer,
        device_type: campaignData.device_type,
        browser: campaignData.browser,
      }).then(() => {});

      trackEvent("Lead", { content_name: "digger_signup", content_category: config.source });
      trackRedditEvent("Lead", { conversionType: "digger_signup" });
      trackConversion(0, "USD");

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
    sessionStorage.setItem("digger_prefill", JSON.stringify({ fullName, email, phone }));
    navigate("/pro-digger-signup");
  };

  if (showThankYou) {
    return (
      <>
        <SEOHead title="You're In! | Digs & Gigs" description="Welcome aboard." canonical={config.canonicalPath} noindex />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">You're In!</CardTitle>
              <CardDescription className="text-base">
                You'll receive emails when clients post tech projects that match your skills.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold">What's next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Leads emailed instantly when clients post</li>
                  <li>✓ Unlock leads for $20–$69 or get awarded (8% fee)</li>
                  <li>✓ No subscriptions required</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/")} variant="outline" className="w-full">Go to Homepage</Button>
                <Button onClick={handleAcceptPro} className="w-full">
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Pro ($29/mo)
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
      <SEOHead title={config.seoTitle} description={config.seoDescription} canonical={config.canonicalPath} noindex />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-full px-4 py-1.5 mb-4">
              {config.accentIcon}
              <span>{config.socialProofLine}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{config.heroTitle}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{config.heroSubtitle}</p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {config.benefits.map((b, i) => (
              <div key={i} className="bg-card border rounded-lg p-4 text-center">
                <div className="mx-auto w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  {b.icon}
                </div>
                <h3 className="font-semibold text-sm">{b.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <Card className="max-w-md mx-auto shadow-lg border-primary/20">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                {config.ctaText}
              </CardTitle>
              <CardDescription>Just 3 fields. Takes 30 seconds.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Your Name</Label>
                  <Input id="fullName" type="text" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="(555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" className="h-12 text-base" />
                </div>
                <Button type="submit" className="w-full h-12 text-base bg-gradient-primary hover:opacity-90" disabled={isSubmitting}>
                  {isSubmitting ? "Joining..." : "Join Free & Get Leads"}
                  {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Free to join. By signing up you agree to our{" "}
                  <Link to="/terms" className="underline">Terms</Link> &{" "}
                  <Link to="/privacy" className="underline">Privacy Policy</Link>.
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Gigs CTA */}
          {config.showGigsCTA && (
            <div className="mt-8 text-center">
              <div className="bg-card border rounded-lg p-6 max-w-md mx-auto">
                <h3 className="font-semibold mb-2">Need to hire a developer?</h3>
                <p className="text-sm text-muted-foreground mb-4">Post your project free and get proposals from vetted freelancers in hours.</p>
                <Button onClick={() => navigate("/post-gig?utm_source=" + config.source)} variant="outline">
                  Post a Project Free <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Trust */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Trusted by freelancers in</p>
            <div className="flex flex-wrap justify-center gap-3 text-xs font-medium text-muted-foreground">
              {["Web Dev", "Mobile", "AI/ML", "DevOps", "UI/UX", "Blockchain"].map(s => (
                <span key={s} className="bg-muted px-3 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pro Modal */}
      <Dialog open={showProModal} onOpenChange={setShowProModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-center text-xl">Want Clients to Find You?</DialogTitle>
            <DialogDescription className="text-center text-base">
              Upgrade to <span className="font-semibold text-primary">Pro Digger</span> for $29/month.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Appear in our searchable directory</span></li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Showcase your portfolio & ratings</span></li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Clients can contact you directly</span></li>
                <li className="flex items-start gap-2"><Star className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" /><span>Priority lead matching</span></li>
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleAcceptPro} className="w-full bg-gradient-primary hover:opacity-90">Upgrade to Pro — $29/mo</Button>
              <Button onClick={handleDeclinePro} variant="ghost" className="w-full text-muted-foreground">No thanks, just emails</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
