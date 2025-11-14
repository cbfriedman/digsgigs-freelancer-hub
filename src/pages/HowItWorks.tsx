import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ArrowLeft, Users, Briefcase, DollarSign, Star, CheckCircle2, Search, FileText, Eye, MessageCircle, Handshake } from "lucide-react";

const HowItWorks = () => {
  const navigate = useNavigate();

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
        <div className="text-center mb-16">
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
            {/* Interactive Carousel */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-6">See How It Works for Clients</h2>
              <Carousel className="max-w-4xl mx-auto">
                <CarouselContent>
                  <CarouselItem>
                    <Card className="border-2 border-primary/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <FileText className="w-12 h-12 text-primary-foreground" />
                        </div>
                        <Badge className="mb-4 bg-primary/10 text-primary">Step 1</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Post Your Gig</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Create a detailed posting with your project description, budget range, timeline, and any specific requirements. Add documents or images if needed.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-accent/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <Eye className="w-12 h-12 text-accent-foreground" />
                        </div>
                        <Badge className="mb-4 bg-accent/10 text-accent">Step 2</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Get Discovered</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Your gig appears in search results where skilled diggers can find it. They can view your project details and decide if they're the right fit.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-primary/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <MessageCircle className="w-12 h-12 text-primary-foreground" />
                        </div>
                        <Badge className="mb-4 bg-primary/10 text-primary">Step 3</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Receive Contact Requests</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Interested diggers purchase your lead to unlock your contact information. You'll receive notifications when someone wants to connect.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-accent/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <Handshake className="w-12 h-12 text-accent-foreground" />
                        </div>
                        <Badge className="mb-4 bg-accent/10 text-accent">Step 4</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Choose & Hire</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Review profiles, discuss project details, and hire the professional that best fits your needs. Negotiate terms directly - completely free!
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <p className="text-center text-sm text-muted-foreground mt-4">← Swipe or click arrows to navigate →</p>
            </div>

            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-3xl font-bold">Post Gigs & Connect with Pros</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-primary">1</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Post Your Gig</h3>
                    <p className="text-muted-foreground">
                      Create a detailed gig posting describing your project needs, budget, and timeline. Include any relevant documents or requirements.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-primary">2</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Get Discovered</h3>
                    <p className="text-muted-foreground">
                      Your gig appears in search results. Interested diggers can view details and decide if they're a good fit for your project.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-primary">3</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Connect & Hire</h3>
                    <p className="text-muted-foreground">
                      Diggers purchase your lead to access your contact info. Review their profiles, discuss the project, and hire the best fit.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-accent/5 border-accent/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <DollarSign className="w-8 h-8 text-accent shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Completely Free for Clients</h3>
                      <p className="text-muted-foreground">
                        Posting gigs is completely free. No hidden fees, no commissions. You only pay what you agree with the digger for the actual work.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* CTA for Giggers */}
            <div className="text-center pt-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Post Your Gig?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Connect with skilled professionals today - it's completely free!
              </p>
              <Button size="lg" onClick={() => navigate("/auth?redirect=/post-gig")}>
                Post a Gig Now
              </Button>
            </div>
          </TabsContent>

          {/* For Diggers (Service Providers) */}
          <TabsContent value="diggers" className="space-y-12">
            {/* Interactive Carousel */}
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-6">See How It Works for Diggers</h2>
              <Carousel className="max-w-4xl mx-auto">
                <CarouselContent>
                  <CarouselItem>
                    <Card className="border-2 border-accent/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <Users className="w-12 h-12 text-accent-foreground" />
                        </div>
                        <Badge className="mb-4 bg-accent/10 text-accent">Step 1</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Create Your Profile</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Choose a unique handle, showcase your skills and expertise, upload portfolio samples, and add verified references. Your real identity stays protected.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-primary/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <Search className="w-12 h-12 text-primary-foreground" />
                        </div>
                        <Badge className="mb-4 bg-primary/10 text-primary">Step 2</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Browse Opportunities</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Search and filter gigs by category, budget, location, and requirements. Find projects that match your skills - no bidding wars or price competition.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-accent/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <DollarSign className="w-12 h-12 text-accent-foreground" />
                        </div>
                        <Badge className="mb-4 bg-accent/10 text-accent">Step 3</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Purchase Lead</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Pay a small upfront fee ($50 min or 0.5% of budget) to unlock the client's contact information and project details. Check your lead limits first.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-primary/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <MessageCircle className="w-12 h-12 text-primary-foreground" />
                        </div>
                        <Badge className="mb-4 bg-primary/10 text-primary">Step 4</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Connect & Close</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Reach out to the client directly, discuss project scope and timeline, negotiate your price, and close the deal on your terms.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  <CarouselItem>
                    <Card className="border-2 border-accent/20">
                      <CardContent className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent to-accent/60 rounded-2xl flex items-center justify-center mb-6 animate-scale-in shadow-lg">
                          <Star className="w-12 h-12 text-accent-foreground" />
                        </div>
                        <Badge className="mb-4 bg-accent/10 text-accent">Step 5</Badge>
                        <h3 className="text-3xl font-bold mb-4 text-center">Complete & Get Paid</h3>
                        <p className="text-muted-foreground text-center max-w-md text-lg">
                          Deliver excellent work, get paid by the client, then report completion on the platform. A small commission applies based on your subscription tier.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
              <p className="text-center text-sm text-muted-foreground mt-4">← Swipe or click arrows to navigate →</p>
            </div>

            <section>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Find Gigs & Grow Your Business</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-accent">1</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Create Your Profile</h3>
                    <p className="text-muted-foreground">
                      Choose a handle, showcase your skills, upload portfolio work, and add client references. Your identity stays protected.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-accent">2</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Browse Opportunities</h3>
                    <p className="text-muted-foreground">
                      Search for gigs matching your expertise. Filter by category, budget, and location. No bidding wars or race-to-the-bottom pricing.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-2xl font-bold text-accent">3</span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Purchase & Connect</h3>
                    <p className="text-muted-foreground">
                      Pay a small fee to access client contact info. Reach out, discuss the project, and close the deal on your terms.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <DollarSign className="w-8 h-8 text-primary shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Pay-Per-Lead + Commission</h3>
                      <p className="text-muted-foreground mb-4">
                        Purchase leads for <strong>$50 minimum or 0.5% of the gig's lower budget</strong> (whichever is higher). When you complete work, pay a small commission based on your subscription tier.
                      </p>
                      <div className="space-y-3 mb-4">
                        <div className="font-semibold text-sm">Lead Pricing Examples:</div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">$5,000 gig = $50 lead price</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">$20,000 gig = $100 lead price</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="font-semibold text-sm">Commission on Completed Work:</div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">Free: 10% commission ($5 min)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">Pro ($10/mo): 4% commission ($5 min)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span className="text-sm">Premium ($150/mo): 0% commission - keep 100%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* CTA for Diggers */}
            <div className="text-center pt-8">
              <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Gig?</h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of professionals growing their business on DiggsAndGiggs
              </p>
              <Button size="lg" onClick={() => navigate("/auth?type=digger&redirect=/digger-registration")}>
                Become a Digger
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Trust & Safety - Shared Section */}
        <section className="mt-20 mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Trust & Safety</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We've built protections for both sides of the marketplace
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Search className="w-8 h-8 text-primary shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Identity Protection</h3>
                    <p className="text-muted-foreground">
                      Diggers use handles instead of real names. Contact information is only shared after lead purchase, preventing direct bypass of the platform.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Star className="w-8 h-8 text-accent shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Verified Credentials</h3>
                    <p className="text-muted-foreground">
                      Diggers can display insurance, bonding, and licensing status. References are verified and contact info can be requested through the platform.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HowItWorks;
