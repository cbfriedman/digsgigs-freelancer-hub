import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DiggerCard } from "@/components/DiggerCard";
import { GigCard } from "@/components/GigCard";
import { Footer } from "@/components/Footer";
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
  Receipt
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { DiggerOnboardingChecklist } from "@/components/DiggerOnboardingChecklist";
import { DiggerOnboardingChoice } from "@/components/DiggerOnboardingChoice";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isDigger, setIsDigger] = useState(false);
  const [showOnboardingChoice, setShowOnboardingChoice] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserType(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserType(session.user.id);
      } else {
        setIsDigger(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserType = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userId)
      .single();
    
    const isDiggerUser = data?.user_type === "digger";
    setIsDigger(isDiggerUser);
    
    // Check if this is a new digger who hasn't seen onboarding
    if (isDiggerUser) {
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
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };
  const sampleDiggers = [
    {
      name: "Sarah Chen",
      profession: "UI/UX Designer",
      expertise: ["Figma", "Adobe XD", "Prototyping", "User Research"],
      rating: 4.9,
      reviews: 127,
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop"
    },
    {
      name: "Marcus Johnson",
      profession: "Full Stack Developer",
      expertise: ["React", "Node.js", "Python", "AWS"],
      rating: 5.0,
      reviews: 89,
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"
    },
    {
      name: "Priya Patel",
      profession: "Content Writer",
      expertise: ["SEO", "Copywriting", "Blogging", "Technical Writing"],
      rating: 4.8,
      reviews: 156,
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop"
    }
  ];

  const sampleGigs = [
    {
      title: "E-commerce Website Redesign",
      description: "Looking for an experienced designer to revamp our online store with modern UI/UX principles.",
      budget: "$3,000 - $5,000",
      timeline: "4-6 weeks",
      category: "Design",
      bidsCount: 12
    },
    {
      title: "Mobile App Development",
      description: "Need a React Native developer to build a fitness tracking app with social features.",
      budget: "$8,000 - $12,000",
      timeline: "8-10 weeks",
      category: "Development",
      bidsCount: 8
    },
    {
      title: "SEO Content Strategy",
      description: "Seeking a content strategist to create a 6-month plan and write 20 blog posts.",
      budget: "$2,500 - $4,000",
      timeline: "6 months",
      category: "Writing",
      bidsCount: 15
    }
  ];

  const pricingTiers = [
    { 
      name: "Free", 
      price: "$0",
      leadCost: "$3/lead", 
      commission: "9% + $5 min",
      features: ["Pay per lead", "Commission on work"]
    },
    { 
      name: "Pro", 
      price: "$10",
      leadCost: "$2/lead", 
      commission: "4% + $5 min",
      popular: true,
      features: ["Lower lead cost", "Lower commission"]
    },
    { 
      name: "Premium", 
      price: "$150",
      leadCost: "FREE", 
      commission: "0%",
      features: ["Free leads", "No commission"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <div className="flex items-center gap-4">
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
                <Button variant="ghost" size="sm" onClick={() => navigate("/transactions")}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Transactions
                </Button>
                {isDigger && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/lead-limits")}>
                      Lead Limits
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/digger-guide")}>
                      Digger Guide
                    </Button>
                  </>
                )}
                {isDigger ? (
                  <Button variant="outline" onClick={() => navigate("/digger-registration")}>
                    Complete Profile
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/post-gig")}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    Post a Gig
                  </Button>
                )}
                <Button variant="ghost" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
                <Button variant="hero" onClick={() => navigate("/auth?redirect=/post-gig")}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-primary/10 text-primary border-primary/20">
                The Future of Freelancing
              </Badge>
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                Where Talent Meets
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Opportunity</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Connect skilled freelancers (diggers) with clients seeking expertise. 
                A two-sided marketplace built for the modern gig economy.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-base"
                  onClick={() => user ? navigate("/browse-diggers") : navigate("/auth?redirect=/browse-diggers")}
                >
                  Find Talent <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base"
                  onClick={() => user ? navigate("/digger-registration") : navigate("/auth?type=digger&redirect=/digger-registration")}
                >
                  Build My Digs
                </Button>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-foreground">10K+</div>
                  <div className="text-sm text-muted-foreground">Active Diggers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">5K+</div>
                  <div className="text-sm text-muted-foreground">Projects Posted</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfaction Rate</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
              <img 
                src={heroImage} 
                alt="Freelancers collaborating" 
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
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

      {/* How It Works */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">How It Works</Badge>
            <h3 className="text-4xl font-bold mb-4">Simple. Efficient. Effective.</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you're a digger or posting a gig, our platform makes connections seamless.
            </p>
          </div>

          <Carousel className="max-w-4xl mx-auto">
            <CarouselContent>
              {/* Step 1: For Diggers - Create Profile */}
              <CarouselItem>
                <Card className="border-2 border-primary/20">
                  <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                      <Users className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <Badge className="mb-4 bg-primary/10 text-primary">Step 1 - Diggers</Badge>
                    <h4 className="text-2xl font-bold mb-4 text-center">Create Your Profile</h4>
                    <p className="text-muted-foreground text-center max-w-md">
                      Showcase your skills, upload your portfolio, and let clients discover your expertise. Build a professional presence that attracts quality opportunities.
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Step 2: For Diggers - Browse & Purchase */}
              <CarouselItem>
                <Card className="border-2 border-primary/20">
                  <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                      <Search className="w-10 h-10 text-primary-foreground" />
                    </div>
                    <Badge className="mb-4 bg-primary/10 text-primary">Step 2 - Diggers</Badge>
                    <h4 className="text-2xl font-bold mb-4 text-center">Browse & Purchase Leads</h4>
                    <p className="text-muted-foreground text-center max-w-md">
                      Explore available gigs, purchase leads that match your expertise, and connect directly with potential clients. You only pay when you find opportunities worth pursuing.
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Step 3: For Clients - Post Gig */}
              <CarouselItem>
                <Card className="border-2 border-accent/20">
                  <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                      <Briefcase className="w-10 h-10 text-accent-foreground" />
                    </div>
                    <Badge className="mb-4 bg-accent/10 text-accent">Step 1 - Clients</Badge>
                    <h4 className="text-2xl font-bold mb-4 text-center">Post Your Gig</h4>
                    <p className="text-muted-foreground text-center max-w-md">
                      Describe your project needs, set your budget and timeline. Our platform makes it easy to attract the right talent with detailed, professional gig postings.
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>

              {/* Step 4: For Clients - Get Contacted */}
              <CarouselItem>
                <Card className="border-2 border-accent/20">
                  <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                    <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                      <Star className="w-10 h-10 text-accent-foreground" />
                    </div>
                    <Badge className="mb-4 bg-accent/10 text-accent">Step 2 - Clients</Badge>
                    <h4 className="text-2xl font-bold mb-4 text-center">Review & Choose</h4>
                    <p className="text-muted-foreground text-center max-w-md">
                      Qualified diggers purchase your lead and reach out. Review their profiles, portfolios, and ratings to choose the perfect match for your project.
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious className="bg-background hover:bg-muted" />
            <CarouselNext className="bg-background hover:bg-muted" />
          </Carousel>

          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => navigate("/how-it-works")}>
              View Full Details <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Features</Badge>
            <h3 className="text-4xl font-bold mb-4">Built for Success</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Search,
                title: "Smart Matching",
                description: "Our algorithm connects the right diggers with the right gigs based on skills and experience."
              },
              {
                icon: Shield,
                title: "Verified Profiles",
                description: "All diggers are verified with portfolio reviews and skill assessments for quality assurance."
              },
              {
                icon: Star,
                title: "Rating System",
                description: "Build trust through our transparent rating and review system for both parties."
              },
              {
                icon: TrendingUp,
                title: "Fair Pricing",
                description: "Pay-as-you-grow model ensures diggers only pay based on actual inquiries received."
              },
              {
                icon: Briefcase,
                title: "Project Management",
                description: "Built-in tools to manage proposals, communications, and deliverables in one place."
              },
              {
                icon: Users,
                title: "Community",
                description: "Join a thriving community of freelancers and clients supporting each other."
              }
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-xl border border-border/50 hover:shadow-[var(--shadow-hover)] transition-all duration-300">
                <feature.icon className="w-12 h-12 text-primary mb-4" />
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Diggers */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Top Talent</Badge>
            <h3 className="text-4xl font-bold mb-4">Featured Diggers</h3>
            <p className="text-xl text-muted-foreground">
              Discover highly-rated professionals ready to bring your project to life
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {sampleDiggers.map((digger, i) => (
              <DiggerCard key={i} {...digger} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={() => navigate("/browse-diggers")}>
              Browse All Diggers <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Gigs */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Active Projects</Badge>
            <h3 className="text-4xl font-bold mb-4">Recent Gigs</h3>
            <p className="text-xl text-muted-foreground">
              Explore opportunities from clients looking for your expertise
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {sampleGigs.map((gig, i) => (
              <GigCard key={i} {...gig} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={() => navigate("/browse-gigs")}>
              View All Gigs <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Pricing</Badge>
            <h3 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Pay per lead to view contact info, plus commission only when you complete work.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i} 
                className={`p-8 rounded-xl border transition-all duration-300 hover:shadow-[var(--shadow-hover)] ${
                  tier.popular ? 'border-primary bg-primary/5 scale-105' : 'border-border/50'
                }`}
              >
                {tier.popular && (
                  <Badge className="mb-4 bg-primary text-primary-foreground">Most Popular</Badge>
                )}
                <div className="text-center mb-6">
                  <h4 className="font-bold text-2xl mb-2">{tier.name}</h4>
                  <div className="text-4xl font-bold text-primary mb-2">{tier.price}</div>
                  <div className="text-sm text-muted-foreground mb-4">/month</div>
                  <div className="space-y-2 text-sm">
                    <div className="font-semibold text-foreground">{tier.leadCost}</div>
                    <div className="text-muted-foreground">{tier.commission} commission</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={() => navigate("/pricing")}
              className="gap-2"
            >
              View Full Pricing Details
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            * Clients post gigs for free. Diggers pay per lead to access contact info, then pay commission only on completed work.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[var(--gradient-hero)]"></div>
            <div className="relative px-8 py-16 text-center">
              <h3 className="text-4xl font-bold text-white mb-4">
                Ready to Transform Your Freelance Career?
              </h3>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of diggers and clients connecting on digsandgiggs today.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  variant="hero" 
                  size="lg" 
                  className="text-base bg-white text-primary hover:bg-white/90"
                  onClick={() => user ? navigate("/digger-registration") : navigate("/auth?type=digger&redirect=/digger-registration")}
                >
                  Create Your Dig <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base border-white/30 text-white hover:bg-white/10"
                  onClick={() => user ? navigate("/post-gig") : navigate("/auth?redirect=/post-gig")}
                >
                  Post a Gig
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
