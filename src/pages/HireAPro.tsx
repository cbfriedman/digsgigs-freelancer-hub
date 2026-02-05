import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Shield, 
  Users, 
  Zap,
  Star,
  MessageSquare,
  FileCheck,
  Phone,
  PhoneOutgoing,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/layout/PageLayout";
import SEOHead from "@/components/SEOHead";
import { useGA4Tracking } from "@/hooks/useGA4Tracking";
import { GigFormChatbot } from "@/components/hire-pro/GigFormChatbot";
import { GigData } from "@/hooks/useGigAssistant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const benefits = [
  {
    icon: Clock,
    title: "Get Proposals in Hours",
    description: "Post your project and receive proposals from qualified pros within hours, not days."
  },
  {
    icon: Shield,
    title: "Vetted US-Based Talent",
    description: "Work with professionals in your timezone who understand your market."
  },
  {
    icon: Users,
    title: "Curated Matches",
    description: "Receive 3-5 highly relevant proposals instead of sorting through hundreds."
  },
  {
    icon: Zap,
    title: "Free to Post",
    description: "No upfront costs, no credit card required. Pay nothing until you hire."
  }
];

const steps = [
  {
    number: "01",
    title: "Describe Your Project",
    description: "Tell us what you need—whether it's a website, app, design, or marketing help."
  },
  {
    number: "02",
    title: "Review Proposals",
    description: "Qualified Diggers review your project and submit detailed proposals with pricing."
  },
  {
    number: "03",
    title: "Hire & Get Started",
    description: "Choose your pro, pay a small deposit, and kick off your project."
  }
];

const testimonials = [
  {
    quote: "Found an amazing developer in 24 hours. The quality of proposals was incredible.",
    author: "Sarah M.",
    role: "Startup Founder",
    rating: 5
  },
  {
    quote: "Finally, a platform that doesn't take a huge cut. My freelancers are happier and deliver better work.",
    author: "Michael R.",
    role: "Agency Owner",
    rating: 5
  },
  {
    quote: "The US-based talent pool is a game changer. No more timezone headaches.",
    author: "Jennifer L.",
    role: "Marketing Director",
    rating: 5
  }
];

const categories = [
  "Web Development",
  "Mobile Apps",
  "UI/UX Design",
  "SEO & Marketing",
  "AI & Automation",
  "Data Analysis",
  "Branding",
  "Copywriting"
];

const DISPLAY_PHONE = "(412) 545-7108";

export default function HireAPro() {
  const navigate = useNavigate();
  const { trackButtonClick } = useGA4Tracking();
  const [extractedData, setExtractedData] = useState<GigData | null>(null);
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState("");
  const [callbackName, setCallbackName] = useState("");
  const [isRequestingCallback, setIsRequestingCallback] = useState(false);

  const handlePostProject = () => {
    trackButtonClick('Post a Project', 'hire-a-pro');
    navigate("/post-gig");
  };

  const handleDataUpdate = (data: GigData) => {
    setExtractedData(data);
  };

  const handleFormComplete = (data: GigData) => {
    // Navigate to post-gig with pre-filled data
    toast.success("Great! Let's complete your project posting.");
    navigate("/post-gig", { state: { prefillData: data } });
  };

  const handlePhoneClick = () => {
    trackButtonClick('Call Phone Number', 'hire-a-pro');
    window.location.href = `tel:${DISPLAY_PHONE.replace(/\D/g, '')}`;
  };

  const handleRequestCallback = async () => {
    if (!callbackPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsRequestingCallback(true);
    trackButtonClick('Request Callback', 'hire-a-pro');

    try {
      const { error } = await supabase.functions.invoke("request-ai-callback", {
        body: {
          phone: callbackPhone,
          name: callbackName || "Guest",
          source: "hire-a-pro-landing"
        }
      });

      if (error) throw error;

      toast.success("We'll call you within 5 minutes!", {
        description: "Our AI assistant Morgan will help you describe your project."
      });
      setShowCallbackForm(false);
      setCallbackPhone("");
      setCallbackName("");
    } catch (err) {
      console.error("Callback request error:", err);
      toast.error("Couldn't schedule callback. Please try again.");
    } finally {
      setIsRequestingCallback(false);
    }
  };

  return (
    <PageLayout showFooter={true} maxWidth="wide" padded={false}>
      <SEOHead
        title="Hire a Pro - Find Top Tech Talent"
        description="Hire vetted software developers, designers, and digital experts. Get proposals in hours, pay only 8% when you hire. Free to post."
        keywords="hire freelancer, hire developer, find designer, tech talent, software development, web design"
      />

      {/* Main Section - Project Details First */}
      <section className="section-padding pt-6 md:pt-8">
        <div className="container-wide">
          {/* Header */}
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-3 bg-success/10 text-success border-success/20">
              <Zap className="h-3 w-3 mr-1" />
              Free to post • No obligations
            </Badge>
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
              Tell Us What You Need
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Describe your project and we'll connect you with qualified freelancers ready to help.
            </p>
          </div>

          {/* Main Grid - Chat + Contact Options */}
          <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Chatbot - Takes 2 columns */}
            <div className="lg:col-span-2">
              <GigFormChatbot 
                onDataUpdate={handleDataUpdate}
                onComplete={handleFormComplete}
              />
              <p className="text-xs text-muted-foreground text-center mt-3">
                Chat with Morgan to describe your project, or use the options on the right.
              </p>
            </div>

            {/* Contact Options - 1 column */}
            <div className="space-y-4">
              {/* Request Callback */}
              <Card className={`p-5 border-2 transition-all duration-300 ${
                showCallbackForm ? 'border-primary/50 shadow-lg' : 'border-border/50 hover:border-primary/50'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <PhoneOutgoing className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Request a Callback</h4>
                    <p className="text-xs text-muted-foreground">We'll call you in 5 min</p>
                  </div>
                </div>
                
                {showCallbackForm ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="callback-name" className="text-xs">Your Name</Label>
                      <Input
                        id="callback-name"
                        placeholder="John"
                        value={callbackName}
                        onChange={(e) => setCallbackName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label htmlFor="callback-phone" className="text-xs">Phone Number *</Label>
                      <Input
                        id="callback-phone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={callbackPhone}
                        onChange={(e) => setCallbackPhone(e.target.value)}
                        className="h-9"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setShowCallbackForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-primary"
                        onClick={handleRequestCallback}
                        disabled={isRequestingCallback}
                      >
                        {isRequestingCallback ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>Call Me</>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowCallbackForm(true)}
                  >
                    Get a Call
                    <Phone className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </Card>

              {/* Call Us Directly */}
              <Card 
                className="p-5 border-2 border-border/50 hover:border-success/50 cursor-pointer transition-all duration-300"
                onClick={handlePhoneClick}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Call Us Directly</h4>
                    <p className="text-xs text-muted-foreground">Speak to Morgan now</p>
                  </div>
                </div>
                <div className="font-mono text-xl font-bold text-success text-center py-2">
                  {DISPLAY_PHONE}
                </div>
              </Card>

              {/* Fill Out Form Option */}
              <Card 
                className="p-5 border-2 border-border/50 hover:border-accent/50 cursor-pointer transition-all duration-300"
                onClick={handlePostProject}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Full Project Form</h4>
                    <p className="text-xs text-muted-foreground">Detailed submission</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Open Form
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Why Digs & Gigs?
            </span>
            <h2 className="mb-4">Built for Clients Who Value Quality</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We connect you with serious professionals, not a sea of low-ball bidders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="group p-6 bg-card border-border/50 shadow-card hover:shadow-card-hover hover-lift text-center">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <benefit.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-gradient-subtle">
        <div className="container-wide">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Simple Process
            </span>
            <h2 className="mb-4">How It Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From project post to kickoff in as little as 24 hours
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                <div className="text-[80px] font-display font-bold text-muted/10 leading-none mb-2">
                  {step.number}
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-primary text-white flex items-center justify-center mx-auto -mt-12 mb-4 relative z-10 shadow-primary">
                  {index === 0 && <FileCheck className="h-6 w-6" />}
                  {index === 1 && <MessageSquare className="h-6 w-6" />}
                  {index === 2 && <CheckCircle2 className="h-6 w-6" />}
                </div>
                <h3 className="font-display font-semibold text-xl mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-10">
            <h2 className="mb-4">Find Experts In</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
            {categories.map((category, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-gradient-subtle">
        <div className="container-wide">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium mb-4">
              Trusted by Clients
            </span>
            <h2 className="mb-4">What Clients Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 bg-card border-border/50 shadow-card">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="text-foreground mb-4 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl opacity-50" />
        
        <div className="container-wide relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent text-white mb-8 shadow-accent-lg animate-float">
              <Zap className="h-8 w-8" />
            </div>
            
            <h2 className="mb-6">Ready to Find Your Perfect Pro?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              Post your project in 2 minutes. Get proposals today.
              <span className="text-accent font-medium"> Free to post.</span>
            </p>
            
            <Button 
              size="lg" 
              className="text-lg px-12 py-6 bg-gradient-accent text-accent-foreground shadow-accent-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              onClick={handlePostProject}
            >
              Post Your Project — It's Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <p className="text-sm text-muted-foreground mt-6">
              No credit card required • Proposals in hours
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
