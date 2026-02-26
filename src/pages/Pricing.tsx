import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowRight,
  DollarSign,
  Mail,
  Phone,
  User,
  FileText,
  Calendar,
  Shield,
  Eye,
  Zap,
  Award,
  Lock,
  Users,
  Sparkles,
  TrendingUp,
  Clock
} from "lucide-react";
import { Helmet } from "react-helmet-async";

// Dynamic pricing examples (3% formula with $20 min, $69 max)
const PRICING_EXAMPLES = [
  { budget: "$150–$666", average: 400, price: 20, note: "(minimum)" },
  { budget: "$700–$1,500", average: 1100, price: 33, note: "" },
  { budget: "$2,300+", average: 2500, price: 69, note: "(cap)" },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Pricing for Freelancers (Diggers) & Clients (Giggers) | Digs & Gigs</title>
        <meta name="description" content="For Diggers (freelancers): pay per lead (3% of budget, $20–$69) or 8% when awarded. For Giggers (clients): post free; 15% deposit when awarding. No subscriptions. Bad leads refundable." />
      </Helmet>
      
      <PageLayout showNav={true} showFooter={true} maxWidth="full" padded={false}>
        {/* HERO SECTION */}
        <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="animate-fade-in-up">
                <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
                  <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                  Two ways to get work
                </Badge>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                Choose your pricing model —
                <br />
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                  pay per lead or per job
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                No subscriptions. Pick the engagement type that fits your workflow.
              </p>
            </div>
          </div>
        </section>

        {/* TWO PRICING MODELS */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12 animate-fade-in-up">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Two Engagement Options</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Choose the model that works best for your business
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Non-Exclusive */}
                <Card className="border-2 border-primary/50 shadow-lg relative overflow-hidden hover-lift animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-primary/70" />
                  <CardHeader className="text-center pb-4 bg-gradient-to-b from-primary/5 to-transparent">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Users className="h-7 w-7 text-primary" />
                    </div>
                    <Badge className="mb-3 bg-primary/10 text-primary border-primary/20">
                      Pay Per Lead
                    </Badge>
                    <CardTitle className="text-2xl">Non-Exclusive Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <p className="text-center text-muted-foreground">
                      Pay once to unlock the Gigger’s contact. Other Diggers (freelancers) may also unlock the same lead.
                    </p>
                    
                    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/10">
                    <div className="text-sm text-center mb-2 text-muted-foreground font-medium">Pricing Formula</div>
                      <div className="text-center font-mono font-bold text-primary text-lg">
                        Higher of 3% or $20
                      </div>
                    </div>

                    <div className="flex justify-center gap-8">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">$20</div>
                        <div className="text-xs text-muted-foreground font-medium">Minimum</div>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">$69</div>
                        <div className="text-xs text-muted-foreground font-medium">Maximum</div>
                      </div>
                    </div>

                    <ul className="space-y-3 pt-2">
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>Instant access to client contact</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>Pay only for leads you want</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>First to respond often wins</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Exclusive */}
                <Card className="border-2 border-accent/50 shadow-lg relative overflow-hidden hover-lift animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-accent/70" />
                  <CardHeader className="text-center pb-4 bg-gradient-to-b from-accent/5 to-transparent">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-7 w-7 text-accent" />
                    </div>
                    <Badge className="mb-3 bg-accent/10 text-accent border-accent/20">
                      Pay on Award
                    </Badge>
                    <CardTitle className="text-2xl">Exclusive Job Award</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2">
                    <p className="text-center text-muted-foreground">
                      8% referral fee when awarded. Fee comes from Gigger's 15% deposit — you pay nothing out of pocket.
                    </p>
                    
                    <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-5 border border-accent/10">
                      <div className="text-sm text-center mb-2 text-muted-foreground font-medium">Referral Fee</div>
                      <div className="text-center font-mono font-bold text-accent text-lg">
                        8% of your bid
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-accent">$99 Minimum</div>
                        <div className="text-xs text-muted-foreground font-medium">Deducted from Gigger deposit</div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 rounded-xl p-4 text-center border border-border/50">
                      <div className="text-xs text-muted-foreground mb-1 font-medium">Gigger Deposit</div>
                      <div className="text-sm font-semibold">15% of bid amount</div>
                      <div className="text-xs text-muted-foreground mt-1">Refundable if Digger doesn't accept in 24h</div>
                    </div>

                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-3 w-3 text-accent" />
                        </div>
                        <span>Job is locked to you only</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>No competition after award</span>
                      </li>
                      <li className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>Pay nothing until you accept</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* NON-EXCLUSIVE PRICING FORMULA */}
        <section className="py-16 bg-gradient-to-b from-muted/30 to-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 text-primary mb-3">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Formula</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Non-Exclusive Pricing Details</h2>
              </div>
              <Card className="border-primary/20 shadow-lg">
                <CardContent className="pt-8 pb-8 text-center space-y-6">
                  <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 rounded-2xl p-8 border border-primary/10">
                    <div className="text-lg md:text-xl mb-4">
                      <span className="font-mono font-bold text-primary">
                        Lead Price = Higher of [ (Budget Avg × 3%) ] or [ $20 ]
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rounded to the nearest dollar • <span className="font-semibold">$69 maximum</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    * Prices are subject to change at any time
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* NON-EXCLUSIVE EXAMPLES */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-10">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  <Users className="h-3 w-3 mr-1" />
                  Non-Exclusive
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Pay-Per-Lead Examples</h2>
                <p className="text-muted-foreground">Pricing based on project budget</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {PRICING_EXAMPLES.map((example, i) => (
                  <Card key={i} className="text-center hover-lift border-primary/20" style={{ animationDelay: `${i * 0.1}s` }}>
                    <CardContent className="pt-8 pb-8">
                      <div className="text-sm text-muted-foreground mb-2 font-medium">
                        Project Budget
                      </div>
                      <div className="text-xl font-bold mb-4 text-foreground">
                        {example.budget}
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="text-sm text-muted-foreground mb-1">
                          Average: ${example.average.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          × 3% = ${Math.round(example.average * 0.03)}
                        </div>
                      </div>
                      <div className="text-5xl font-bold text-primary mb-1">
                        ${example.price}
                      </div>
                      {example.note && (
                        <div className="text-sm text-muted-foreground font-medium">
                          {example.note}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* EXCLUSIVE EXAMPLES */}
              <div className="mt-20">
                <div className="text-center mb-10">
                  <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
                    <Award className="h-3 w-3 mr-1" />
                    Exclusive
                  </Badge>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Referral Fee Examples</h2>
                  <p className="text-muted-foreground">8% of your bid — deducted from Gigger's 15% deposit</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="text-center hover-lift border-accent/20">
                    <CardContent className="pt-8 pb-8">
                      <div className="text-sm text-muted-foreground mb-2 font-medium">Your Bid Amount</div>
                      <div className="text-xl font-bold mb-4">$1,000</div>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="text-sm text-muted-foreground mb-1">× 8%</div>
                        <div className="text-sm text-muted-foreground">= $80</div>
                      </div>
                      <div className="text-5xl font-bold text-accent">$80</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center hover-lift border-accent/20">
                    <CardContent className="pt-8 pb-8">
                      <div className="text-sm text-muted-foreground mb-2 font-medium">Your Bid Amount</div>
                      <div className="text-xl font-bold mb-4">$5,000</div>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="text-sm text-muted-foreground mb-1">× 8%</div>
                        <div className="text-sm text-muted-foreground">= $400</div>
                      </div>
                      <div className="text-5xl font-bold text-accent">$400</div>
                    </CardContent>
                  </Card>
                  <Card className="text-center hover-lift border-accent/20">
                    <CardContent className="pt-8 pb-8">
                      <div className="text-sm text-muted-foreground mb-2 font-medium">Your Bid Amount</div>
                      <div className="text-xl font-bold mb-4">$10,000</div>
                      <div className="bg-muted/50 rounded-lg p-3 mb-4">
                        <div className="text-sm text-muted-foreground mb-1">× 8%</div>
                        <div className="text-sm text-muted-foreground">= $800</div>
                      </div>
                      <div className="text-5xl font-bold text-accent">$800</div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Non-acceptance penalty info */}
                <div className="mt-8 p-6 bg-destructive/5 border border-destructive/20 rounded-xl text-center">
                  <div className="text-sm font-semibold text-destructive mb-2">Non-Acceptance Penalty</div>
                  <p className="text-sm text-muted-foreground">
                    If you don't accept an awarded job within 24 hours, or if you decline, you'll be charged a <span className="font-semibold">$100 penalty</span>.
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-8 italic">
                * Prices are subject to change at any time
              </p>
            </div>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 text-primary mb-3">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Lead Details</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  What You Get When You Unlock
                </h2>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Before */}
                <Card className="border-muted hover-lift">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Eye className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-xl">Before You Unlock</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {['Project title', 'Description & requirements', 'Budget range', 'Timeline', 'Location'].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Check className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                {/* After */}
                <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10 hover-lift">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <CardTitle className="text-xl">After You Unlock</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-4">
                      {[
                        { icon: User, label: 'Client name' },
                        { icon: Mail, label: 'Email address' },
                        { icon: Phone, label: 'Phone number' },
                        { icon: FileText, label: 'Full project details' },
                        { icon: Calendar, label: 'Direct contact access' },
                      ].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <item.icon className="h-3.5 w-3.5 text-green-600" />
                          </div>
                          <span className="font-medium">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* REFUND POLICY */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-muted/30 to-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Shield className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Bogus Leads Are Fully Refundable
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                If the contact details are invalid, the client is unreachable, or the project is a scam — you get a full refund. No questions asked.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {[
                  'Invalid contact info',
                  'Client unreachable',
                  'Scam or fake project',
                  'Project cancelled before contact',
                ].map((reason, i) => (
                  <Badge key={i} variant="outline" className="px-4 py-2 bg-background/80 backdrop-blur-sm">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* GUARANTEES */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Our Promise to You
                </h2>
              </div>
              
              <div className="grid sm:grid-cols-3 gap-8">
                {[
                  { icon: DollarSign, title: 'No Subscriptions', desc: 'Pay only for leads you want' },
                  { icon: Clock, title: 'Instant Delivery', desc: 'Leads emailed immediately' },
                  { icon: Shield, title: 'Lead Protection', desc: 'Refunds for bogus leads' },
                ].map((item, i) => (
                  <div key={i} className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-4 shadow-md">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="font-bold text-lg mb-2">{item.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 md:py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5 relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                Ready to Start Getting Leads?
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
                Join Digs & Gigs for free. Pay only when you unlock leads.
              </p>
              <Button 
                variant="hero"
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate("/register?mode=signup&type=digger")}
              >
                Become a Digger — It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </PageLayout>
    </>
  );
}
