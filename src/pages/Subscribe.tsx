import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useRedditPixel } from "@/hooks/useRedditPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { Mail, CheckCircle2, Zap, DollarSign, Users } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const PROFESSION_OPTIONS = [
  "Plumber",
  "Electrician", 
  "HVAC Technician",
  "General Contractor",
  "Handyman",
  "Painter",
  "Landscaper",
  "Roofer",
  "Carpenter",
  "Web Developer",
  "Graphic Designer",
  "Marketing Consultant",
  "Photographer",
  "Videographer",
  "Virtual Assistant",
  "Other"
];

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { trackEvent } = useFacebookPixel();
  const { trackEvent: trackRedditEvent } = useRedditPixel();
  const { trackConversion } = useGoogleAdsConversion();
  const { getUTMParams } = useUTMTracking();

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const utmParams = getUTMParams();
      const source = searchParams.get("source") || utmParams?.utm_source || "organic";

      const { error } = await supabase
        .from("subscribers")
        .insert({
          email: email.toLowerCase().trim(),
          full_name: fullName.trim() || null,
          phone: phone.trim() || null,
          categories: selectedCategories.length > 0 ? selectedCategories : null,
          source,
          utm_source: utmParams?.utm_source || null,
          utm_medium: utmParams?.utm_medium || null,
          utm_campaign: utmParams?.utm_campaign || null,
          utm_content: utmParams?.utm_content || null,
        });

      if (error) {
        if (error.code === "23505") {
          // Duplicate email - still show success
          console.log("Email already subscribed");
        } else {
          throw error;
        }
      }

      // Fire conversion pixels
      trackEvent("Lead", { 
        content_name: "subscriber_signup",
        content_category: source 
      });
      trackRedditEvent("Lead", {
        conversionType: "subscriber_signup"
      });
      trackConversion(0, "USD");

      setIsSuccess(true);
      toast.success("You're subscribed!");

    } catch (error: any) {
      console.error("Subscribe error:", error);
      toast.error(error.message || "Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <SEOHead
          title="You're In! | Digs & Gigs"
          description="Welcome to Digs & Gigs. You'll receive project opportunities in your inbox."
          canonical="/subscribe"
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
                Check your inbox for project opportunities. We'll email you when clients need your services.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold">What happens next?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ You'll receive emails when new projects match your skills</li>
                  <li>✓ Pay only for the leads you want (starting at $9)</li>
                  <li>✓ No subscriptions or commitments required</li>
                </ul>
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Explore the Platform
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Get Project Leads in Your Inbox | Digs & Gigs"
        description="Subscribe to receive project opportunities directly in your inbox. No profile required, pay only for leads you want."
        canonical="/subscribe"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Get Project Leads in Your Inbox
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No profile required. No subscriptions. Just relevant project opportunities sent directly to you.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border rounded-lg p-4 text-center">
              <Zap className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Instant Delivery</h3>
              <p className="text-sm text-muted-foreground">Get leads emailed the moment clients post</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <DollarSign className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Pay Per Lead</h3>
              <p className="text-sm text-muted-foreground">Only pay for leads you want ($9-$49)</p>
            </div>
            <div className="bg-card border rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Keep 100%</h3>
              <p className="text-sm text-muted-foreground">No commissions on work you land</p>
            </div>
          </div>

          {/* Form */}
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Subscribe to Leads
              </CardTitle>
              <CardDescription>
                Enter your email to start receiving project opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Name (optional)</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>What services do you offer? (optional)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {PROFESSION_OPTIONS.map((profession) => (
                      <div key={profession} className="flex items-center space-x-2">
                        <Checkbox
                          id={profession}
                          checked={selectedCategories.includes(profession)}
                          onCheckedChange={() => handleCategoryToggle(profession)}
                        />
                        <label
                          htmlFor={profession}
                          className="text-sm cursor-pointer"
                        >
                          {profession}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Subscribing..." : "Get Project Leads"}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  By subscribing, you agree to receive project opportunity emails. 
                  Unsubscribe anytime.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}