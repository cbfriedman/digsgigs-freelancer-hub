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
  MessageCircle,
  MessageSquare,
  Clock,
  Zap,
  Award,
  Crown,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import heroImage from "@/assets/hero-image.jpg";
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

  const calculateProfileCompletion = (profile: any) => {
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
    
    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Hire Top Freelancers | No Commissions | Digs & Gigs"
        description="Hire freelancers without commissions or bidding wars. Freelancers join for free and get the lowest lead pricing we will ever offer — $10/$25 for the first year."
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
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Digs&Gigs
            </h1>
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
                Hire Top Freelancers.
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> No Commissions. No Bidding Wars. Just Results.</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Digs & Gigs connects clients with skilled freelancers across design, development, marketing, writing, admin, and more — without platform fees or race-to-the-bottom bidding. Freelancers keep 100% of what they earn.
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
                      onClick={() => navigate("/register")}
                    >
                      Start Free for 60 Days <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="lg" 
                      className="text-base w-full sm:w-auto"
                      onClick={() => navigate("/browse-diggers")}
                    >
                      Browse Freelancers
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
                  <span className="text-sm text-foreground">No pay-per-click</span>
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

      {/* SECTION 2 — Limited-Time Founders Program */}
      <section className="py-16 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border-y border-amber-500/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Zap className="h-3 w-3 mr-1" />
              Limited-Time Founders Program — First 500 Freelancers Only
            </Badge>
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Join Today & Lock In Lifetime Pricing
            </h3>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-8 mb-8 max-w-2xl mx-auto text-left">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">$19/month subscription for life</span>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">The lowest lead pricing we will ever offer — $10/$25 for your first year</span>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-4">Pricing may adjust after year one.</p>
            <p className="text-lg font-semibold text-amber-600 mb-6">You will never see this offer again.</p>
            
            <Button 
              variant="hero" 
              size="lg" 
              className="text-base"
              onClick={() => navigate("/founding-digger")}
            >
              Claim Your Founder Spot <ArrowRight className="ml-2 w-5 h-5" />
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
                  "Get matched instantly with qualified freelancers",
                  "Browse profiles and portfolios",
                  "Contact the freelancer you choose",
                  "No commissions. No hidden fees."
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
              onClick={() => navigate("/register")}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-2xl font-bold mb-2">For Freelancers (Diggers)</h4>
                <p className="text-muted-foreground">Grow your business with real leads</p>
              </div>
              <div className="space-y-4">
                {[
                  "Create your profile",
                  "Select your skills & categories",
                  "Receive matched project requests",
                  "Pay only for lead reveals ($10/$25 first year)",
                  "Keep 100% of your earnings",
                  "No bidding wars — you choose the clients you want"
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" size="lg" variant="default" onClick={(e) => { e.stopPropagation(); navigate("/register"); }}>
                Become a Digger <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — Flat-Rate Lead Pricing */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <DollarSign className="h-3 w-3 mr-1" />
              The Lowest Lead Pricing We Will Ever Offer
            </Badge>
            <h3 className="text-3xl font-bold mb-2">Flat-Rate Lead Pricing</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              You only pay to unlock leads you actually want — and you always keep 100% of what you earn.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Standard Leads */}
            <div className="p-8 rounded-xl border border-border/50 bg-card text-center hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">Standard Leads</h4>
              <div className="text-4xl font-bold text-primary mb-4">$10<span className="text-base font-normal text-muted-foreground"> / reveal</span></div>
              <p className="text-sm text-muted-foreground">
                Design · Writing · Admin · Video Editing · Virtual Assistants · Marketing Support · General Freelancing
              </p>
            </div>

            {/* High-Value Leads */}
            <div className="p-8 rounded-xl border-2 border-primary bg-card text-center hover:shadow-lg transition-all relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">High Value</Badge>
              <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Crown className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-2">High-Value Leads</h4>
              <div className="text-4xl font-bold text-primary mb-4">$25<span className="text-base font-normal text-muted-foreground"> / reveal</span></div>
              <p className="text-sm text-muted-foreground">
                Web Development · SEO · Paid Ads · Consulting · Accounting · Legal · Finance
              </p>
            </div>
          </div>

          {/* Guarantees */}
          <div className="flex flex-col sm:flex-row justify-center gap-6 mt-8 mb-8">
            <div className="flex items-center gap-2 text-primary font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>Pricing guaranteed for your first 12 months</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>No commissions. Ever.</span>
            </div>
          </div>

          {/* What You Get */}
          <div className="max-w-3xl mx-auto mt-6 grid md:grid-cols-2 gap-6">
            {/* Before Purchase */}
            <div className="p-6 rounded-xl bg-card border border-border/50">
              <h4 className="text-lg font-bold mb-4 text-center">What You See Before You Buy</h4>
              <div className="space-y-3">
                {["Category", "Short summary", "Budget range", "Location (if provided)"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* After Purchase */}
            <div className="p-6 rounded-xl bg-card border border-primary/50">
              <h4 className="text-lg font-bold mb-4 text-center">What You Unlock After Purchase</h4>
              <div className="space-y-3">
                {["Client name", "Email", "Phone", "Full description", "Attachments (if provided)", "Timeline"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lock Note */}
          <div className="max-w-2xl mx-auto mt-6 p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Lead pricing may adjust after year one. Your subscription pricing remains guaranteed for life as long as your account stays active.</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — Founding Digger Plan */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold mb-2">Everything You Need To Grow Your Freelance Business</h3>
            <p className="text-lg text-muted-foreground">Free for 60 days — then $19/month (lifetime guaranteed)</p>
          </div>
          
          <div className="max-w-xl mx-auto">
            <div className="p-8 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5 text-center relative">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                <Award className="w-3 h-3 mr-1" />
                Founding Digger Plan
              </Badge>
              
              <div className="my-6">
                <div className="text-sm text-muted-foreground">Free for 60 days, then</div>
                <div className="text-5xl font-bold text-primary">$19<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <div className="text-sm text-muted-foreground mt-1">(lifetime guaranteed)</div>
              </div>
              
              <div className="space-y-3 text-left mb-8">
                {[
                  "Unlimited categories",
                  "Unlimited service areas",
                  "Unlimited matches",
                  "Unlimited messages",
                  "Priority ranking",
                  "Founding Digger badge",
                  "Access to $10/$25 leads for your first year",
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
                onClick={() => navigate("/register")}
              >
                Start Free for 60 Days <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Lifetime Pricing Banner */}
          <div className="max-w-2xl mx-auto mt-10 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold">Lifetime Subscription Guarantee</h4>
            </div>
            <p className="text-muted-foreground">
              Your $19/month subscription is permanently locked for life <br className="hidden sm:inline" />
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

      {/* SECTION 7 — Why Freelancers Choose Digs & Gigs */}
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
                description: "Find clients who actually want your skills."
              },
              {
                icon: DollarSign,
                title: "No Commissions",
                description: "You keep everything you earn."
              },
              {
                icon: Shield,
                title: "No Bidding Wars",
                description: "Choose the clients you want — no racing to the bottom."
              },
              {
                icon: TrendingUp,
                title: "Flat-Rate Leads",
                description: "Never pay for clicks or impressions again."
              },
              {
                icon: Star,
                title: "Professional Profiles",
                description: "Showcase your work, experience, and reviews."
              },
              {
                icon: Crown,
                title: "Priority Ranking (Founders Only)",
                description: "Rise above competitors instantly."
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

      {/* SECTION 9 — Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[var(--gradient-hero)]"></div>
            <div className="relative px-8 py-16 text-center">
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready To Get More Clients Without Paying Commissions?
              </h3>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Become a Founding Digger today and lock in lifetime pricing + the lowest lead rates we will ever offer.
              </p>
              <Button 
                variant="hero" 
                size="lg" 
                className="text-base"
                onClick={() => navigate("/register")}
              >
                Start Free for 60 Days <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
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
