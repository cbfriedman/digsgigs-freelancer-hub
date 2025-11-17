import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-muted-foreground">
                DiggsAndGiggs ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mb-2">2.1 Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                <li><strong>Account Information:</strong> Email, password, user type (Consumer or Digger)</li>
                <li><strong>Profile Information:</strong> For Diggers - handle, profession, bio, location, phone, rates, experience, portfolio URLs, credentials (insurance, bonding, licensing)</li>
                <li><strong>Gig Information:</strong> For Consumers - project details, budget, timeline, contact preferences</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store full payment card details)</li>
                <li><strong>Communications:</strong> Messages sent through contact forms or support channels</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">2.2 Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Usage Data:</strong> Pages visited, features used, time spent on the Platform</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                <li><strong>Cookies:</strong> See Section 8 for details</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><strong>Platform Operation:</strong> Creating and managing accounts, facilitating connections between Consumers and Diggers</li>
                <li><strong>Lead Purchases:</strong> Processing payments and granting access to contact information</li>
                <li><strong>Communications:</strong> Sending account notifications, transaction confirmations, and support responses</li>
                <li><strong>Improvement:</strong> Analyzing usage patterns to enhance Platform features and user experience</li>
                <li><strong>Safety & Security:</strong> Detecting fraud, enforcing Terms of Service, protecting user accounts</li>
                <li><strong>Legal Compliance:</strong> Meeting legal and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">4. Information Sharing</h2>
              
              <h3 className="text-lg font-semibold mb-2">4.1 With Other Users</h3>
              <p className="text-muted-foreground mb-3">
                <strong>Digger Profiles:</strong> Publicly visible information includes handle, profession, bio, portfolio, ratings, and credentials. Real names and business names remain private.
              </p>
              <p className="text-muted-foreground mb-4">
                <strong>After Lead Purchase:</strong> When a Digger purchases a lead, we share the Consumer's contact information (name, email, phone) as provided in the gig posting.
              </p>

              <h3 className="text-lg font-semibold mb-2">4.2 With Service Providers</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-4">
                <li><strong>Stripe:</strong> Payment processing</li>
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Email Services:</strong> Transactional emails and notifications</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">4.3 Legal Requirements</h3>
              <p className="text-muted-foreground">
                We may disclose information if required by law, court order, or to protect our rights and safety or the rights and safety of others.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">5. Data Security</h2>
              <p className="text-muted-foreground mb-3">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Encrypted data transmission (HTTPS/SSL)</li>
                <li>Secure password hashing</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>Secure third-party service providers</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                However, no system is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-lg font-semibold mb-2">6.1 Access and Update</h3>
              <p className="text-muted-foreground mb-3">
                You may access and update your account information at any time through your profile settings.
              </p>

              <h3 className="text-lg font-semibold mb-2">6.2 Account Deletion</h3>
              <p className="text-muted-foreground mb-3">
                You may request account deletion by contacting us at privacy@digsandgigs.com. We will delete your personal data within 30 days, except where retention is required by law or to resolve disputes.
              </p>

              <h3 className="text-lg font-semibold mb-2">6.3 Marketing Communications</h3>
              <p className="text-muted-foreground mb-3">
                You may opt out of promotional emails by clicking "unsubscribe" in any marketing email. You cannot opt out of transactional emails (e.g., purchase confirmations, account notifications).
              </p>

              <h3 className="text-lg font-semibold mb-2">6.4 Data Portability</h3>
              <p className="text-muted-foreground">
                You may request a copy of your data in a machine-readable format. Contact privacy@digsandgigs.com for requests.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
              <p className="text-muted-foreground mb-3">
                We retain your information for as long as:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Your account is active</li>
                <li>Needed to provide services to you</li>
                <li>Required by law or to resolve disputes</li>
                <li>Necessary for legitimate business purposes (e.g., fraud prevention)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">8. Cookies and Tracking</h2>
              <p className="text-muted-foreground mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mb-3">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Analyze Platform usage</li>
                <li>Improve performance and security</li>
              </ul>
              <p className="text-muted-foreground">
                You can control cookies through your browser settings, but some Platform features may not function properly if cookies are disabled.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                The Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">10. International Users</h2>
              <p className="text-muted-foreground">
                If you access the Platform from outside the United States, your information may be transferred to, stored, and processed in the United States or other countries. By using the Platform, you consent to this transfer.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last Updated" date. Material changes will be communicated via email or Platform notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4">12. Contact Us</h2>
              <p className="text-muted-foreground">
                For privacy-related questions or requests, contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong> privacy@digsandgigs.com<br />
                <strong>Mail:</strong> [Your Business Address]
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
