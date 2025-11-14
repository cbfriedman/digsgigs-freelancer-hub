import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowLeft, Users, Briefcase, DollarSign, Star, CheckCircle2 } from "lucide-react";

// Import step screenshots
import step1PostGig from "@/assets/step1-post-gig.jpg";
import step2GetDiscovered from "@/assets/step2-get-discovered.jpg";
import step3ReceiveContacts from "@/assets/step3-receive-contacts.jpg";
import step4ChooseHire from "@/assets/step4-choose-hire.jpg";
import diggerStep1Profile from "@/assets/digger-step1-profile.jpg";
import diggerStep2Browse from "@/assets/digger-step2-browse.jpg";
import diggerStep3Purchase from "@/assets/digger-step3-purchase.jpg";
import diggerStep4Connect from "@/assets/digger-step4-connect.jpg";
import diggerStep5Complete from "@/assets/digger-step5-complete.jpg";

const HowItWorks = () => {
  const navigate = useNavigate();

  const clientSteps = [
    {
      number: 1,
      title: "Post Your Gig",
      description: "Create a detailed posting with your project description, budget range, timeline, and any specific requirements. Add documents or images if needed.",
      image: step1PostGig,
    },
    {
      number: 2,
      title: "Get Discovered",
      description: "Your gig appears in search results where skilled diggers can find it. They can view your project details and decide if they're the right fit.",
      image: step2GetDiscovered,
    },
    {
      number: 3,
      title: "Receive Contact Requests",
      description: "Interested diggers purchase your lead to unlock your contact information. You'll receive notifications when someone wants to connect.",
      image: step3ReceiveContacts,
    },
    {
      number: 4,
      title: "Choose & Hire",
      description: "Review profiles, compare portfolios, and select the digger that best matches your needs. Connect directly and complete your project.",
      image: step4ChooseHire,
    },
  ];

  const diggerSteps = [
    {
      number: 1,
      title: "Create Your Profile",
      description: "Build a professional profile showcasing your skills, experience, and portfolio. Stand out to potential clients with detailed credentials.",
      image: diggerStep1Profile,
    },
    {
      number: 2,
      title: "Browse Opportunities",
      description: "Explore available gigs that match your expertise. Filter by budget, timeline, and category to find the perfect projects.",
      image: diggerStep2Browse,
    },
    {
      number: 3,
      title: "Purchase Lead",
      description: "Invest in quality leads by purchasing contact information. Only pay for opportunities you're genuinely interested in pursuing.",
      image: diggerStep3Purchase,
    },
    {
      number: 4,
      title: "Connect & Close",
      description: "Reach out to the client directly with your proposal. Build relationships and close deals on your own terms.",
      image: diggerStep4Connect,
    },
    {
      number: 5,
      title: "Complete & Get Paid",
      description: "Deliver exceptional work, build your reputation, and grow your business. Success leads to more opportunities and higher ratings.",
      image: diggerStep5Complete,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgiggs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-16 animate-fade-in">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">How It Works</Badge>
          <h1 className="text-5xl font-bold mb-4">Simple, Fair, Transparent</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            DiggsAndGiggs connects skilled professionals with clients through a pay-per-lead marketplace model.
          </p>
        </div>

        <Tabs defaultValue="giggers" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="giggers" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              For Giggers (Clients)
            </TabsTrigger>
            <TabsTrigger value="diggers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              For Diggers (Providers)
            </TabsTrigger>
          </TabsList>

          {/* For Giggers (Clients) */}
          <TabsContent value="giggers" className="space-y-12">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in">
                See How It Works for Clients
              </h2>
              <Carousel className="max-w-5xl mx-auto">
                <CarouselContent>
                  {clientSteps.map((step, index) => (
                    <CarouselItem key={index}>
                      <Card className="border-2 border-primary/20 overflow-hidden animate-fade-in">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img 
                              src={step.image} 
                              alt={step.title}
                              className="w-full h-[400px] object-cover animate-scale-in"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-8 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                              <Badge className="mb-3 bg-primary text-primary-foreground">
                                Step {step.number}
                              </Badge>
                              <h3 className="text-3xl font-bold mb-3 text-foreground">
                                {step.title}
                              </h3>
                              <p className="text-foreground/90 text-lg max-w-2xl">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="bg-background hover:bg-muted -left-12" />
                <CarouselNext className="bg-background hover:bg-muted -right-12" />
              </Carousel>
              <p className="text-center text-muted-foreground mt-6">← Swipe or click arrows to navigate →</p>
            </div>

            {/* Detailed Steps */}
            <div className="grid gap-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center">Detailed Process</h3>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Post Gigs & Connect with Pros</h4>
                    <p className="text-muted-foreground">
                      Create comprehensive project listings that attract the right talent. Set your budget,
                      timeline, and requirements. Quality diggers will discover your opportunities and
                      reach out when they're a perfect match.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <Star className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Review & Select</h4>
                    <p className="text-muted-foreground">
                      When diggers purchase your lead, you'll receive their complete profile, portfolio,
                      and contact information. Review their credentials, past work, and ratings before
                      making your decision.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Completely Free for Clients</h4>
                    <p className="text-muted-foreground mb-3">
                      Post unlimited gigs at no cost. You only connect with diggers who are serious
                      enough to invest in reaching you. This ensures you receive quality proposals
                      from motivated professionals.
                    </p>
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                      <p className="text-sm font-semibold text-accent-foreground">
                        💰 No posting fees • No subscription required • No hidden costs
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Button size="lg" onClick={() => navigate("/post-gig")} className="group">
                Post Your First Gig
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </TabsContent>

          {/* For Diggers (Service Providers) */}
          <TabsContent value="diggers" className="space-y-12">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in">
                See How It Works for Service Providers
              </h2>
              <Carousel className="max-w-5xl mx-auto">
                <CarouselContent>
                  {diggerSteps.map((step, index) => (
                    <CarouselItem key={index}>
                      <Card className="border-2 border-accent/20 overflow-hidden animate-fade-in">
                        <CardContent className="p-0">
                          <div className="relative">
                            <img 
                              src={step.image} 
                              alt={step.title}
                              className="w-full h-[400px] object-cover animate-scale-in"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/50 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-8 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                              <Badge className="mb-3 bg-accent text-accent-foreground">
                                Step {step.number}
                              </Badge>
                              <h3 className="text-3xl font-bold mb-3 text-foreground">
                                {step.title}
                              </h3>
                              <p className="text-foreground/90 text-lg max-w-2xl">
                                {step.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="bg-background hover:bg-muted -left-12" />
                <CarouselNext className="bg-background hover:bg-muted -right-12" />
              </Carousel>
              <p className="text-center text-muted-foreground mt-6">← Swipe or click arrows to navigate →</p>
            </div>

            {/* Detailed Steps for Diggers */}
            <div className="grid gap-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center">Detailed Process</h3>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Build Your Professional Presence</h4>
                    <p className="text-muted-foreground">
                      Create a standout profile with your portfolio, skills, and experience. Add your
                      best work samples and detailed descriptions. A strong profile attracts better
                      opportunities and helps you stand out from the competition.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Invest in Quality Leads</h4>
                    <p className="text-muted-foreground">
                      Browse available projects and purchase leads that match your expertise. Lead
                      prices vary based on project value, but you only pay when you find opportunities
                      worth pursuing. No monthly fees or subscriptions.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Pay-Per-Lead + Commission</h4>
                    <p className="text-muted-foreground mb-4">
                      Our transparent pricing model ensures fairness for everyone. You pay a small
                      upfront fee to access client information, plus a percentage of your earnings
                      upon project completion.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">Lead Cost</span>
                          <span className="text-primary font-bold">$25-$50</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          One-time fee to unlock client contact info
                        </p>
                      </div>
                      <div className="bg-secondary rounded-lg p-4">
                        <div className="font-semibold mb-3">Commission Tiers:</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Projects under $1,000</span>
                            <span className="font-semibold">10%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>$1,000 - $5,000</span>
                            <span className="font-semibold">8%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Over $5,000</span>
                            <span className="font-semibold">5%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="text-center mt-12">
              <Button size="lg" onClick={() => navigate("/digger-registration")} className="group">
                Become a Digger
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Trust & Safety Section */}
        <div className="mt-20 pt-12 border-t border-border">
          <div className="text-center mb-12 animate-fade-in">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">Trust & Safety</Badge>
            <h2 className="text-4xl font-bold mb-4">Built on Trust</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Your security and privacy are our top priorities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h4 className="text-xl font-bold mb-3">🔒 Identity Protection</h4>
              <p className="text-muted-foreground">
                Your contact information remains private until you choose to share it. Diggers
                must invest to access your details, ensuring serious inquiries only.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <h4 className="text-xl font-bold mb-3">✓ Verified Credentials</h4>
              <p className="text-muted-foreground">
                Review portfolios, ratings, and past work before connecting. Our rating system
                helps you make informed decisions based on real experiences.
              </p>
            </Card>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Card className="p-8 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of professionals and clients who trust DiggsAndGiggs for their project needs.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" onClick={() => navigate("/post-gig")}>
                Post a Gig
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/digger-registration")}>
                Become a Digger
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
