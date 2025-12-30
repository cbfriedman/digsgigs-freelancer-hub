import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/components/StructuredData";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  Search, 
  Users, 
  Briefcase, 
  Star, 
  TrendingUp, 
  Shield,
  ArrowRight,
  CheckCircle2,
  LogOut,
  Mail,
  HelpCircle,
  User,
  ChevronDown,
  DollarSign,
  Menu,
  Clock,
  Zap,
  Award,
  Crown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import heroImage from "@/assets/hero-image.jpg";
import logoFull from "@/assets/logo-full.png";
import logoWordmark from "@/assets/logo-wordmark.png";
import { DiggerOnboardingChecklist } from "@/components/DiggerOnboardingChecklist";
import { DiggerOnboardingChoice } from "@/components/DiggerOnboardingChoice";

import AIChatbot from "@/components/AIChatbot";
import { usePlatformCounts } from "@/hooks/usePlatformCounts";

const Index = () => {
  const navigate = useNavigate();
  const { user, isDigger, signOut } = useAuth();
  const { showBrowseButtons } = usePlatformCounts();
  const [showOnboardingChoice, setShowOnboardingChoice] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [profileCompletion, setProfileCompletion] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserProfile(user.id);
    }
  }, [user]);

  interface DiggerProfileFields {
    business_name?: string | null;
    phone?: string | null;
    location?: string | null;
    profession?: string | null;
    bio?: string | null;
    hourly_rate_min?: number | null;
    hourly_rate_max?: number | null;
    years_experience?: number | null;
    availability?: string | null;
    portfolio_urls?: string[] | null;
    skills?: string[] | null;
    certifications?: string[] | null;
    is_insured?: boolean | null;
    is_bonded?: boolean | null;
    sic_code?: string[] | null;
    naics_code?: string[] | null;
  }

  const calculateProfileCompletion = (profile: DiggerProfileFields | null | undefined) => {
    if (!profile) return 0;
    
    const fields = [
      profile.business_name,
      profile.phone,
      profile.location,
      profile.profession,
      profile.bio,
      profile.hourly_rate_min,
      profile.hourly_rate_max,
      profile.years_experience,
      profile.availability,
      profile.portfolio_urls && profile.portfolio_urls.length > 0,
      profile.skills && profile.skills.length > 0,
      profile.certifications && profile.certifications.length > 0,
      profile.is_insured !== null,
      profile.is_bonded !== null,
      profile.sic_code || profile.naics_code,
    ];
    
    const completedFields = fields.filter(field => {
      if (typeof field === 'boolean') return field;
      return field !== null && field !== undefined && field !== '';
    }).length;
    
    return Math.round((completedFields / fields.length) * 100);
  };

  const checkUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type, full_name, email")
      .eq("id", userId)
      .single();
    
    setUserName(data?.full_name || data?.email || "User");
    
    // Check if user is admin (using user_app_roles table - new system)
    const { data: roles } = await supabase
      .from("user_app_roles")
      .select("app_role")
      .eq("user_id", userId)
      .eq("app_role", "admin")
      .eq("is_active", true)
      .maybeSingle();
    
    setIsAdmin(!!roles);
    
    // Fetch digger profile for completion calculation
    if (isDigger) {
      const { data: diggerProfile } = await supabase
        .from("digger_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (diggerProfile) {
        setProfileCompletion(calculateProfileCompletion(diggerProfile));
      }
      
      const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${userId}`);
      if (!hasSeenOnboarding) {
        setShowOnboardingChoice(true);
      } else {
        setShowChecklist(true);
      }
    }
  };

  const handleOnboardingDismiss = () => {
    setShowOnboardingChoice(false);
    setShowChecklist(true);
    if (user?.id) {
      localStorage.setItem(`onboarding_seen_${user.id}`, 'true');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  // Recent freelance projects (marketplace examples)
  const recentProjects = [
    {
      title: "UI/UX Redesign for SaaS App",
      budget: "$3,000–$6,000",
      timeline: "4–6 weeks",
      requestCount: 8
    },
    {
      title: "Custom WordPress Site",
      budget: "$2,500–$4,500",
      timeline: "3–5 weeks",
      requestCount: 12
    },
    {
      title: "Brand Identity + Logo Development",
      budget: "$800–$1,400",
      timeline: "2 weeks",
      requestCount: 14
    },
    {
      title: "SEO Content Strategy for E-commerce Brand",
      budget: "$1,500–$3,000",
      timeline: "1–3 months",
      requestCount: 9
    }
  ];

  // Budget-based lead pricing
  const leadPricingTiers = [
    { budget: "Under $1,000", price: "$25" },
    { budget: "$1,000–$3,000", price: "$35" },
    { budget: "$3,000–$7,500", price: "$65" },
    { budget: "$7,500–$20,000", price: "$95" },
    { budget: "$20,000+", price: "$140" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Hire Skilled Freelancers — No Commissions | Digs & Gigs"
        description="Digs & Gigs connects clients with experienced freelancers across design, development, writing, marketing, and more — without platform commissions. Freelancers keep 100% of what they earn."
        keywords="hire freelancers, no commissions, freelance marketplace, design freelancers, development freelancers, marketing freelancers, business services, writing freelancers"
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            generateOrganizationSchema(),
            generateWebsiteSchema()
          ]
        }}
      />
      
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div 
            className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            {/* Desktop: Full logo with tagline */}
            <img
              src={logoFull}
              alt="Digs & Gigs — Where Opportunity Meets Talent"
              className="hidden md:block h-16 w-auto"
            />
            {/* Mobile: Wordmark without tagline */}
            <img
              src={logoWordmark}
              alt="Digs & Gigs"
              className="block md:hidden h-12 w-auto"
            />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {showBrowseButtons && (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/browse-diggers")}>
                  Browse Freelancers
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/browse-gigs")}>
                  Browse Projects
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/how-it-works")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              How It Works
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/contact")}>
              <Mail className="mr-2 h-4 w-4" />
              Contact
            </Button>
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 font-semibold">
                      <User className="h-4 w-4" />
                      <span>{userName}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48 bg-background z-50" align="end">
                    <DropdownMenuItem onClick={() => navigate("/role-dashboard")}>
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/register?mode=signin")}>Sign In</Button>
                <Button variant="hero" onClick={() => navigate("/register")}>Get Started</Button>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                {showBrowseButtons && (
                  <>
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => {
                        navigate("/browse-diggers");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Browse Freelancers
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => {
                        navigate("/browse-gigs");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Briefcase className="mr-2 h-4 w-4" />
                      Browse Projects
                    </Button>
                  </>
                )}
                <Button 
                  variant="ghost" 
                  className="justify-start" 
                  onClick={() => {
                    navigate("/pricing");
                    setMobileMenuOpen(false);
                  }}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pricing
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start" 
                  onClick={() => {
                    navigate("/how-it-works");
                    setMobileMenuOpen(false);
                  }}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  How It Works
                </Button>
                <Button 
                  variant="ghost" 
                  className="justify-start" 
                  onClick={() => {
                    navigate("/contact");
                    setMobileMenuOpen(false);
                  }}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Contact
                </Button>
                <div className="border-t border-border my-4" />
                {user ? (
                  <>
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => {
                        navigate("/role-dashboard");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Dashboard ({userName})
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start text-destructive" 
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="ghost" 
                      className="justify-start" 
                      onClick={() => {
                        navigate("/register?mode=signin");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Sign In
                    </Button>
                    <Button 
                      variant="hero" 
                      onClick={() => {
                        navigate("/register");
                        setMobileMenuOpen(false);
                      }}
                    >
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* SECTION 1 — HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                For Freelancers & Clients
              </Badge>
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                Hire Skilled Freelancers —
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Without Commissions or Bidding Wars</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Digs & Gigs connects clients with experienced independent professionals across design, development, writing, marketing, admin, and more — without platform commissions or race-to-the-bottom pricing. Freelancers keep 100% of what they earn.
              </p>
              
              <div className="space-y-4">
                {user ? (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="text-base w-full sm:w-auto"
                      onClick={() => navigate("/role-dashboard")}
                    >
                      Go to My Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="text-base w-full sm:w-auto"
                      onClick={() => navigate("/post-gig")}
                    >
                      Post a Project
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="text-base w-full sm:w-auto"
                      onClick={() => navigate("/post-gig")}
                    >
                      Post a Project <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="text-base w-full sm:w-auto"
                      onClick={() => navigate("/register?type=digger")}
                    >
                      Apply as a Freelancer
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">No credit card required. Cancel anytime.</p>
              </div>
              
              {/* Trust Indicators */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">No commissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">No bidding wars</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Only pay to unlock the leads you want</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">Keep 100% of what you earn</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
              <OptimizedImage
                src={heroImage} 
                alt="Freelancers and clients connecting" 
                width={1200}
                height={800}
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Founder Early-Access Program */}
      <section className="py-16 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border-y border-amber-500/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Zap className="h-3 w-3 mr-1" />
              Limited to First 500 Freelancers
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Founder Early-Access Program
            </h3>
            <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join as a Founding Digger and lock in Founder pricing for 12 months — plus priority access to verified client projects. No commissions. No bidding wars. Cancel anytime.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-8 mb-8 max-w-2xl mx-auto text-left">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">30-Day Free Trial</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">$49/month after trial</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Founder pricing locked for 12 months</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">Keep 100% of what you earn</span>
              </div>
            </div>
            
            <Button 
              variant="hero" 
              size="lg" 
              className="text-base"
              onClick={() => navigate("/register?type=digger")}
            >
              Apply as a Digger <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Digger Onboarding - Show choice dialog or checklist */}
      {isDigger && showOnboardingChoice && (
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <DiggerOnboardingChoice onDismiss={handleOnboardingDismiss} />
          </div>
        </section>
      )}

      {isDigger && !showOnboardingChoice && showChecklist && (
        <section className="py-8 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <DiggerOnboardingChecklist />
          </div>
        </section>
      )}

      {/* SECTION 3 — How It Works (Split) */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">How Digs & Gigs Works</Badge>
            <h3 className="text-4xl font-bold mb-4">Simple. Transparent. Built for Results.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* For Clients */}
            <div 
              className="space-y-8 p-8 rounded-2xl border border-border/50 bg-card cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
              onClick={() => navigate("/post-gig")}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-accent-foreground" />
                </div>
                <h4 className="text-2xl font-bold mb-2">For Clients</h4>
                <p className="text-muted-foreground">Find the right freelancer for your project</p>
              </div>
              <div className="space-y-4">
                {[
                  "Describe your project",
                  "Get matched with qualified freelancers",
                  "Review profiles & proposals",
                  "Work together directly",
                  "No platform commission"
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" onClick={(e) => { e.stopPropagation(); navigate("/post-gig"); }}>
                Post a Project <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* For Freelancers */}
            <div 
              className="space-y-8 p-8 rounded-2xl border border-border/50 bg-card cursor-pointer transition-all hover:shadow-lg hover:border-accent/50 hover:-translate-y-1"
              onClick={() => navigate("/register?type=digger")}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-2xl font-bold mb-2">For Freelancers</h4>
                <p className="text-muted-foreground">Grow your business with real leads</p>
              </div>
              <div className="space-y-4">
                {[
                  "Create your profile",
                  "Select your skills & services",
                  "Receive matched leads",
                  "Only pay for verified leads you unlock",
                  "Keep 100% of your earnings"
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" variant="default" onClick={(e) => { e.stopPropagation(); navigate("/register?type=digger"); }}>
                Apply as a Digger <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Transparent Lead Pricing Teaser */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <DollarSign className="h-3 w-3 mr-1" />
              Budget-Based Pricing
            </Badge>
            <h3 className="text-3xl font-bold mb-2">Transparent Lead Pricing</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Lead pricing is based on the LOW end of the client's budget range — so you never overpay for opportunities.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
              {leadPricingTiers.map((tier, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 bg-card text-center hover:shadow-lg transition-all">
                  <div className="text-sm text-muted-foreground mb-2">{tier.budget}</div>
                  <div className="text-2xl font-bold text-primary">{tier.price}</div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Button 
                variant="default" 
                size="lg"
                onClick={() => navigate("/pricing")}
              >
                See Pricing <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Founding Digger Plan */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold mb-2">Everything You Need To Grow Your Freelance Business</h3>
            <p className="text-lg text-muted-foreground">Free for 30 days — then $49/month (Founder pricing locked for 12 months)</p>
          </div>
          
          <div className="max-w-xl mx-auto">
            <div className="p-8 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 text-center relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                <Award className="w-3 h-3 mr-1" />
                Founding Digger Plan
              </Badge>
              
              <div className="my-6">
                <div className="text-sm text-muted-foreground">Free for 30 days, then</div>
                <div className="text-5xl font-bold text-primary">$49<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <div className="text-sm text-muted-foreground mt-1">(Founder pricing locked for 12 months)</div>
              </div>
              
              <div className="space-y-3 text-left mb-8">
                {[
                  "Create your professional profile",
                  "Get matched leads",
                  "Apply to projects",
                  "Keep 100% of your earnings",
                  "Founding Digger badge",
                  "Priority ranking",
                  "Cancel anytime"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full text-base"
                onClick={() => navigate("/register?type=digger")}
              >
                Apply as a Digger <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Founder Pricing Guarantee Banner */}
          <div className="max-w-2xl mx-auto mt-10 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold">Founder Pricing Guarantee</h4>
            </div>
            <p className="text-muted-foreground">
              Your $49/month subscription is locked for 12 months <br className="hidden sm:inline" />
              <span className="text-sm">(Exclusive to the first 500 Founding Diggers)</span>
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 6 — Recently Posted Projects */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Active Projects</Badge>
            <h3 className="text-4xl font-bold mb-4">Recently Posted Projects</h3>
            <p className="text-xl text-muted-foreground">
              Real project requests from clients looking for freelancers like you
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {recentProjects.map((project, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 bg-card hover:shadow-lg transition-all">
                <h4 className="text-lg font-bold mb-3">{project.title}</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-semibold">{project.budget}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Timeline:</span>
                    <span className="font-semibold">{project.timeline}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {project.requestCount} freelancers matched
                </Badge>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="default" size="lg" onClick={() => navigate("/browse-gigs")}>
              Browse More Projects <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 7 — Why Freelancers Choose Digs & Gigs (Benefits Grid) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Features</Badge>
            <h3 className="text-4xl font-bold mb-4">Why Freelancers Choose Digs & Gigs</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Search,
                title: "Smart Matching",
                description: "Freelancers are matched to projects that fit their expertise."
              },
              {
                icon: DollarSign,
                title: "No Commissions",
                description: "Freelancers keep 100% of what they earn."
              },
              {
                icon: Shield,
                title: "No Bidding Wars",
                description: "Clients choose based on fit — not lowest price."
              },
              {
                icon: TrendingUp,
                title: "Transparent Lead Pricing",
                description: "Pay only to unlock verified client details."
              },
              {
                icon: Star,
                title: "Professional Profiles",
                description: "Showcase work, experience, and reviews."
              },
              {
                icon: Crown,
                title: "Founder Pricing (Early Access)",
                description: "Limited-time pricing for early members."
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 hover:shadow-[var(--shadow-hover)] transition-all duration-300">
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
          
          {/* Lead Protection Banner */}
          <div className="max-w-2xl mx-auto mt-12 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400 font-medium">
              <Shield className="w-5 h-5" />
              <span>Lead Protection Guarantee — invalid or fake leads are refunded.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8 — Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[var(--gradient-hero)]"></div>
            <div className="relative px-8 py-16 text-center">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready To Get More Clients Without Paying Commissions?
              </h3>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Become a Founding Digger today and lock in your $49/month rate for 12 months.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-base"
                  onClick={() => navigate("/register?type=digger")}
                >
                  Apply as a Digger <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="default" 
                  size="lg" 
                  className="text-base"
                  onClick={() => navigate("/post-gig")}
                >
                  Post a Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      
      {/* AI Chatbot */}
      <AIChatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
};

export default Index;
