import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/components/StructuredData";
import {
  HeroSection,
  HowItWorksSection,
  PricingPreviewSection,
  TrustSection,
  FinalCTASection
} from "@/components/landing";

const Index = () => {
  return (
    <div data-page="home" className="min-h-screen bg-background">
      <SEOHead
        title="Freelancer Leads & Client Gigs | Pay Per Lead or When Awarded | Digs & Gigs"
        description="For freelancers (Diggers): get leads by email, pay per lead or when awarded. For clients (Giggers): post gigs, get bids, hire talent. No subscriptions."
        keywords="freelance leads, pay per lead, freelancer leads, client gigs, post gig, hire freelancer, Digger, Gigger, lead marketplace"
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            generateOrganizationSchema(),
            generateWebsiteSchema()
          ]
        }}
      />
      
      <HeroSection />
      <HowItWorksSection />
      <PricingPreviewSection />
      <TrustSection />
      <FinalCTASection />
      <Footer />
    </div>
  );
};

export default Index;
