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
    <div data-page="home" className="min-h-screen bg-background w-full min-w-0 max-w-full overflow-x-hidden">
      <SEOHead
        title="Freelancer Leads & Client Gigs | Pay Per Lead or When Awarded | Digs & Gigs"
        description="Clients post projects; freelancers get leads by email and bid. You don’t pay to help—you pay to unlock a lead, then get paid when you win. Digger = freelancer, Gigger = client. No subscriptions."
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
