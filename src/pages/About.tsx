import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
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
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                About Us
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                A Better Freelance Marketplace
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Connecting talented freelancers with clients who value their work.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-6">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <Badge className="mb-4">💡 Our Mission</Badge>
                  <p className="text-2xl md:text-3xl font-medium text-foreground">
                    To create the most transparent, fair, and opportunity-rich freelance marketplace — where freelancers keep what they earn and consumers find top talent without friction.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center mb-6">
                    <Globe className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <Badge className="mb-4">🌍 Our Vision</Badge>
                  <p className="text-2xl md:text-3xl font-medium text-foreground">
                    A global, accessible platform where freelancers thrive and clients discover exceptional talent fast.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  💖 Our Values
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold">
                  What We Stand For
                </h2>
              </div>
              
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
                {values.map((value, i) => (
                  <Card key={i} className="text-center hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <value.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      
      <Footer />
    </>
  );
}
