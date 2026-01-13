import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { geocodeAddress } from "@/utils/geocoding";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";

const PostGig = () => {
  const navigate = useNavigate();
  const { trackEvent, isConfigured } = useFacebookPixel();
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const formatCurrency = (value: string): string => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    const number = parseInt(numericValue);
    if (isNaN(number)) return '';
    return number.toLocaleString('en-US');
  };

  const parseCurrency = (value: string): number => {
    return parseInt(value.replace(/[^0-9]/g, '')) || 0;
  };

  const calculateLeadPrice = (): number => {
    const min = parseCurrency(budgetMin);
    const max = parseCurrency(budgetMax);
    if (!min && !max) return 9;
    const avg = (min + max) / 2;
    const price = Math.round(avg * 0.03);
    return Math.max(9, Math.min(49, price));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    if (!description.trim()) {
      toast.error("Please describe your project");
      return;
    }
    if (!budgetMin.trim() || !budgetMax.trim()) {
      toast.error("Please enter your budget range (min and max)");
      return;
    }
    if (!clientName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!clientEmail.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      // Get current user if logged in
      const { data: { session } } = await supabase.auth.getSession();
      const consumerId = session?.user?.id || null;

      // Geocode location if provided
      let locationLat: number | undefined;
      let locationLng: number | undefined;
      if (location) {
        const geocodeResult = await geocodeAddress(location);
        if (geocodeResult) {
          locationLat = geocodeResult.latitude;
          locationLng = geocodeResult.longitude;
        }
      }

      // Insert the gig (lead)
      const { data: gigData, error: gigError } = await supabase
        .from("gigs")
        .insert({
          consumer_id: consumerId,
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim() || null,
          budget_min: parseCurrency(budgetMin),
          budget_max: parseCurrency(budgetMax),
          timeline: timeline.trim() || null,
          location: location.trim() || "Remote",
          location_lat: locationLat,
          location_lng: locationLng,
          client_name: clientName.trim(),
          consumer_email: clientEmail.trim(),
          consumer_phone: clientPhone.trim() || null,
          status: "open",
          confirmation_status: "confirmed",
          is_confirmed_lead: true,
        })
        .select()
        .single();

      if (gigError) throw gigError;

      // Trigger the email blast to all Diggers
      const { error: blastError } = await supabase.functions.invoke("blast-lead-to-diggers", {
        body: { leadId: gigData.id }
      });

      if (blastError) {
        console.error("Error sending lead blast:", blastError);
        // Don't fail the submission, just log the error
      }

      // Track conversion
      if (isConfigured) {
        try {
          trackEvent('Lead', {
            content_name: 'Gig Posted',
            content_type: 'gig_post',
            content_ids: [gigData.id],
            value: parseCurrency(budgetMin),
            currency: 'USD',
          });
        } catch (error) {
          console.warn('Facebook Pixel: Error tracking Lead event', error);
        }
      }

      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'gig_submitted', {
          event_category: 'conversion',
          value: 1,
          gig_id: gigData.id,
        });
      }

      toast.success("Your project has been posted! Freelancers are being notified.");
      navigate(`/gig-confirmed?gigId=${gigData.id}`);
    } catch (error: any) {
      console.error("Error posting gig:", error);
      toast.error("Failed to post project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const leadPrice = calculateLeadPrice();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Post a Project — Get Freelance Quotes | Digs & Gigs"
        description="Post your project and get connected with skilled freelancers. Your project will be emailed to all relevant professionals instantly."
        keywords="post project, hire freelancer, get quotes, find contractor"
      />
      <Navigation showBackButton backLabel="Back" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Post Your Project</CardTitle>
            <CardDescription>
              Your project will be emailed to all Diggers instantly
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Project Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Project Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Website Redesign, Logo Design, App Development"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Project Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you need done..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requirements (Optional)</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Any specific requirements, skills needed, or deliverables..."
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Budget & Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Budget & Timeline</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budgetMin">Min Budget *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMin"
                        placeholder="1,000"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(formatCurrency(e.target.value))}
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMax">Max Budget *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id="budgetMax"
                        placeholder="2,500"
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(formatCurrency(e.target.value))}
                        className="pl-7"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Timeline / Start Date</Label>
                  <Input
                    id="timeline"
                    placeholder="e.g., ASAP, Within 2 weeks, Q1 2025"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="City, State or 'Remote'"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Your Contact Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="clientName">Your Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="John Smith"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email Address *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone Number (Optional)</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Lead Price Preview */}
              {(budgetMin || budgetMax) && (
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground mb-1">
                    Freelancers will pay to unlock this lead:
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${leadPrice}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    3% of average budget (${(parseCurrency(budgetMin) + parseCurrency(budgetMax)) / 2 || 0})
                  </div>
                </div>
              )}

              {/* What happens next */}
              <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                <h4 className="font-medium">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Your project is emailed to all Diggers instantly
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Interested freelancers unlock your contact info
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    They reach out to you directly via email or phone
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    Post Project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By posting, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PostGig;
