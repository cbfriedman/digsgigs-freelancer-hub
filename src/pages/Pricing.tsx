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
  Wrench,
  Briefcase,
  Zap,
  Star,
  MapPin,
  TrendingUp,
  MessageSquare,
  Users,
  Eye,
  Award
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
        <title>Founding Digger Pricing — Free for 60 Days | DigsAndGigs</title>
        <meta name="description" content="Join as a Founding Digger. Free 60-day trial, then just $19/month. Flat-rate leads at $10-$25. No commissions. No bidding wars. Locked-in pricing forever." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                  <Badge className="mb-4 bg-green-500/10 text-green-600 border-green-500/20">
                    <Crown className="h-3 w-3 mr-1" />
                    Limited Time Offer
                  </Badge>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                    Founding Digger Pricing
                    <span className="block text-primary">Join Today. Free for 60 Days.</span>
                  </h1>
                  <p className="text-xl text-muted-foreground mb-4">
                    Get matched with real customers in your service area. No commissions. No bidding wars. No risk.
                  </p>
                  <p className="text-lg text-muted-foreground/80 mb-8">
                    Get matched with real customers in your service area. No commissions. No bidding wars. Zero risk.
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

        {/* Value Proposition Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Built for Professionals. Priced for Growth.
                </h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                  Digs & Gigs is a new marketplace connecting homeowners ("Giggers") with verified service professionals ("Diggers").
                  For a limited time, early members receive exclusive benefits.
                </p>
              </div>
              
              {/* 3-Column Value Props */}
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Rocket className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Fast Start</h3>
                  <p className="text-muted-foreground">Get matched with leads immediately after signing up</p>
                </div>
                
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Low Cost</h3>
                  <p className="text-muted-foreground">$10-$25 flat-rate leads with no hidden fees</p>
                </div>
                
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Locked-In Pricing</h3>
                  <p className="text-muted-foreground">Your rate never increases — guaranteed forever</p>
                </div>
              </div>
              
              {/* Founding Benefits List */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Free 60-day subscription</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>$10 flat-rate standard leads</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>$25 flat-rate high-value leads</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Priority ranking in your ZIP codes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Founding Digger badge</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Locked-in pricing — your rate never increases</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited categories — grow your services without upgrading</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-center mt-8">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => navigate("/register?mode=signup&type=digger")}
                >
                  Claim Founding Digger Access
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Single Subscription Card */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Founding Digger Plan</h2>
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
                  <CardDescription className="text-lg">
                    Everything you need to grow your business
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center pb-8">
                  <div className="mb-8">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl font-bold">$0</span>
                      <span className="text-2xl text-muted-foreground">for 60 days</span>
                    </div>
                    <p className="text-lg text-muted-foreground mt-2">
                      then <span className="font-semibold text-foreground">$19/month</span> (lifetime guaranteed)
                    </p>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4 text-left mb-8">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited categories</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited ZIP codes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited matches</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited messages</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Unlimited profile visibility</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Priority ranking</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-amber-500 flex-shrink-0" />
                      <span>Founding Digger badge</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Access to flat-rate lead pricing</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-6">Cancel anytime. No questions asked.</p>
                  
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Flat-Rate Lead Pricing</h2>
                <p className="text-lg text-muted-foreground mb-2">
                  Pay only when you want the customer's contact details.
                </p>
                <p className="text-muted-foreground">
                  No bidding wars. No per-lead penalties. No commitments.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Standard Leads */}
                <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <Wrench className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">Standard Leads</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-4">
                      <span className="text-5xl font-bold text-blue-600">$10</span>
                      <span className="text-muted-foreground">/reveal</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-muted-foreground mb-4">
                      For service categories like:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {['Handyman', 'Plumbing', 'Electrical', 'HVAC', 'Painting', 'Landscaping', 'Moving', 'Cleaning'].map((category) => (
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
                      For professional categories like:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {['Mortgage', 'Credit Repair', 'Insurance', 'Legal', 'CPA', 'Business Consulting'].map((category) => (
                        <Badge key={category} variant="secondary" className="bg-amber-500/10 text-amber-700">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* What's Included */}
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold text-center mb-6">What you get with every lead reveal:</h3>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span>Full name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <span>Phone number</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-green-600" />
                      <span>Email address</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <span>ZIP code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-green-600" />
                      <span>Project description</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Timeframe</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span>Budget (if provided)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-600" />
                      <span>No commitments</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Lifetime Pricing Guarantee Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                <CardHeader className="text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8 text-amber-600" />
                  </div>
                  <Badge className="mx-auto mb-4 bg-amber-500/10 text-amber-700 border-amber-500/20">
                    For Founding Diggers Only
                  </Badge>
                  <CardTitle className="text-2xl md:text-3xl">Lifetime Pricing Guarantee</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-center max-w-3xl mx-auto">
                  <p className="text-lg">
                    As a Founding Digger, your subscription price is <span className="font-semibold text-amber-700">permanently locked at $19/month</span> for the life of your account.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 text-left mt-6">
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Your subscription rate will never increase as long as you remain an active, paying member.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">This guarantee applies only to the subscription fee, not to optional lead purchases or future add-on services.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Future pricing tiers (Local, Statewide, Nationwide) may be introduced for new members, but Founding Diggers remain on the guaranteed $19/month plan permanently.</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <Lock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">If your subscription lapses or is canceled, the Lifetime Pricing Guarantee expires and future pricing will apply.</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Comparison Table */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing at a Glance</h2>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Feature</TableHead>
                        <TableHead className="text-center">Founding Digger Plan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Subscription</TableCell>
                        <TableCell className="text-center">Free 60 days → $19/mo</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Lead Reveal (Standard)</TableCell>
                        <TableCell className="text-center">$10</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Lead Reveal (High-Value)</TableCell>
                        <TableCell className="text-center">$25</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Messaging</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">Unlimited</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Matches</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">Unlimited</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Categories</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">Unlimited</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">ZIP Codes</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">Unlimited</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Priority Ranking</TableCell>
                        <TableCell className="text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Profile Visibility</TableCell>
                        <TableCell className="text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Founding Badge</TableCell>
                        <TableCell className="text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Add-ons</TableCell>
                        <TableCell className="text-center text-muted-foreground">Optional</TableCell>
                      </TableRow>
                      <TableRow className="bg-amber-500/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-amber-600" />
                            <span>Lifetime Pricing Guarantee</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Your subscription will remain $19/month for life as long as your account stays active.
                            <br />
                            <span className="text-amber-600">(Lead pricing and future add-ons not included.)</span>
                          </p>
                        </TableCell>
                        <TableCell className="text-center"><Check className="h-5 w-5 text-green-600 mx-auto" /></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Optional Add-ons */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Optional Add-Ons</h2>
                <p className="text-lg text-muted-foreground">
                  Boost your visibility and stand out from the competition
                </p>
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
                      Appear at the top of search results in your ZIP codes
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
                      Stand out with enhanced trust signals
                    </p>
                  </CardContent>
                </Card>
                
                {/* ZIP Code Dominance */}
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <MapPin className="h-6 w-6 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">ZIP Code Dominance</CardTitle>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">$49</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">
                      Lock in premium visibility for up to 3 ZIP codes
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-left">
                    Why is pricing so low during launch?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    We want to reward early professionals and build the strongest possible supply base. 
                    Prices for Founding Diggers are locked permanently — you'll never pay more than these rates.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-left">
                    Will subscription pricing increase for Founders?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Never. As a Founding Digger, your $19/month rate is locked in forever. Even when we 
                    raise prices for new members, you'll keep your original rate.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-left">
                    What happens after 60 days?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Your plan renews at $19/month unless canceled. You can cancel anytime during your 
                    free trial with no charge. We'll send you a reminder before your trial ends.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-left">
                    How do lead reveals work?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    When a Gigger (homeowner) posts a job, you're matched automatically based on your 
                    categories and service area. You can view job details for free. If you want the 
                    customer's contact details, you pay one flat-rate fee ($10 or $25) to reveal them.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-left">
                    Are there refunds for bad leads?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Yes. Leads with invalid contact info (wrong number, fake email, etc.) are credited 
                    back to your account. Just report the issue within 7 days and we'll review it.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-6">
                  <AccordionTrigger className="text-left">
                    Can I cancel anytime?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    Absolutely. There are no long-term contracts. Cancel anytime from your account 
                    settings with no cancellation fees or penalties.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-7">
                  <AccordionTrigger className="text-left">
                    Do I need a credit card to start?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No credit card is required to start your free 60-day trial. You can explore the 
                    platform and start receiving leads risk-free. A payment method is only needed 
                    after your trial ends if you choose to continue.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-8">
                  <AccordionTrigger className="text-left">
                    Will my monthly subscription ever increase?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No. As a Founding Digger, your subscription is permanently locked at $19/month for life 
                    as long as your account stays active. This replaces all future Local, Statewide, and 
                    Nationwide subscription pricing for you.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-9">
                  <AccordionTrigger className="text-left">
                    Does the Lifetime Pricing Guarantee include lead prices?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    No. Lead pricing, high-value lead categories, and future add-on services may change 
                    over time as we introduce new features and improve lead quality. Only the monthly 
                    subscription is guaranteed for life.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-10">
                  <AccordionTrigger className="text-left">
                    What happens if I cancel?
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    If your subscription is canceled or lapses, the Lifetime Pricing Guarantee expires. 
                    When you return, you'll be subject to the current pricing available at that time.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Get More Customers Without Paying Per Lead?
              </h2>
              <p className="text-xl opacity-90 mb-4">
                Become a Founding Digger today and never pay full price again.
              </p>
              <p className="text-lg opacity-75 mb-8">
                Founding Digger pricing is only available for a limited time.
              </p>
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90"
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
