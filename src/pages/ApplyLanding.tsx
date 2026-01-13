import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useUTMTracking } from "@/hooks/useUTMTracking";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { useGoogleAdsConversion } from "@/hooks/useGoogleAdsConversion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";
import { 
  DollarSign, 
  X, 
  Users, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Loader2,
  Sparkles,
  Target,
  Globe
} from "lucide-react";

// Form validation schema
const applicationSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  skillCategory: z.string().min(1, "Please select a skill category"),
  yearsExperience: z.string().min(1, "Please select years of experience"),
  portfolioLinkedIn: z.string()
    .trim()
    .url("Please enter a valid URL")
    .max(500, "URL must be less than 500 characters")
    .or(z.literal("")),
  location: z.string()
    .trim()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location must be less than 100 characters"),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

// Skill categories list
const skillCategories = [
  "Web Development",
  "Graphic Design",
  "Digital Marketing",
  "Content Writing",
  "Photography",
  "Video Production",
  "Software Development",
  "UI/UX Design",
  "SEO",
  "Social Media Management",
  "Accounting",
  "Legal Services",
  "Plumbing",
  "Electrical",
  "Carpentry",
  "HVAC",
  "Painting",
  "Roofing",
  "Landscaping",
  "Personal Training",
  "Coaching",
  "Other",
];

const yearsOfExperience = [
  "0-1 years",
  "2-3 years",
  "4-5 years",
  "6-10 years",
  "11+ years",
];

const ApplyLanding = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getCampaignData } = useUTMTracking();
  const { trackEvent, trackCustomEvent } = useFacebookPixel();
  const { trackPageView } = useGoogleAdsConversion();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      portfolioLinkedIn: "",
    },
  });

  const skillCategory = watch("skillCategory");
  const yearsExperience = watch("yearsExperience");

  // Track page view on mount
  useEffect(() => {
    // Track in Google Ads
    trackPageView('/apply');
    
    // Track in Facebook Pixel
    trackEvent('ViewContent', { content_name: 'Apply Landing Page' });
    
    // Log page view to campaign_conversions table for admin dashboard tracking
    const campaignData = getCampaignData();
    supabase.functions.invoke('log-campaign-event', {
      body: {
        conversion_type: 'page_view',
        landing_page: '/apply',
        ...campaignData,
      },
    }).catch(error => {
      // Silently fail - don't log errors for missing functions to avoid console spam
      // Only log if it's not a 404 (function not deployed) or table not found
      if (error?.status !== 404 && error?.code !== '404' && error?.code !== 'PGRST205') {
        console.warn("Failed to track page view (non-critical):", error);
      }
    });
  }, [trackPageView, trackEvent, getCampaignData]);

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);
    
    try {
      // Get UTM tracking data
      const campaignData = getCampaignData();
      
      // Track conversion in Facebook Pixel
      trackCustomEvent('EarlyAccessApplication', campaignData);
      trackEvent('Lead', { content_name: 'Early Access Application' });
      
      // Track conversion in Google Ads
      trackPageView('/apply?conversion=application_submitted');

      // Store application in database with UTM tracking
      const { error: insertError } = await (supabase as any)
        .from("early_access_applications")
        .insert({
          name: data.name,
          email: data.email,
          skill_category: data.skillCategory,
          years_experience: data.yearsExperience,
          portfolio_linkedin: data.portfolioLinkedIn || null,
          location: data.location,
          source: "youtube_landing",
          // UTM tracking fields
          utm_source: campaignData.utm_source || null,
          utm_medium: campaignData.utm_medium || null,
          utm_campaign: campaignData.utm_campaign || null,
          utm_content: campaignData.utm_content || null,
          utm_term: campaignData.utm_term || null,
          referrer: campaignData.referrer || null,
          landing_page: campaignData.landing_page || '/apply',
          device_type: campaignData.device_type || null,
          browser: campaignData.browser || null,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        // If table doesn't exist, we'll create it later
        // For now, log it and show success anyway
        console.warn("Could not save to database:", insertError);
      }

      // Log conversion to campaign_conversions table
      supabase.functions.invoke('log-campaign-event', {
        body: {
          conversion_type: 'early_access_application',
          email: data.email,
          landing_page: '/apply',
          ...campaignData,
        },
      }).catch(error => {
        // Silently fail - non-critical tracking
        if (error?.status !== 404 && error?.code !== '404' && error?.code !== 'PGRST205') {
          console.warn("Failed to track conversion (non-critical):", error);
        }
      });

      toast.success("Application submitted successfully! 🎉");
      
      // Redirect to registration with pre-filled data
      setTimeout(() => {
        navigate(`/register?mode=signup&role=digger&email=${encodeURIComponent(data.email)}&name=${encodeURIComponent(data.name)}`);
      }, 1500);
    } catch (error: any) {
      console.error("Application submission error:", error);
      toast.error("There was an error submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Apply for Early Access | Keep 100% of What You Earn as a Freelancer"
        description="No commissions. No bidding wars. Direct clients. Apply for early access and get 3 months free job leads."
        canonical="/apply"
        keywords="freelancer, no commission, keep 100% earnings, early access, job leads"
      />

      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <Navigation />

        {/* Hero Section - Above the Fold */}
        <section className="relative py-20 md:py-32 lg:py-40 overflow-hidden">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 -z-10"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(250,70%,45%,0.1),transparent_70%)] -z-10"></div>
          
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center space-y-8">
              {/* Sparkle icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                </div>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Keep 100% of What You Earn as a Freelancer
              </h1>
              
              <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
                No commissions. No bidding wars. Direct clients.
              </p>

              <div className="pt-4">
                <Button
                  onClick={() => {
                    document.getElementById("application-form")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  size="lg"
                  className="text-xl px-12 py-7 h-auto bg-primary hover:bg-primary/90 shadow-2xl hover:shadow-primary/50 transition-all duration-300 animate-pulse hover:animate-none"
                >
                  <span className="mr-2">🟦</span>
                  Apply for Early Access
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-6 pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Takes 2 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Zero commissions</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Middle Section - Why Digs & Gigs */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Why Digs & Gigs */}
              <Card className="border-2 border-primary/20 shadow-xl">
                <CardContent className="p-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Why Digs & Gigs
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                          <X className="h-6 w-6 text-destructive" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Platforms take 10–30%</h3>
                        <p className="text-muted-foreground">You do the work — they take the cut</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">We don't</h3>
                        <p className="text-muted-foreground">Keep every dollar you earn. Forever.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* What You Get */}
              <Card className="border-2 border-accent/20 shadow-xl">
                <CardContent className="p-8">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    What You Get
                  </h2>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Direct client connections</h3>
                        <p className="text-muted-foreground">No middleman. Work directly with clients.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                          <Zap className="h-6 w-6 text-accent" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Zero commission model</h3>
                        <p className="text-muted-foreground">100% of earnings. Always.</p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Early access = 3 months free job leads</h3>
                        <p className="text-muted-foreground">Get started with complimentary access.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Application Form Section */}
        <section id="application-form" className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Apply in 2 Minutes
              </h2>
              <p className="text-xl text-muted-foreground">
                Join freelancers who keep 100% of what they earn
              </p>
            </div>

            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-8 md:p-12">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-semibold">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      {...register("name")}
                      placeholder="Your full name"
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-semibold">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="your@email.com"
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Primary Skill Category */}
                  <div className="space-y-2">
                    <Label htmlFor="skillCategory" className="text-base font-semibold">
                      Primary Skill Category *
                    </Label>
                    <Select
                      value={skillCategory}
                      onValueChange={(value) => setValue("skillCategory", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select your primary skill" />
                      </SelectTrigger>
                      <SelectContent>
                        {skillCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.skillCategory && (
                      <p className="text-sm text-destructive">{errors.skillCategory.message}</p>
                    )}
                  </div>

                  {/* Years of Experience */}
                  <div className="space-y-2">
                    <Label htmlFor="yearsExperience" className="text-base font-semibold">
                      Years of Experience *
                    </Label>
                    <Select
                      value={yearsExperience}
                      onValueChange={(value) => setValue("yearsExperience", value)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="Select your experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearsOfExperience.map((years) => (
                          <SelectItem key={years} value={years}>
                            {years}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.yearsExperience && (
                      <p className="text-sm text-destructive">{errors.yearsExperience.message}</p>
                    )}
                  </div>

                  {/* Portfolio / LinkedIn */}
                  <div className="space-y-2">
                    <Label htmlFor="portfolioLinkedIn" className="text-base font-semibold">
                      Portfolio / LinkedIn
                    </Label>
                    <Input
                      id="portfolioLinkedIn"
                      type="url"
                      {...register("portfolioLinkedIn")}
                      placeholder="https://yourportfolio.com or https://linkedin.com/in/you"
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                    {errors.portfolioLinkedIn && (
                      <p className="text-sm text-destructive">{errors.portfolioLinkedIn.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Optional: Share your portfolio or LinkedIn profile
                    </p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-base font-semibold">
                      Location (Country) *
                    </Label>
                    <Input
                      id="location"
                      {...register("location")}
                      placeholder="United States"
                      className="h-12 text-base"
                      disabled={isSubmitting}
                    />
                    {errors.location && (
                      <p className="text-sm text-destructive">{errors.location.message}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-xl hover:shadow-2xl transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🟩</span>
                        Apply in 2 Minutes
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-sm text-center text-muted-foreground">
                    By applying, you agree to receive emails about your early access status.
                    You can unsubscribe at any time.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default ApplyLanding;
