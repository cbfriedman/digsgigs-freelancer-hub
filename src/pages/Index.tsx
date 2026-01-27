import { useState } from "react";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateOrganizationSchema, generateWebsiteSchema } from "@/components/StructuredData";
import AIChatbot from "@/components/AIChatbot";
import {
  HomepageNavbar,
  HeroSection,
  HowItWorksSection,
  PricingPreviewSection,
  TrustSection,
  FinalCTASection
} from "@/components/landing";

const Index = () => {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Freelance Leads, Delivered Instantly | Digs & Gigs"
        description="Get freelance leads emailed directly to you. Pay only for leads you want. No subscriptions. Dynamic pricing based on project size."
        keywords="freelance leads, pay per lead, freelancer marketplace"
        structuredData={{
          "@context": "https://schema.org",
          "@graph": [
            generateOrganizationSchema(),
            generateWebsiteSchema()
          ]
        }}
      />
      
      <HomepageNavbar onChatOpen={() => setChatOpen(true)} />
      <HeroSection />
      <HowItWorksSection />
      <PricingPreviewSection />
      <TrustSection />
      <FinalCTASection />
      <Footer />
      
      <AIChatbot isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
};

export default Index;
