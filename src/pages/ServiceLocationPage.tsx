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
  Clock, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  Phone,
  Users,
  Award,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Helper to get service info from slug
const getServiceFromSlug = (slug: string) => {
  for (const [industry, specialties] of Object.entries(INDUSTRY_SPECIALTIES)) {
    for (const specialty of specialties) {
      const serviceSlug = specialty.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (serviceSlug === slug) {
        return { name: specialty, industry };
      }
    }
  }
  return null;
};

// Get related services from the same industry
const getRelatedServices = (industry: string, currentService: string): string[] => {
  const specialties = INDUSTRY_SPECIALTIES[industry] || [];
  return specialties.filter(s => s !== currentService).slice(0, 6);
};

// Get nearby cities
const getNearbyCities = (currentSlug: string) => {
  const currentIndex = SEO_CITIES.findIndex(c => c.slug === currentSlug);
  const nearby = [];
  for (let i = -3; i <= 3; i++) {
    const idx = currentIndex + i;
    if (idx >= 0 && idx < SEO_CITIES.length && idx !== currentIndex) {
      nearby.push(SEO_CITIES[idx]);
    }
  }
  return nearby.slice(0, 6);
};

export default function ServiceLocationPage() {
  const { service, city } = useParams<{ service: string; city: string }>();
  
  const serviceInfo = service ? getServiceFromSlug(service) : null;
  const cityInfo = city ? getCityBySlug(city) : null;
  
  // Fetch local diggers count
  const { data: diggerCount } = useQuery({
    queryKey: ['digger-count', service, city],
    queryFn: async () => {
      if (!serviceInfo || !cityInfo) return 0;
      const { count } = await supabase
        .from('digger_profiles')
        .select('*', { count: 'exact', head: true })
        .or(`profession.ilike.%${serviceInfo.name}%,keywords.cs.{${serviceInfo.name}}`)
        .ilike('location', `%${cityInfo.city}%`);
      return count || 0;
    },
    enabled: !!serviceInfo && !!cityInfo
  });

  // Fetch recent gigs count
  const { data: gigCount } = useQuery({
    queryKey: ['gig-count', service, city],
    queryFn: async () => {
      if (!serviceInfo || !cityInfo) return 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .ilike('title', `%${serviceInfo.name}%`)
        .ilike('location', `%${cityInfo.city}%`)
        .gte('created_at', thirtyDaysAgo.toISOString());
      return count || 0;
    },
    enabled: !!serviceInfo && !!cityInfo
  });

  if (!serviceInfo || !cityInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="text-muted-foreground mt-2">The requested service or location could not be found.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedServices = getRelatedServices(serviceInfo.industry, serviceInfo.name);
  const nearbyCities = getNearbyCities(city!);
  
  const pageTitle = `${serviceInfo.name} in ${cityInfo.city}, ${cityInfo.state} | Find Local Pros`;
  const pageDescription = `Find trusted ${serviceInfo.name.toLowerCase()} professionals in ${cityInfo.city}, ${cityInfo.state}. Compare quotes, read reviews, and hire the best local pros. Free estimates available.`;
  const canonicalUrl = `https://digsandgigs.com/services/${service}/${city}`;

  // Generate structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${serviceInfo.name} Services in ${cityInfo.city}`,
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
    },
    "serviceType": serviceInfo.name,
    "category": serviceInfo.industry
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How much does ${serviceInfo.name.toLowerCase()} cost in ${cityInfo.city}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${serviceInfo.name} costs in ${cityInfo.city} vary based on project scope and complexity. Get free quotes from multiple local professionals to compare prices and find the best value.`
        }
      },
      {
        "@type": "Question",
        "name": `How do I find a reliable ${serviceInfo.name.toLowerCase()} professional in ${cityInfo.city}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `DigsandGigs connects you with verified ${serviceInfo.name.toLowerCase()} professionals in ${cityInfo.city}. Browse profiles, read reviews, compare quotes, and hire with confidence.`
        }
      },
      {
        "@type": "Question",
        "name": `Are ${serviceInfo.name.toLowerCase()} professionals on DigsandGigs licensed and insured?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Many professionals on DigsandGigs are licensed, insured, and bonded. Look for verification badges on profiles and always confirm credentials before hiring.`
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`${serviceInfo.name}, ${cityInfo.city}, ${cityInfo.state}, local professionals, hire, quotes, ${serviceInfo.industry}`} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        
        {/* Structured Data */}
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
            <li><Link to="/browse-diggers" className="hover:text-primary">Services</Link></li>
            <li>/</li>
            <li><Link to={`/services/${service}`} className="hover:text-primary">{serviceInfo.name}</Link></li>
            <li>/</li>
            <li className="text-foreground">{cityInfo.city}, {cityInfo.state}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-4">{serviceInfo.industry}</Badge>
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                {serviceInfo.name} in {cityInfo.city}, {cityInfo.state}
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Connect with trusted {serviceInfo.name.toLowerCase()} professionals in {cityInfo.city}. 
                Get free quotes, compare options, and hire with confidence.
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span><strong>{diggerCount || 'Multiple'}</strong> professionals available</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span><strong>{gigCount || '10+'}</strong> recent projects</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Average response: <strong>2 hours</strong></span>
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
                    <Users className="h-4 w-4" /> Browse Professionals
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Stats Card */}
            <Card className="w-full lg:w-80 shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {cityInfo.city} Market
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active Pros</span>
                  <span className="font-semibold">{diggerCount || '5+'}+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg. Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">4.8</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-semibold">~2 hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Jobs This Month</span>
                  <span className="font-semibold">{gigCount || '10'}+</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Choose Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Why Choose DigsandGigs for {serviceInfo.name}?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Shield className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">Verified Professionals</h3>
                <p className="text-sm text-muted-foreground">
                  All professionals are vetted for quality and reliability. Many are licensed, insured, and bonded.
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
                  Get multiple quotes from {serviceInfo.name.toLowerCase()} pros to compare prices and find the best fit.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">How much does {serviceInfo.name.toLowerCase()} cost in {cityInfo.city}?</h3>
                <p className="text-muted-foreground">
                  {serviceInfo.name} costs in {cityInfo.city} vary based on project scope, complexity, and the professional's experience. 
                  We recommend getting 3-5 quotes to compare prices. Post your project for free to receive quotes from local pros.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">How do I find a reliable {serviceInfo.name.toLowerCase()} professional?</h3>
                <p className="text-muted-foreground">
                  DigsandGigs makes it easy to find trusted professionals. Browse profiles, read reviews from other {cityInfo.city} 
                  residents, check credentials, and compare quotes before making your decision.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Are professionals licensed and insured?</h3>
                <p className="text-muted-foreground">
                  Many {serviceInfo.name.toLowerCase()} professionals on DigsandGigs are licensed, insured, and bonded. 
                  Look for verification badges on their profiles and always confirm credentials before hiring.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Related Services in {cityInfo.city}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {relatedServices.map((svc) => {
                const svcSlug = svc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                return (
                  <Link 
                    key={svc} 
                    to={`/services/${svcSlug}/${city}`}
                    className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    <span className="text-sm font-medium">{svc}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Nearby Cities */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{serviceInfo.name} in Nearby Cities</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {nearbyCities.map((c) => (
              <Link 
                key={c.slug} 
                to={`/services/${service}/${c.slug}`}
                className="p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
              >
                <span className="text-sm font-medium">{c.city}, {c.state}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Find Your {serviceInfo.name} Pro in {cityInfo.city}?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Post your project for free and receive quotes from verified local professionals. 
            Compare options and hire with confidence.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/post-gig">
              <Button size="lg">Post Your Project Free</Button>
            </Link>
            <Link to="/digger-registration">
              <Button size="lg" variant="outline">Join as a Pro</Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
