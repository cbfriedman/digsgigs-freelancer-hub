import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/components/StructuredData";
import logo from "@/assets/digsandgigs-logo.svg";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Zap,
  DollarSign,
  Users,
  Shield,
  Menu,
  User,
  LogOut,
  ChevronDown,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import AIChatbot from "@/components/AIChatbot";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { trackButtonClick } = useGA4Tracking();
  const [userName, setUserName] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserName(user.id);
    }
  }, [user]);

  const fetchUserName = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single();
    setUserName(data?.full_name || data?.email || "User");
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  // Pricing examples for the homepage
  const pricingExamples = [
    { budget: "$500 project", price: "$15" },
    { budget: "$1,500 project", price: "$45" },
    { budget: "$2,000+ project", price: "$49 (cap)" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Freelance Leads, Delivered Instantly | Digs & Gigs"
        description="Get freelance leads emailed directly to you. Pay only for leads you want. No subscriptions. Dynamic pricing based on project size."
        keywords="freelance leads, pay per lead, freelancer marketplace"
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
            <img 
              src={logo} 
              alt="Digs & Gigs" 
              className="w-[280px] h-[100px] object-contain"
            />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>
              Pricing
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/how-it-works")}>
              <HelpCircle className="mr-2 h-4 w-4" />
              How It Works
            </Button>
            <Button variant="default" onClick={() => setChatOpen(true)} className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat with us
            </Button>
            {user ? (
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
            ) : (
              <>
                <Button variant="ghost" onClick={() => {
                  trackButtonClick('Sign In', 'header');
                  navigate("/register?mode=signin");
                }}>Sign In</Button>
                <Button variant="hero" onClick={() => {
                  trackButtonClick('Get Started', 'header');
                  navigate("/post-gig");
                }}>Get Started</Button>
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
                  variant="default" 
                  className="justify-start" 
                  onClick={() => {
                    setChatOpen(true);
                    setMobileMenuOpen(false);
                  }}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Chat with us
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
                      Dashboard
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
                        navigate("/post-gig");
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

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1">
              <Mail className="h-3 w-3 mr-1" />
              Email-First Lead Marketplace
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Freelance leads,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                delivered instantly.
              </span>
              <br />
              Pay only if you want them.
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              No subscriptions. Every new project is emailed directly to you.
            </p>

            {/* Value Props */}
            <div className="flex flex-wrap justify-center gap-4 mb-10">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Leads sent instantly</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Unlock only what you want</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Price scales with project</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Same opportunity, fair access</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                variant="hero" 
                size="lg" 
                className="text-lg px-8"
                onClick={() => {
                  trackButtonClick('Post a Project', 'hero');
                  navigate("/post-gig");
                }}
              >
                Post a Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                className="text-lg px-8 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  trackButtonClick('Become a Digger', 'hero');
                  navigate("/register?mode=signup&type=digger");
                }}
              >
                Become a Digger
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              Free to join. Pay only to unlock leads.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple, fair, and instant lead delivery
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Client Submits Project</h3>
              <p className="text-muted-foreground">
                Clients describe their project, budget, and timeline. No approval gate.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. You Get an Email</h3>
              <p className="text-muted-foreground">
                Every Digger receives the lead instantly via email with project details and pricing.
              </p>
            </Card>

            <Card className="text-center p-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Unlock & Connect</h3>
              <p className="text-muted-foreground">
                Pay the lead price to unlock client contact info. Reach out directly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Two Ways to Engage
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Choose the pricing model that fits your workflow
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Non-Exclusive */}
              <Card className="p-6 border-primary/30 text-left">
                <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">Pay Per Lead</Badge>
                <h3 className="text-xl font-semibold mb-2">Non-Exclusive Access</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pay once to unlock client contact details. Other pros may also engage.
                </p>
                <div className="text-2xl font-bold text-primary mb-2">2% of budget</div>
                <div className="text-sm text-muted-foreground">$3 min – $49 max</div>
              </Card>

              {/* Exclusive */}
              <Card className="p-6 border-accent/30 text-left">
                <Badge className="mb-3 bg-accent/10 text-accent border-accent/20">Pay on Award</Badge>
                <h3 className="text-xl font-semibold mb-2">Exclusive Job Award</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Submit a bid and pay 3% referral fee when awarded. Gigger pays deposit when you accept.
                </p>
                <div className="text-2xl font-bold text-accent mb-2">3% referral fee</div>
                <div className="text-sm text-muted-foreground">$10 min – $249 max</div>
              </Card>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No subscriptions</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Bogus leads refunded</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Transparent pricing</span>
              </div>
            </div>

            <Button size="lg" onClick={() => navigate("/pricing")}>
              View Full Pricing Details
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* TRUST SECTION */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Why Diggers Love Us
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Transparent Pricing</h3>
                    <p className="text-sm text-muted-foreground">
                      Know exactly what you'll pay before you commit. No hidden fees.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Instant Email Delivery</h3>
                    <p className="text-sm text-muted-foreground">
                      Leads hit your inbox the moment they're submitted. No delays.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Choose Your Leads</h3>
                    <p className="text-sm text-muted-foreground">
                      Only pay for leads you actually want. No forced packages or subscriptions.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Lead Protection</h3>
                    <p className="text-sm text-muted-foreground">
                      Bogus leads are fully refundable. We've got your back.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join Digs & Gigs and start receiving leads today. Free to join.
            </p>
            <Button 
              variant="hero" 
              size="lg" 
              className="text-lg px-8"
              onClick={() => {
                trackButtonClick('Become a Digger', 'final-cta');
                navigate("/register?mode=signup&type=digger");
              }}
            >
              Become a Digger — It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Index;
