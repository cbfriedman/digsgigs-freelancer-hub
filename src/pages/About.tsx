import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Heart,
  Shield,
  Users,
  Zap,
  Globe
} from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function About() {
  const values = [
    {
      icon: Shield,
      title: "Transparency",
      description: "No hidden fees or surprise charges"
    },
    {
      icon: Target,
      title: "Fairness",
      description: "Freelancers should keep their earnings"
    },
    {
      icon: Zap,
      title: "Opportunity",
      description: "Better matching, higher quality projects"
    },
    {
      icon: Users,
      title: "Simplicity",
      description: "No bidding wars, no commissions"
    },
    {
      icon: Heart,
      title: "Community",
      description: "Supporting freelancers as they grow"
    }
  ];

  return (
    <>
      <Helmet>
        <title>About Digs & Gigs — A Better Freelance Marketplace</title>
        <meta name="description" content="Our mission is to build a transparent, commission-free marketplace for freelancers and clients." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-10 sm:py-14 md:py-16 lg:py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-3 sm:mb-4 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
                About Us
              </Badge>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                A Better Freelance Marketplace
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-0 sm:px-2">
                Connecting talented freelancers with clients who value their work.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-10 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 sm:p-6 md:p-8 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 sm:mb-6">
                    <Target className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm">💡 Our Mission</Badge>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-foreground leading-snug">
                    To create the most transparent, fair, and opportunity-rich freelance marketplace — where freelancers keep what they earn and consumers find top talent without friction.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-10 sm:py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 sm:p-6 md:p-8 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-4 sm:mb-6">
                    <Globe className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
                  </div>
                  <Badge className="mb-3 sm:mb-4 text-xs sm:text-sm">🌍 Our Vision</Badge>
                  <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-foreground leading-snug">
                    A global, accessible platform where freelancers thrive and clients discover exceptional talent fast.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-10 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8 sm:mb-10 md:mb-12">
                <Badge className="mb-3 sm:mb-4 bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
                  💖 Our Values
                </Badge>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
                  What We Stand For
                </h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 md:gap-6">
                {values.map((value, i) => {
                  const Icon = value.icon;
                  return (
                    <Card key={i} className="text-center shadow-card hover:shadow-card-hover hover-lift transition-all">
                      <CardContent className="p-4 sm:p-5 md:p-6">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base">{value.title}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{value.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-8 sm:py-10 md:py-12 border-t border-border/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">
              Questions? <a href="/contact" className="text-primary hover:underline font-medium">Contact us</a>.
            </p>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}
