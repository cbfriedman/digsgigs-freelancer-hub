import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DiggerCard } from "@/components/DiggerCard";
import { GigCard } from "@/components/GigCard";
import { 
  Search, 
  Users, 
  Briefcase, 
  Star, 
  TrendingUp, 
  Shield,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
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
    { inquiries: "0-10", price: "$0", label: "Starter" },
    { inquiries: "11-25", price: "$29", label: "Growing" },
    { inquiries: "26-50", price: "$49", label: "Professional" },
    { inquiries: "51-100", price: "$79", label: "Expert" },
    { inquiries: "100+", price: "$99", label: "Elite" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            digsandgiggs
          </h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost">Sign In</Button>
            <Button variant="hero">Get Started</Button>
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
                <Button variant="hero" size="lg" className="text-base">
                  Find Talent <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button variant="outline" size="lg" className="text-base">
                  Become a Digger
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

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* For Diggers */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-2xl font-bold mb-2">For Diggers</h4>
                <p className="text-muted-foreground">Showcase your skills and grow your business</p>
              </div>
              <div className="space-y-4">
                {[
                  "Create your professional dig profile",
                  "Upload portfolio and showcase expertise",
                  "Get discovered by quality clients",
                  "Receive invitations to bid on projects",
                  "Build your reputation with ratings"
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* For Clients */}
            <div className="space-y-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-accent-foreground" />
                </div>
                <h4 className="text-2xl font-bold mb-2">For Clients</h4>
                <p className="text-muted-foreground">Find the perfect talent for your project</p>
              </div>
              <div className="space-y-4">
                {[
                  "Post your gig with detailed requirements",
                  "Search our database of verified diggers",
                  "Invite handpicked talent to bid",
                  "Review proposals and portfolios",
                  "Rate your experience after completion"
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
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
            <Button variant="outline" size="lg">
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
            <Button variant="outline" size="lg">
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
            <h3 className="text-4xl font-bold mb-4">Pay As You Grow</h3>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fair, transparent pricing that scales with your success. Only pay based on monthly inquiries received.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i} 
                className={`p-6 rounded-xl border transition-all duration-300 hover:shadow-[var(--shadow-hover)] ${
                  i === 2 ? 'border-primary bg-primary/5 scale-105' : 'border-border/50'
                }`}
              >
                <div className="text-center">
                  <h4 className="font-bold text-lg mb-2">{tier.label}</h4>
                  <div className="text-3xl font-bold text-primary mb-2">{tier.price}</div>
                  <div className="text-sm text-muted-foreground mb-4">/month</div>
                  <div className="text-sm font-medium">{tier.inquiries} inquiries</div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8 max-w-2xl mx-auto">
            * Clients post gigs for free. Diggers only pay when they receive project inquiries or bid invitations.
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
                <Button variant="hero" size="lg" className="text-base bg-white text-primary hover:bg-white/90">
                  Create Your Dig <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="text-base border-white/30 text-white hover:bg-white/10"
                >
                  Post a Gig
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                digsandgiggs
              </h1>
              <p className="text-sm text-muted-foreground">
                Connecting talented freelancers with opportunities worldwide.
              </p>
            </div>
            <div>
              <h5 className="font-semibold mb-4">For Diggers</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Create Profile</li>
                <li>Browse Gigs</li>
                <li>Pricing</li>
                <li>Success Stories</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">For Clients</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Post a Gig</li>
                <li>Find Talent</li>
                <li>How It Works</li>
                <li>Support</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About Us</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 digsandgiggs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
