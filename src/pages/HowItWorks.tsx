import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Users, Briefcase, DollarSign, Star, CheckCircle2 } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { StepVisual } from "@/components/StepVisual";
import DemoGigGrid from "@/components/DemoGigGrid";
import DemoDiggerGrid from "@/components/DemoDiggerGrid";
import RegistrationCategoryDemo from "@/components/RegistrationCategoryDemo";
import { Navigation } from "@/components/Navigation";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";

// Import step screenshots
import step1PostGig from "@/assets/step1-post-gig-new.jpg";
import step2GetDiscovered from "@/assets/step2-browse-gigs.jpg";
import step3ReceiveContacts from "@/assets/step3-platform-messaging.jpg";
import step4ChooseHire from "@/assets/step4-hire-digger.jpg";
import diggerStep1Profile from "@/assets/digger-step1-create-profile.jpg";
import diggerStep2Browse from "@/assets/digger-step2-browse-gigs.jpg";
import diggerStep3Purchase from "@/assets/step3-messaging.jpg";
import diggerStep4Connect from "@/assets/digger-step4-send-proposal.jpg";
import diggerStep5Complete from "@/assets/digger-step5-get-paid.jpg";

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
      title: "Connect via Platform Messaging",
      description: "Interested diggers can message you directly through the platform. You'll receive notifications when someone wants to discuss your project.",
      image: step3ReceiveContacts,
    },
    {
      number: 4,
      title: "Choose & Hire",
      description: "Review proposals through our messaging system, compare portfolios, and select the digger that best matches your needs. All communication stays secure on the platform.",
      image: step4ChooseHire,
    },
  ];

  const diggerSteps = [
    {
      number: 1,
      title: "Create Your Profile",
      description: "Build a professional profile showcasing your skills, experience, and portfolio. Set your hourly rate - this determines your lead costs (you pay 1 hour of your rate per lead, minimum $100). Review our pricing strategy guide to optimize your competitive positioning.",
      image: diggerStep1Profile,
    },
    {
      number: 2,
      title: "Browse Opportunities",
      description: "Explore available gigs that match your expertise. Your hourly rate creates competitive lead pricing - lower rates mean lower acquisition costs. Filter by budget, timeline, and category to find perfect projects. Pro members ($999/month) get unlimited free estimate requests.",
      image: diggerStep2Browse,
    },
    {
      number: 3,
      title: "Purchase Leads",
      description: "Select gigs you want to pursue. For hourly-rate diggers, you pay 1 hour of your advertised rate per lead (minimum $100) - creating a fair race-to-the-bottom auction. Premium members get free leads. This investment gives you direct access to client contact information.",
      image: diggerStep3Purchase,
    },
    {
      number: 4,
      title: "Send Proposal & Close",
      description: "Contact clients directly with their information. Share your proposal, showcase your expertise, and negotiate terms. Your competitive hourly rate helped you win this opportunity - now deliver value to build long-term client relationships.",
      image: diggerStep4Connect,
    },
    {
      number: 5,
      title: "Complete & Get Paid",
      description: "Deliver exceptional work, earn reviews, and build your reputation. Track earnings through our transactions dashboard. Success leads to more opportunities, higher ratings, and the ability to optimize your hourly rate for maximum profitability.",
      image: diggerStep5Complete,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="How It Works - Simple Process for Clients & Service Professionals"
        description="Learn how digsandgigs connects clients with service professionals. Step-by-step guide for posting gigs, finding projects, managing payments, and building your business. Simple, fair, and transparent."
        keywords="how it works, getting started, post gigs, find work, service marketplace guide, contractor platform, freelance platform"
        structuredData={generateFAQSchema([
          { question: "How do clients post gigs?", answer: "Clients create a free account, post their project details including budget and timeline, and receive proposals from qualified professionals." },
          { question: "How do professionals find work?", answer: "Professionals create a profile, browse available gigs, purchase leads for projects they're interested in, and submit proposals to clients." },
          { question: "How does payment work?", answer: "We offer two payment models: fixed-price contracts with escrow protection, and hourly rate projects with flexible billing." }
        ])}
      />
      <Navigation showBackButton backLabel="Back to Home" />

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
              <Carousel opts={{ loop: true }} className="max-w-5xl mx-auto relative">
                <CarouselContent>
                  {clientSteps.map((step, index) => (
                     <CarouselItem key={index}>
                       <div className="space-y-8 px-4">
                  {step.number === 2 ? (
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-muted/50 border-2 border-border animate-fade-in p-6">
                              <div className="mb-6">
                                <h3 className="text-xl font-semibold mb-4 text-center">
                                  See how Diggers with multiple categories appear for your gig
                                </h3>
                                <p className="text-center text-muted-foreground mb-4 text-sm">
                                  Diggers can register in multiple categories and will appear when their skills match your needs
                                </p>
                                <Tabs defaultValue="construction" className="w-full">
                                  <TabsList className="grid w-full grid-cols-4 mb-6">
                                    <TabsTrigger value="construction">Construction Gig</TabsTrigger>
                                    <TabsTrigger value="web">Web Dev Gig</TabsTrigger>
                                    <TabsTrigger value="architecture">Architecture Gig</TabsTrigger>
                                    <TabsTrigger value="legal">Legal Gig</TabsTrigger>
                                  </TabsList>
                                  <TabsContent value="construction">
                                    <DemoDiggerGrid gigCategory="construction" />
                                  </TabsContent>
                                  <TabsContent value="web">
                                    <DemoDiggerGrid gigCategory="web" />
                                  </TabsContent>
                                  <TabsContent value="architecture">
                                    <DemoDiggerGrid gigCategory="architecture" />
                                  </TabsContent>
                                  <TabsContent value="legal">
                                    <DemoDiggerGrid gigCategory="legal" />
                                  </TabsContent>
                                </Tabs>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-muted/50 border-2 border-border animate-fade-in">
                              <AspectRatio ratio={16 / 9}>
                                <img
                                  src={step.image}
                                  alt={step.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </AspectRatio>
                            </div>
                          )}

                         
                         {/* Instructions Below Image - More Prominent */}
                         <Card className="border-2 border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg animate-scale-in">
                           <CardContent className="p-8">
                             <div className="space-y-4">
                               <div className="flex items-center gap-4">
                                 <Badge className="text-xl px-5 py-2 font-bold bg-primary text-primary-foreground shadow-md">
                                   Step {step.number}
                                 </Badge>
                                 <h3 className="text-3xl font-bold">{step.title}</h3>
                               </div>
                               <p className="text-xl text-foreground/80 leading-relaxed font-medium">{step.description}</p>
                             </div>
                           </CardContent>
                         </Card>
                       </div>
                     </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-primary hover:text-primary-foreground border-2 shadow-lg transition-colors" />
                <CarouselNext className="right-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-primary hover:text-primary-foreground border-2 shadow-lg transition-colors" />
              </Carousel>
              <p className="text-center text-muted-foreground mt-6">← Use arrows to navigate →</p>
            </div>

            {/* Detailed Steps */}
            <div className="grid gap-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center">Detailed Process</h3>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Post Your Gig</h4>
                    <p className="text-muted-foreground">Create a detailed posting with your project description, budget range, timeline, and any specific requirements. Add documents or images if needed.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Get Discovered</h4>
                    <p className="text-muted-foreground">Your gig appears in search results where skilled diggers can find it. They can view your project details and decide if they're the right fit.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Receive Contact Requests</h4>
                    <p className="text-muted-foreground">Interested diggers purchase your lead to unlock your contact information. You'll receive notifications when someone wants to connect.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Choose & Hire</h4>
                    <p className="text-muted-foreground">Review profiles, compare portfolios, and select the digger that best matches your needs. Connect directly and complete your project.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* For Diggers (Providers) */}
          <TabsContent value="diggers" className="space-y-12">
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in">
                See How It Works for Diggers
              </h2>
              <Carousel className="max-w-5xl mx-auto relative">
                <CarouselContent>
                  {diggerSteps.map((step, index) => (
                     <CarouselItem key={index}>
                       <div className="space-y-8 px-4">
                         {/* Image Container or Interactive Demo */}
                          {step.number === 1 ? (
                            <div className="rounded-2xl overflow-hidden bg-background border-2 border-border animate-fade-in p-8">
                              <div className="space-y-4">
                                <h4 className="text-2xl font-semibold text-center mb-6">
                                  Multi-Category Registration
                                </h4>
                                <p className="text-center text-muted-foreground mb-6">
                                  Select multiple categories to maximize your gig opportunities
                                </p>
                                <RegistrationCategoryDemo />
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl overflow-hidden shadow-2xl bg-muted/50 border-2 border-border animate-fade-in">
                              <AspectRatio ratio={16 / 9}>
                                <img
                                  src={step.image}
                                  alt={step.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </AspectRatio>
                            </div>
                          )}
                         
                         {/* Instructions Below Image - More Prominent */}
                         <Card className="border-2 border-primary/30 bg-card/95 backdrop-blur-sm shadow-lg animate-scale-in">
                           <CardContent className="p-8">
                             <div className="space-y-4">
                               <div className="flex items-center gap-4">
                                 <Badge className="text-xl px-5 py-2 font-bold bg-primary text-primary-foreground shadow-md">
                                   Step {step.number}
                                 </Badge>
                                 <h3 className="text-3xl font-bold">{step.title}</h3>
                               </div>
                               <p className="text-xl text-foreground/80 leading-relaxed font-medium">{step.description}</p>
                             </div>
                           </CardContent>
                         </Card>
                       </div>
                     </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-primary hover:text-primary-foreground border-2 shadow-lg transition-colors" />
                <CarouselNext className="right-3 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-primary hover:text-primary-foreground border-2 shadow-lg transition-colors" />
              </Carousel>
              <p className="text-center text-muted-foreground mt-6">← Use arrows to navigate →</p>
            </div>

            {/* Detailed Steps */}
            <div className="grid gap-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-center">Detailed Process</h3>
              
              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Create Your Profile</h4>
                    <p className="text-muted-foreground">Build a professional profile showcasing your skills, experience, and portfolio. Set your hourly rate - this determines your lead costs (1 hour of your rate per lead, minimum $100). Check our pricing strategy guide to optimize your positioning.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Browse Opportunities</h4>
                    <p className="text-muted-foreground">Explore available gigs that match your expertise. Your hourly rate creates competitive lead pricing. Pro members ($999/month) get unlimited free estimate requests. Filter by budget, timeline, and category to find perfect projects.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Purchase Lead</h4>
                    <p className="text-muted-foreground">Pay tier-based cost upfront ($3 Free, $1.50 Pro, $0 Premium). When awarded, 1 hour of your rate is charged (no minimum). Set any hourly rate you want. Premium members get free leads.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">4</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Connect & Close</h4>
                    <p className="text-muted-foreground">Reach out to the client directly with your proposal. Your competitive hourly rate helped you win this lead. Build relationships, showcase expertise, and close deals on your own terms.</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-primary-foreground">5</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xl mb-2">Complete & Get Paid</h4>
                    <p className="text-muted-foreground">Deliver exceptional work, earn reviews, and build your reputation. Track earnings in your transactions dashboard. Success leads to more opportunities, higher ratings, and the ability to optimize your hourly rate strategy.</p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Trust & Safety Section */}
        <div className="mt-20 grid md:grid-cols-2 gap-8">
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-2">Identity Protection</h3>
                <p className="text-muted-foreground">Your contact information remains private until you approve a lead purchase. Control who can reach you.</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <Star className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-2">Verified Credentials</h3>
                <p className="text-muted-foreground">Browse verified portfolios and reviews to make informed hiring decisions with confidence.</p>
              </div>
            </div>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/post-gig")} className="gap-2">
              <DollarSign className="w-5 h-5" />
              Post a Gig
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/digger-registration")} className="gap-2">
              <Users className="w-5 h-5" />
              Become a Digger
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
