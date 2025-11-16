import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate("/")}
          >
            digsandgigs
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
              <p className="text-muted-foreground">
                By accessing or using DiggsAndGiggs ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Platform Description</h2>
              <p className="text-muted-foreground mb-3">
                DiggsAndGiggs is a marketplace connecting service providers ("Diggers") with clients ("Consumers") seeking professional services. The Platform facilitates:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Posting of service requests ("Gigs") by Consumers</li>
                <li>Discovery and purchase of leads by Diggers</li>
                <li>Direct communication between parties after lead purchase</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
              <h3 className="text-lg font-semibold mb-2">3.1 Account Creation</h3>
              <p className="text-muted-foreground mb-3">
                You must create an account to use certain features. You agree to provide accurate, current information and maintain the security of your account credentials.
              </p>
              <h3 className="text-lg font-semibold mb-2">3.2 Account Types</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Consumer Accounts:</strong> Free to create. Used for posting gigs and browsing digger profiles.</li>
                <li><strong>Digger Accounts:</strong> Free to create. Used for browsing gigs and purchasing leads.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. For Consumers (Gig Posters)</h2>
              <h3 className="text-lg font-semibold mb-2">4.1 Posting Gigs</h3>
              <p className="text-muted-foreground mb-3">
                Consumers may post gigs free of charge. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide accurate project information</li>
                <li>Include realistic budget estimates</li>
                <li>Respond to diggers who purchase your lead</li>
                <li>Not discriminate based on protected characteristics</li>
                <li>Not use the Platform for illegal purposes</li>
              </ul>
              <h3 className="text-lg font-semibold mb-2 mt-4">4.2 No Platform Fees</h3>
              <p className="text-muted-foreground">
                DiggsAndGiggs does not charge consumers any fees for posting gigs or hiring diggers. Payment arrangements are made directly between you and the digger.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. For Diggers (Service Providers)</h2>
              <h3 className="text-lg font-semibold mb-2">5.1 Profile Creation</h3>
              <p className="text-muted-foreground mb-3">
                Diggers may create profiles free of charge. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide accurate information about your skills and experience</li>
                <li>Use a handle that does not impersonate others</li>
                <li>Keep your credentials (insurance, licensing) current</li>
                <li>Maintain professional conduct</li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">5.2 Lead Purchases</h3>
              <p className="text-muted-foreground mb-3">
                Diggers pay a fee to access consumer contact information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Pricing:</strong> Minimum $50 or 0.5% of gig's lower budget range (whichever is higher)</li>
                <li><strong>Non-Refundable:</strong> Lead purchases are final, except in cases of fraud or misrepresentation</li>
                <li><strong>No Guarantee:</strong> Purchasing a lead does not guarantee you will be hired</li>
                <li><strong>Multiple Purchases:</strong> Multiple diggers may purchase the same lead</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2 mt-4">5.3 Lead Quality Issues</h3>
              <p className="text-muted-foreground mb-3">
                If you encounter a lead quality issue, you may report it for review. Issues include:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Invalid or non-responsive contact information</li>
                <li>Fraudulent or fake gig postings</li>
                <li>Duplicate gig postings</li>
                <li>Significantly misrepresented project scope or budget</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Refunds are evaluated case-by-case and are not guaranteed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Payment Terms</h2>
              <h3 className="text-lg font-semibold mb-2">6.1 Lead Purchase Payments</h3>
              <p className="text-muted-foreground mb-3">
                All lead purchases are processed securely through Stripe. By purchasing a lead, you authorize DiggsAndGiggs to charge your payment method.
              </p>
              
              <h3 className="text-lg font-semibold mb-2">6.2 Work Payments</h3>
              <p className="text-muted-foreground">
                Payment for actual services is arranged directly between Consumer and Digger. DiggsAndGiggs is not involved in these transactions and takes no commission on the work performed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Prohibited Conduct</h2>
              <p className="text-muted-foreground mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Share login credentials or access others' accounts</li>
                <li>Circumvent the Platform to avoid fees</li>
                <li>Post false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or threaten other users</li>
                <li>Scrape, copy, or distribute Platform content without permission</li>
                <li>Use automated tools to access the Platform</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Platform Role</h2>
              <p className="text-muted-foreground mb-3">
                <strong>DiggsAndGiggs is a marketplace platform only.</strong> We do not:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Employ Diggers or guarantee their work quality</li>
                <li>Screen or background check Diggers (beyond profile verification)</li>
                <li>Mediate disputes between Consumers and Diggers regarding work quality</li>
                <li>Control pricing, deliverables, or work arrangements</li>
                <li>Guarantee that Consumers will respond or hire after a lead purchase</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Users are independent parties. All work agreements, payments, and disputes are between Consumer and Digger directly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Intellectual Property</h2>
              <p className="text-muted-foreground mb-3">
                By posting content on the Platform (profiles, gigs, portfolios), you grant DiggsAndGiggs a license to display and distribute that content within the Platform. You retain ownership of your content.
              </p>
              <p className="text-muted-foreground">
                The DiggsAndGiggs brand, logo, and Platform design are protected intellectual property. You may not use them without permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. Privacy</h2>
              <p className="text-muted-foreground">
                Your use of the Platform is also governed by our Privacy Policy, which explains how we collect, use, and protect your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Disclaimers</h2>
              <p className="text-muted-foreground mb-3">
                THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-muted-foreground">
                We do not guarantee that the Platform will be error-free, secure, or continuously available.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, DIGGSANDGIGGS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING LOST PROFITS, DATA LOSS, OR BUSINESS INTERRUPTION.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">13. Termination</h2>
              <p className="text-muted-foreground mb-3">
                We may suspend or terminate your account at any time for:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Violation of these Terms</li>
                <li>Fraudulent or illegal activity</li>
                <li>Extended inactivity</li>
                <li>At our discretion with or without cause</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                You may close your account at any time. Termination does not affect obligations incurred before termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">14. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms. Material changes will be communicated via email or Platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">15. Contact Information</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong> legal@digsandgigs.com<br />
                <strong>Mail:</strong> [Your Business Address]
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
