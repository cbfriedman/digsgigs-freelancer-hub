import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO_CITIES, getCityBySlug } from "@/config/seoCities";
import { INDUSTRY_SPECIALTIES } from "@/utils/industrySpecialties";
import { 
  MapPin, 
  Star, 
  Users, 
  ArrowRight,
  Shield,
  Phone
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CityLandingPage() {
  const { city } = useParams<{ city: string }>();
  
  // Debug log
  console.log("CityLandingPage rendered, city param:", city);
  
  const cityInfo = city ? getCityBySlug(city) : null;
  
  // Fetch local diggers count
  const { data: diggerCount } = useQuery({
    queryKey: ['digger-count-city', city],
    queryFn: async () => {
      if (!cityInfo) return 0;
      const { count } = await supabase
        .from('digger_profiles')
        .select('*', { count: 'exact', head: true })
        .ilike('location', `%${cityInfo.city}%`);
      return count || 0;
    },
    enabled: !!cityInfo
  });

  if (!cityInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">City not found</h1>
          <p className="text-muted-foreground mt-2">The requested city could not be found.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Get top services for this city - take services from Construction & Home Services first
  const constructionServices = INDUSTRY_SPECIALTIES["Construction & Home Services"] || [];
  const topServices = constructionServices.slice(0, 6).length >= 6 
    ? constructionServices.slice(0, 6)
    : [
        ...constructionServices,
        ...Object.values(INDUSTRY_SPECIALTIES).flat().slice(0, 6 - constructionServices.length)
      ].slice(0, 6);
  
  const pageTitle = `Find Contractors in ${cityInfo.city}, ${cityInfo.state} | Digs and Gigs`;
  const pageDescription = `Looking for contractors in ${cityInfo.city}, ${cityInfo.state}? Browse verified service providers on Digs and Gigs. Find plumbers, electricians, HVAC, home improvement, and more. Free quotes available.`;
  const canonicalUrl = `https://digsandgigs.com/contractors-in-${cityInfo.slug}`;

  // Structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `Contractors in ${cityInfo.city}, ${cityInfo.state}`,
    "description": pageDescription,
    "provider": {
      "@type": "Organization",
      "name": "DigsandGigs",
      "url": "https://digsandgigs.com"
    },
    "areaServed": {
      "@type": "City",
      "name": cityInfo.city,
      "addressRegion": cityInfo.state,
      "addressCountry": "US"
    }
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How do I find contractors in ${cityInfo.city}, ${cityInfo.state}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `DigsandGigs makes it easy to find contractors in ${cityInfo.city}. Simply post your project for free, and you'll receive quotes from multiple verified local professionals. You can also browse our directory of contractors in ${cityInfo.city}.`
        }
      },
      {
        "@type": "Question",
        "name": `Are contractors in ${cityInfo.city} licensed and insured?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Many contractors on DigsandGigs are licensed, insured, and bonded. Look for verification badges on their profiles and always confirm credentials before hiring. We recommend checking with ${cityInfo.state} licensing boards for verification.`
        }
      },
      {
        "@type": "Question",
        "name": `How much do contractors charge in ${cityInfo.city}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Contractor rates in ${cityInfo.city} vary based on the type of service, project scope, and professional experience. Post your project for free to receive multiple quotes from local contractors and compare prices.`
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`contractors in ${cityInfo.city}, ${cityInfo.city} contractors, find contractors ${cityInfo.city}, local contractors ${cityInfo.city} ${cityInfo.state}`} />
        <link rel="canonical" href={canonicalUrl} />
        
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqData)}
        </script>
      </Helmet>

      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li><Link to="/" className="hover:text-primary">Home</Link></li>
            <li>/</li>
            <li className="text-foreground">Contractors in {cityInfo.city}, {cityInfo.state}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-4">{cityInfo.state}</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Find Contractors in {cityInfo.city}, {cityInfo.state}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Connect with trusted contractors and service professionals in {cityInfo.city}. 
                Get free quotes, compare options, and hire with confidence.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span><strong>{diggerCount || 'Multiple'}</strong> professionals available</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-primary" />
                  <span>Average rating: <strong>4.8/5</strong></span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Serving all of {cityInfo.city}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link to="/post-gig">
                  <Button size="lg" className="gap-2">
                    Get Free Quotes <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/browse-diggers">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Users className="h-4 w-4" /> Browse Contractors
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Why Choose DigsandGigs for Contractors in {cityInfo.city}?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Verified Professionals</h3>
                <p className="text-sm text-muted-foreground">
                  All contractors are vetted for quality and reliability. Many are licensed, insured, and bonded.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Star className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Real Reviews</h3>
                <p className="text-sm text-muted-foreground">
                  Read authentic reviews from homeowners in {cityInfo.city} who have hired through our platform.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Phone className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Free Quotes</h3>
                <p className="text-sm text-muted-foreground">
                  Get multiple quotes from contractors in {cityInfo.city} to compare prices and find the best fit.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Popular Services */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Services in {cityInfo.city}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {topServices.map((service) => {
              const serviceSlug = service.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              return (
                <Link 
                  key={service} 
                  to={`/services/${serviceSlug}/${cityInfo.slug}`}
                  className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                >
                  <span className="text-sm font-medium">{service}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">How do I find contractors in {cityInfo.city}, {cityInfo.state}?</h3>
                <p className="text-muted-foreground">
                  DigsandGigs makes it easy to find contractors in {cityInfo.city}. Simply post your project 
                  for free, and you'll receive quotes from multiple verified local professionals. You can also 
                  browse our directory of contractors in {cityInfo.city}.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Are contractors in {cityInfo.city} licensed and insured?</h3>
                <p className="text-muted-foreground">
                  Many contractors on DigsandGigs are licensed, insured, and bonded. Look for verification 
                  badges on their profiles and always confirm credentials before hiring. We recommend checking 
                  with {cityInfo.state} licensing boards for verification.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">How much do contractors charge in {cityInfo.city}?</h3>
                <p className="text-muted-foreground">
                  Contractor rates in {cityInfo.city} vary based on the type of service, project scope, and 
                  professional experience. Post your project for free to receive multiple quotes from local 
                  contractors and compare prices.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Find Contractors in {cityInfo.city}?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Post your project for free and receive quotes from verified local professionals. 
            Compare options and hire with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/post-gig">
              <Button size="lg">Post Your Project Free</Button>
            </Link>
            <Link to="/browse-diggers">
              <Button size="lg" variant="outline">Browse Contractors</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
