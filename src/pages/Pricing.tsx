import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Crown,
  Rocket,
  DollarSign,
  Lock,
  ArrowRight,
  Briefcase,
  Zap,
  Star,
  MapPin,
  TrendingUp,
  MessageSquare,
  Users,
  Eye,
  Award,
  FileText,
  Mail
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryBrowserWithDescription } from "@/components/CategoryBrowserWithDescription";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Check if user wants to create a profile (from "Create New Profile" button)
  const createProfile = searchParams.get('create') === 'true' || searchParams.get('createProfile') === 'true';

  // If user is logged in and wants to create a profile, show the profile creation form
  if (user && createProfile) {
    return (
      <>
        <Helmet>
          <title>Create New Digger Profile | DigsAndGigs</title>
          <meta name="description" content="Create a new digger profile to start receiving leads for your services." />
        </Helmet>
        <Navigation />
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/my-profiles')}
                  className="mb-4"
                >
                  ← Back to My Profiles
                </Button>
                <h1 className="text-3xl font-bold mb-2">Create New Profile</h1>
                <p className="text-muted-foreground">
                  Set up a new profile to organize your services, target different locations, or market separate specializations.
                </p>
              </div>
              <CategoryBrowserWithDescription />
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Freelancer Pricing — $19 Lifetime Subscription + $10/$25 Leads | Digs & Gigs</title>
        <meta name="description" content="Only 500 Founding Diggers get $19/month forever plus $10/$25 lead pricing for the first year." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                  <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    Limited to the First 500 Diggers
                  </Badge>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                    Founders Get the Lowest Prices We Will Ever Offer
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8">
                    Lock in lifetime subscription pricing and the lowest lead rates for your first year.
                  </p>
                  
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6"
                    onClick={() => navigate("/register?mode=signup&type=digger")}
                  >
                    Claim Your Founders Spot
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                
                <div className="hidden md:flex items-center justify-center">
                  <div className="relative">
                    <div className="w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-primary">$0</div>
                          <div className="text-muted-foreground">for 60 days</div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -top-4 -right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Then $19/mo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Pricing Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  🎁 Subscription Pricing
                </Badge>
              </div>
              
              <Card className="relative border-2 border-primary shadow-2xl">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-4 py-1 text-sm">
                    Free for 60 Days
                  </Badge>
                </div>
                
                <CardHeader className="text-center pt-10 pb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                    <Crown className="h-10 w-10 text-white" />
                  </div>
                  <CardTitle className="text-3xl">Founding Digger Plan</CardTitle>
                </CardHeader>
                
                <CardContent className="text-center pb-8">
                  <div className="mb-8">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl font-bold">$0</span>
                      <span className="text-2xl text-muted-foreground">for 60 days</span>
                    </div>
                    <p className="text-lg text-muted-foreground mt-2">
                      Then <span className="font-semibold text-foreground">$19/month</span> — lifetime guaranteed
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Your subscription price will never increase as long as your account stays active.
                    </p>
                  </div>
                  
                  <Button 
                    size="lg" 
                    className="w-full text-lg py-6"
                    onClick={() => navigate("/register?mode=signup&type=digger")}
                  >
                    Start Free — No Credit Card Required
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Lead Pricing Cards */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  💰 Lead Pricing (First Year Only)
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Lowest Lead Pricing We Will Ever Offer</h2>
                <p className="text-lg text-muted-foreground">
                  (Exclusive to Founding Diggers)
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Standard Leads */}
                <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Standard Leads</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-blue-600">$10</span>
                      <span className="text-muted-foreground">/reveal</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground mb-4">
                      For categories like:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {['Design', 'Writing', 'Admin', 'Video', 'Editing', 'Marketing support', 'General freelancing'].map((category) => (
                        <Badge key={category} variant="secondary" className="bg-blue-500/10 text-blue-700">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                {/* High-Value Leads */}
                <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                      <Briefcase className="h-8 w-8 text-amber-600" />
                    </div>
                    <CardTitle className="text-2xl">High-Value Leads</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-amber-600">$25</span>
                      <span className="text-muted-foreground">/reveal</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground mb-4">
                      For categories like:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {['Web development', 'Software', 'SEO', 'Paid Ads', 'Consulting', 'Accounting', 'Legal', 'Finance'].map((category) => (
                        <Badge key={category} variant="secondary" className="bg-amber-500/10 text-amber-700">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Guarantee badges */}
              <div className="text-center space-y-2 mb-8">
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>These are the lowest lead prices we will ever offer</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Guaranteed for your entire first year</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-5 w-5 text-amber-500" />
                  <span className="text-muted-foreground">Pricing may adjust after year one</span>
                </div>
              </div>
              
              {/* What's Included in Every Lead */}
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold text-center mb-6">📝 What's Included in Every Lead Reveal</h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span>Full name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-green-600" />
                      <span>Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span>Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span>Project description</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Timeline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span>Budget range</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-green-600" />
                      <span>Attachments (if included)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Lifetime Subscription Guarantee Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                  <Badge className="mx-auto mb-4 bg-amber-500/10 text-amber-700 border-amber-500/20">
                    ⭐ For Founding Diggers Only
                  </Badge>
                  <CardTitle className="text-2xl md:text-3xl">Lifetime Subscription Guarantee</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center max-w-3xl mx-auto">
                  <p className="text-lg">
                    Your <span className="font-semibold text-amber-700">$19/month subscription fee is permanently locked for life</span> (only for the first 500 Founders).
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-left mt-6">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Lead pricing is guaranteed for the first 12 months, and may adjust afterward.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">If your account is canceled or lapses, the guarantee expires.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Optional Add-ons */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-purple-500/10 text-purple-600 border-purple-500/20">
                  🔧 Optional Add-Ons
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Boost Your Visibility</h2>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Boosted Profile */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                      <Rocket className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Boosted Profile</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$20</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Top placement in search results.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Featured Badge */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                      <Star className="h-6 w-6 text-amber-600" />
                    </div>
                    <CardTitle className="text-lg">Featured Digger Badge</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$10</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Increase your visibility and click-through rate.
                    </p>
                  </CardContent>
                </Card>
                
                {/* Category Dominance */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <Award className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Category Dominance</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Be showcased as a top expert in your chosen category.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                  🔍 FAQ
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    Are lead prices guaranteed forever?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No. Founders receive $10/$25 lead pricing for their first 12 months. After that, pricing may adjust.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    Will my subscription fee ever increase?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Never. Your $19/month subscription is locked for life as long as your account stays active.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    What happens after the first year?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Your subscription remains $19/month, but lead pricing may change.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">
                    Is there a commission on completed projects?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No. You keep 100% of what you earn. Digs & Gigs never takes a cut of your earnings.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">
                    What happens if I cancel my subscription?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If your subscription lapses or is canceled, the Lifetime Pricing Guarantee expires. If you reactivate later, normal pricing will apply.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">
                    Are refunds offered for bad leads?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. Leads with invalid or non-working contact information are credited back to your account.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Grow Your Business?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join as a Founding Digger and lock in the lowest prices we'll ever offer.
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
      </div>
      
      <Footer />
    </>
  );
}
