import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  DollarSign,
  ArrowRight,
  Award,
  Users,
  MessageSquare,
  Star,
  Zap,
  Gift
} from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function FoundingDigger() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Founding Digger Program — Lowest Lead Pricing Ever | Digs & Gigs</title>
        <meta name="description" content="Join the first 500 Diggers to lock in the lowest lead pricing we will ever offer and a $19/month lifetime subscription." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-amber-500/10 via-background to-primary/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
                <Crown className="h-3 w-3 mr-1" />
                🌟 Founding Digger Program
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Only 500 Spots Available
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Become one of the first 500 freelancers to join Digs & Gigs and unlock benefits that will never be offered again.
              </p>
              
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate("/register?mode=signup&type=digger")}
              >
                Start Free for 60 Days
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  🎁 Your Founder Benefits
                </Badge>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Benefit 1 */}
                <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                      <Gift className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-xl">1. Free for 60 Days</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Try everything, no credit card required.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Benefit 2 */}
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <DollarSign className="h-8 w-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-xl">2. $19/month — Locked for Life</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Your price will never increase as long as your account stays active.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Benefit 3 */}
                <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <Zap className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl">3. Lowest Lead Pricing Ever</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-muted-foreground">
                    <p className="mb-2"><strong className="text-foreground">$10</strong> standard leads</p>
                    <p className="mb-2"><strong className="text-foreground">$25</strong> high-value leads</p>
                    <p className="text-sm">Guaranteed for your first 12 months. Pricing may adjust afterward.</p>
                  </CardContent>
                </Card>
                
                {/* Benefit 4 */}
                <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                      <Star className="h-8 w-8 text-purple-600" />
                    </div>
                    <CardTitle className="text-xl">4. Priority Digger Ranking</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Show up higher in client searches.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Benefit 5 */}
                <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                      <Award className="h-8 w-8 text-orange-600" />
                    </div>
                    <CardTitle className="text-xl">5. Founding Digger Badge</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Stand out instantly among freelancers.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Benefit 6 */}
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">6. Unlimited Everything</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center text-muted-foreground">
                    <p>Unlimited categories</p>
                    <p>Unlimited service areas</p>
                    <p>Unlimited matches</p>
                    <p>Unlimited messages</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Why We Created This */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                🤝 Why We Created This Program
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                We Want to Reward Early Adopters
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                We want to reward the freelancers who help us build and grow the platform. These early benefits will never be offered again.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8 text-center">
                  <Crown className="h-16 w-16 text-primary mx-auto mb-6" />
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    🚀 Become a Founding Digger Now
                  </h2>
                  <p className="text-xl text-muted-foreground mb-8">
                    Don't miss your chance to lock in lifetime pricing and the lowest lead rates.
                  </p>
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => navigate("/register?mode=signup&type=digger")}
                  >
                    Start Free for 60 Days
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}
