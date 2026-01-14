import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
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
  Zap
} from "lucide-react";
import { Helmet } from "react-helmet-async";

// Dynamic pricing examples
const PRICING_EXAMPLES = [
  { budget: "$1,000–$1,500", average: 1250, price: 35, note: "(minimum)" },
  { budget: "$1,500–$2,500", average: 2000, price: 50, note: "" },
  { budget: "$5,000–$10,000", average: 7500, price: 65, note: "(cap)" },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Simple, Fair Pricing — Based on Project Size | Digs & Gigs</title>
        <meta name="description" content="Lead price = 3% of project's average budget. $35 minimum, $65 maximum. No subscriptions, no commissions. Bogus leads are fully refundable." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* HERO SECTION */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1">
                <DollarSign className="h-3 w-3 mr-1" />
                Pay Per Lead
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Simple, fair pricing —
                <br />
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  based on project size
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                No subscriptions. No commissions. One-time payment per lead.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING FORMULA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-primary shadow-lg">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">How Lead Pricing Works</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                  <div className="bg-muted/50 rounded-xl p-6">
                    <div className="text-lg mb-4">
                      <span className="font-mono font-bold text-primary">
                        Lead Price = (Min Budget + Max Budget) ÷ 2 × 3%
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rounded to the nearest dollar
                    </div>
                  </div>

                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">$35</div>
                      <div className="text-sm text-muted-foreground">Minimum</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">$65</div>
                      <div className="text-sm text-muted-foreground">Maximum</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* EXAMPLES */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-8">Pricing Examples</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                {PRICING_EXAMPLES.map((example, i) => (
                  <Card key={i} className="text-center">
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-2">
                        Project Budget
                      </div>
                      <div className="text-lg font-semibold mb-4">
                        {example.budget}
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        Average: ${example.average.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        × 3% = ${Math.round(example.average * 0.03)}
                      </div>
                      <div className="text-4xl font-bold text-primary">
                        ${example.price}
                      </div>
                      {example.note && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {example.note}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHAT'S INCLUDED */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                What You Get When You Unlock a Lead
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Before */}
                <Card className="border-muted">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Eye className="h-5 w-5 text-muted-foreground" />
                      Before You Unlock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Project title</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Description & requirements</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Budget range</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Timeline</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-muted-foreground" />
                        <span>Location</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                {/* After */}
                <Card className="border-green-500/30 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      After You Unlock
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3">
                        <User className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Client name</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Email address</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Phone number</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Full project details</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Direct contact access</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* REFUND POLICY */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Bogus Leads Are Fully Refundable
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                If the contact details are invalid, the client is unreachable, or the project is a scam — you get a full refund. No questions asked.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Badge variant="outline" className="px-4 py-2">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Invalid contact info
                </Badge>
                <Badge variant="outline" className="px-4 py-2">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Client unreachable
                </Badge>
                <Badge variant="outline" className="px-4 py-2">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Scam or fake project
                </Badge>
                <Badge variant="outline" className="px-4 py-2">
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Project cancelled before contact
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* GUARANTEES */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">
                Our Promise to You
              </h2>
              
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-semibold mb-1">No Subscriptions</div>
                  <div className="text-sm text-muted-foreground">
                    Pay only for leads you want
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-semibold mb-1">No Commissions</div>
                  <div className="text-sm text-muted-foreground">
                    Keep 100% of what you earn
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-semibold mb-1">Instant Delivery</div>
                  <div className="text-sm text-muted-foreground">
                    Leads emailed immediately
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-semibold mb-1">Lead Protection</div>
                  <div className="text-sm text-muted-foreground">
                    Refunds for bogus leads
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-20 bg-gradient-to-br from-primary/10 to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Start Getting Leads?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Join Digs & Gigs for free. Pay only when you unlock leads.
              </p>
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => navigate("/register?mode=signup&type=digger")}
              >
                Become a Digger — It's Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
