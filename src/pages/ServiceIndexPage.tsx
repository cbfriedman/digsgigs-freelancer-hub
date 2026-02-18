import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEO_CITIES } from "@/config/seoCities";
import { INDUSTRY_SPECIALTIES } from "@/utils/industrySpecialties";
import { MapPin, ArrowRight, Users, Star, Building2 } from "lucide-react";

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
  return specialties.filter(s => s !== currentService);
};

export default function ServiceIndexPage() {
  const { service } = useParams<{ service: string }>();
  
  const serviceInfo = service ? getServiceFromSlug(service) : null;
  
  if (!serviceInfo) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">Service not found</h1>
          <p className="text-muted-foreground mt-2">The requested service could not be found.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedServices = getRelatedServices(serviceInfo.industry, serviceInfo.name);
  const topCities = SEO_CITIES.slice(0, 50);
  
  const pageTitle = `Find ${serviceInfo.name} Professionals Near You | DigsandGigs`;
  const pageDescription = `Connect with trusted ${serviceInfo.name.toLowerCase()} professionals in your area. Compare quotes, read reviews, and hire the best local pros. Available in 100+ US cities.`;
  const canonicalUrl = `https://digsandgigs.com/services/${service}`;

  // Structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${serviceInfo.name} Services`,
    "description": pageDescription,
    "provider": {
      "@type": "Organization",
      "name": "DigsandGigs",
      "url": "https://digsandgigs.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "serviceType": serviceInfo.name,
    "category": serviceInfo.industry
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={`${serviceInfo.name}, local professionals, hire, quotes, ${serviceInfo.industry}`} />
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
      </Helmet>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <Badge variant="secondary" className="mb-4">{serviceInfo.industry}</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Find {serviceInfo.name} Professionals
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl">
            Connect with trusted {serviceInfo.name.toLowerCase()} professionals in your area. 
            Get free quotes, compare options, and hire with confidence.
          </p>
          
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
        </section>

        {/* Stats Section */}
        <section className="mb-12 grid md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">100+</div>
              <div className="text-sm text-muted-foreground">Cities Covered</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">1,000+</div>
              <div className="text-sm text-muted-foreground">Active Professionals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">4.8</div>
              <div className="text-sm text-muted-foreground">Average Rating</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm text-muted-foreground">States Covered</div>
            </CardContent>
          </Card>
        </section>

        {/* Cities Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">
            Find {serviceInfo.name} by City
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {topCities.map((city) => (
              <Link 
                key={city.slug} 
                to={`/services/${service}/${city.slug}`}
                className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{city.city}, {city.state}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Related Services */}
        {relatedServices.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Related {serviceInfo.industry} Services</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {relatedServices.map((svc) => {
                const svcSlug = svc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                return (
                  <Link 
                    key={svc} 
                    to={`/services/${svcSlug}`}
                    className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    <span className="text-sm font-medium">{svc}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="bg-primary/10 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Need {serviceInfo.name} Help?
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
