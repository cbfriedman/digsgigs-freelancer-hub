import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation showBackButton backLabel="Back to Home" />

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-2">Effective Date: January 1, 2026</p>
        <p className="text-muted-foreground mb-8">
          Company: Digs and Gigs LLC<br />
          Address: 1621 CENTRAL AVE # 59147, CHEYENNE, WY 82001<br />
          Email: <a href="mailto:legal@digsandgigs.net" className="text-primary hover:underline">legal@digsandgigs.net</a><br />
          State of Incorporation: Wyoming
        </p>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-8">
            <p className="text-muted-foreground">
              This Privacy Policy explains how Digs and Gigs LLC ("Digs & Gigs," "we," "our," "us") collects, uses, and protects your information when you access our website or services ("Platform").
            </p>
            <p className="text-muted-foreground font-semibold">
              By creating an account or using the Platform, you agree to this Policy.
            </p>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold mb-2">A. Information You Provide Directly</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Profile information</li>
                <li>Portfolio items</li>
                <li>Payment details (processed by Stripe; we do not store card numbers)</li>
                <li>Messages sent on the Platform</li>
                <li>Project details and attachments</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">B. Information Collected Automatically</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4 mb-4">
                <li>IP address</li>
                <li>Browser type</li>
                <li>Device type</li>
                <li>Pages viewed</li>
                <li>Session duration</li>
                <li>Cookies and tracking tools</li>
              </ul>

              <h3 className="text-lg font-semibold mb-2">C. Information From Third Parties</h3>
              <p className="text-muted-foreground mb-2">We may receive information from:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Stripe (payment status, billing info)</li>
                <li>Identity verification providers</li>
                <li>Analytics platforms (Google Analytics, Hotjar, etc.)</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-3">We use your information to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Operate and improve the Platform</li>
                <li>Match freelancers and clients</li>
                <li>Process payments</li>
                <li>Prevent fraud</li>
                <li>Send service emails, updates, and reminders</li>
                <li>Deliver marketing communications (with opt-out option)</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="text-muted-foreground mt-4 font-semibold">
                We never sell your personal information.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">3. Legal Basis for Processing (GDPR)</h2>
              <p className="text-muted-foreground mb-3">Where applicable, we process data:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>With your consent</li>
                <li>To fulfill our contractual obligations</li>
                <li>For legitimate business interests</li>
                <li>To comply with legal requirements</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">4. Cookies & Tracking Technologies</h2>
              <p className="text-muted-foreground mb-3">We use cookies to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Maintain login sessions</li>
                <li>Understand user behavior</li>
                <li>Improve performance</li>
                <li>Deliver relevant content</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Users may disable cookies, but the Platform may not function properly.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">5. Information Sharing</h2>
              <p className="text-muted-foreground mb-3">We may share information with:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Stripe (for payment processing)</li>
                <li>Service providers (hosting, analytics, email systems)</li>
                <li>Legal authorities (if required)</li>
              </ul>
              <p className="text-muted-foreground mt-3 font-semibold">
                We do not sell personal data.
              </p>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain data for as long as necessary to operate the Platform, comply with obligations, or resolve disputes. You may request deletion of your data at any time.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">7. Account Deletion and Data Rights</h2>
              <p className="text-muted-foreground mb-3">You may request:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Data deletion</li>
                <li>Data export</li>
                <li>Correction of inaccurate data</li>
                <li>Restriction of processing (where applicable)</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Requests: <a href="mailto:legal@digsandgigs.net" className="text-primary hover:underline">legal@digsandgigs.net</a>
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">8. Security</h2>
              <p className="text-muted-foreground mb-3">We use industry-standard measures including:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Encryption</li>
                <li>Secure servers</li>
                <li>Role-based access control</li>
                <li>Stripe's PCI-compliant payments</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                No system is 100% secure, but we take all reasonable precautions.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Users must be 18 years or older. We do not knowingly collect data from children.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">10. Marketing Communications</h2>
              <p className="text-muted-foreground mb-3">You may opt out of:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Emails</li>
                <li>SMS messages</li>
                <li>Notifications</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                All communications include opt-out options.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">11. SMS Consent (TCPA Compliance)</h2>
              <p className="text-muted-foreground mb-3">By providing your phone number, you agree to receive:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Account notifications</li>
                <li>Lead alerts</li>
                <li>Promotional messages</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Message & data rates may apply.<br />
                Reply STOP to unsubscribe.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">12. International Users</h2>
              <p className="text-muted-foreground">
                Your data may be stored in the United States. By using the Platform, you consent to this transfer.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">13. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Policy as needed. Updates take effect upon posting.
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
              <p className="text-muted-foreground">
                <strong>Digs and Gigs LLC</strong><br />
                1621 CENTRAL AVE # 59147<br />
                CHEYENNE, WY 82001<br />
                <a href="mailto:legal@digsandgigs.net" className="text-primary hover:underline">legal@digsandgigs.net</a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
