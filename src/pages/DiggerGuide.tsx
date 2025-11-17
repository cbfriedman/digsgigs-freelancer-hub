import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CheckCircle, DollarSign, FileText, Settings, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DiggerGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12 animate-fade-in">
          <Badge variant="secondary" className="mb-4">Complete Guide</Badge>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Digger's Journey
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your step-by-step guide to landing your first gig and growing your business on digsandgigs
          </p>
        </div>

        <div className="space-y-6">
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="step-1" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    1
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Sign Up & Create Your Account</div>
                    <div className="text-sm text-muted-foreground">Get started in minutes</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    Click "For Diggers" on the homepage and sign up with your email or use social login (Google, GitHub, LinkedIn).
                  </p>
                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-accent" />
                      What You'll Need:
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground ml-6 list-disc">
                      <li>Valid email address</li>
                      <li>Secure password</li>
                      <li>2-3 minutes to complete signup</li>
                    </ul>
                  </div>
                  <Button onClick={() => navigate('/auth?type=digger')} className="w-full">
                    Start Sign Up
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-2" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    2
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Complete Your Professional Profile</div>
                    <div className="text-sm text-muted-foreground">Showcase your expertise</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    Build a compelling profile that helps clients trust you and understand your services.
                  </p>
                  <div className="grid gap-3">
                    <div className="flex gap-3 items-start">
                      <FileText className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Business Information</div>
                        <div className="text-sm text-muted-foreground">Business name, profession, location, phone</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <Settings className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Professional Details & Hourly Rate</div>
                        <div className="text-sm text-muted-foreground">Years of experience, hourly rate (determines lead costs), bio. Set competitive rates using our pricing strategy guide.</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Credentials & Portfolio</div>
                        <div className="text-sm text-muted-foreground">Licenses, insurance, certifications, work photos</div>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/digger-registration')} className="w-full">
                    Complete Profile
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-3" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    3
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Set Your Lead Limits (Optional)</div>
                    <div className="text-sm text-muted-foreground">Control your budget and workload</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    Prevent overspending by setting daily, weekly, or monthly limits on how many leads you purchase.
                  </p>
                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <h4 className="font-semibold mb-3">Lead Pricing Models:</h4>
                    <div className="space-y-3 text-sm">
                      <div className="border-b pb-2">
                        <span className="font-semibold block mb-1">Hourly Rate Auction (Recommended):</span>
                        <span className="text-muted-foreground">Pay 1 hour of your advertised rate per lead (minimum $100). Lower rates = lower lead costs = competitive advantage.</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Free Tier (Fixed):</span>
                          <span className="font-semibold">$3 per lead</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pro Tier ($999/mo):</span>
                          <span className="font-semibold">$2 per lead + unlimited free estimates</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Premium Tier:</span>
                          <span className="font-semibold text-accent">FREE leads!</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span>Old Leads (&gt;24h):</span>
                          <span className="font-semibold">$1 per lead</span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="mt-2 p-0 h-auto"
                      onClick={() => navigate('/pricing-strategy')}
                    >
                      View Pricing Strategy Guide →
                    </Button>
                  </div>
                  <Button onClick={() => navigate('/lead-limits')} variant="outline" className="w-full">
                    Set Lead Limits
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-4" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    4
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Browse & Purchase Leads</div>
                    <div className="text-sm text-muted-foreground">Find gigs that match your skills</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    Search through available gigs using filters for category, budget, and location. Purchase leads to get client contact info.
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <Search className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Search & Filter</div>
                        <div className="text-sm text-muted-foreground">Use keywords, categories, and budget filters to find relevant gigs</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Purchase Lead</div>
                        <div className="text-sm text-muted-foreground">Pay tier-based cost (Free: $3, Pro: $1.50, Premium: $0) to unlock client contact info. For hourly pricing, pay 1 hour rate when awarded.</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <p className="text-sm"><strong>Pro Tip:</strong> If you've reached your lead limit, you can still purchase older gigs (&gt;24 hours old) for just $1 each!</p>
                  </div>
                  <Button onClick={() => navigate('/browse-gigs')} className="w-full">
                    Browse Gigs
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-5" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                    5
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Submit Your Bid</div>
                    <div className="text-sm text-muted-foreground">Send your proposal to the client</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    After purchasing a lead, craft a compelling bid with your proposed amount, timeline, and detailed proposal.
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <Send className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Craft Your Proposal</div>
                        <div className="text-sm text-muted-foreground">Explain your approach, experience, and why you're the best fit</div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Set Your Price & Timeline</div>
                        <div className="text-sm text-muted-foreground">Be competitive but fair. Provide realistic completion dates</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                    <p className="text-sm"><strong>Remember:</strong> Clients can see multiple bids, so stand out with professionalism, clarity, and relevant experience!</p>
                  </div>
                  <Button onClick={() => navigate('/my-leads')} className="w-full">
                    View My Leads
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="step-6" className="border rounded-lg px-6 bg-card">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent font-bold">
                    6
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Win Gigs & Get Paid</div>
                    <div className="text-sm text-muted-foreground">Complete work and build your reputation</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6">
                <div className="space-y-4 ml-14">
                  <p className="text-muted-foreground">
                    Once a client accepts your bid, complete the work, mark it as done, and get paid through the platform.
                  </p>
                  <div className="bg-accent/10 p-4 rounded-lg border border-accent/20">
                    <h4 className="font-semibold mb-2">Commission Structure:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Free Tier:</span>
                        <span>9% commission ($5 minimum)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pro Tier:</span>
                        <span>4% commission ($5 minimum)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Premium Tier:</span>
                        <span className="font-semibold text-accent">0% commission!</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    After completion, clients can rate your work. Great reviews help you win more gigs and build credibility!
                  </p>
                  <Button onClick={() => navigate('/subscription')} variant="outline" className="w-full">
                    Upgrade to Save More
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Card className="mt-12 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-3">Ready to Start?</h3>
            <p className="text-muted-foreground mb-6">
              Join thousands of diggers already growing their business on digsandgigs
            </p>
            <Button size="lg" onClick={() => navigate('/browse-gigs')} className="gap-2">
              Browse Available Gigs
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
