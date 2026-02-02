import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-2">Effective Date: January 1, 2026</p>
        <p className="text-muted-foreground mb-8">
          Company: Digs and Gigs LLC ("we," "us," "our")<br />
          Address: 1621 CENTRAL AVE # 59147, CHEYENNE, WY 82001<br />
          Email for Legal Notices: legal@digsandgigs.net<br />
          State of Incorporation: Wyoming
        </p>

        <Card className="mb-8">
          <CardContent className="p-8 space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By creating an account, using the platform, or accessing any services provided by Digs and Gigs LLC ("Digs & Gigs," "the Platform"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Platform.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">2. Platform Overview</h2>
              <p className="text-muted-foreground mb-3">
                Digs & Gigs is a freelance marketplace connecting individuals and businesses ("Clients") with independent service providers ("Diggers").
              </p>
              <p className="text-muted-foreground mb-3">Digs & Gigs:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Does not employ Diggers</li>
                <li>Does not guarantee outcomes or project results</li>
                <li>Does not handle payments between Clients and Diggers</li>
                <li>Is not a party to any contract between Users</li>
              </ul>
              <p className="text-muted-foreground mt-3 font-semibold">
                Diggers are independent contractors, not employees.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">3. Eligibility</h2>
              <p className="text-muted-foreground mb-3">You must:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Be 18 years or older</li>
                <li>Have the legal capacity to enter into a binding agreement</li>
                <li>Use the platform for lawful purposes</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Accounts created with false information may be suspended or removed.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">4. Account Registration</h2>
              <p className="text-muted-foreground mb-3">
                You must create an account to access most features. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide accurate information</li>
                <li>Maintain the security of your login credentials</li>
                <li>Assume responsibility for all activity under your account</li>
                <li>Notify us of unauthorized use</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                We may suspend or terminate accounts for violations of these Terms.
              </p>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">5. Digger Pricing — No Membership Required</h2>
              <p className="text-muted-foreground mb-3">
                Diggers can either buy leads or bid on gigs. No subscription or membership is required.
              </p>
              
              <h3 className="text-lg font-semibold mb-2 mt-4">Buy Leads</h3>
              <p className="text-muted-foreground mb-2">
                Diggers may reveal Client contact information by paying a lead fee. Lead pricing varies by category and project size.
              </p>

              <h3 className="text-lg font-semibold mb-2 mt-4">Bid on Gigs — 8% Referral Fee</h3>
              <p className="text-muted-foreground mb-2">
                When a Digger is awarded a gig, we charge an 8% referral fee (from the Gigger&apos;s deposit). The Digger pays nothing upfront to bid.
              </p>

              <h3 className="text-lg font-semibold mb-2 mt-4">Lead fees are non-refundable, even if:</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>The Client does not respond</li>
                <li>The Client changes their mind</li>
                <li>The Client misrepresented their project</li>
                <li>Multiple Diggers reveal the same lead</li>
                <li>The Digger's message is unsuccessful</li>
              </ul>

              <p className="text-muted-foreground mt-3 italic">
                Note: Digs & Gigs does not guarantee Client response rates or job outcomes.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">7. Stripe Payment Processing</h2>
              <p className="text-muted-foreground mb-3">
                Payments are securely processed via Stripe.
              </p>
              <p className="text-muted-foreground mb-3">
                By using the Platform, you agree to Stripe's terms & privacy policy:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li><a href="https://stripe.com/legal" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://stripe.com/legal</a></li>
                <li><a href="https://stripe.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">https://stripe.com/privacy</a></li>
              </ul>
              <p className="text-muted-foreground mt-3">
                We do not store full credit card details.
              </p>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">8. Marketplace Conduct Rules</h2>
              <p className="text-muted-foreground mb-3">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Harass, threaten, or scam Users</li>
                <li>Post false or misleading project descriptions</li>
                <li>Create duplicate or fake accounts</li>
                <li>Attempt to bypass lead fees ("off-platform solicitation")</li>
                <li>Abuse refunds or chargebacks</li>
                <li>Scrape website data or use bots</li>
                <li>Share another User's personal information without consent</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Violation may result in account removal.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">9. No Guarantee of Work or Leads</h2>
              <p className="text-muted-foreground mb-3">Digs & Gigs does not guarantee:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>That Clients will hire a Digger</li>
                <li>That Diggers will respond to Clients</li>
                <li>Any income, number of leads, or job success</li>
                <li>That any given lead will be exclusive or result in work</li>
              </ul>
              <p className="text-muted-foreground mt-3 font-semibold">
                We provide a matching platform only.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">10. Intellectual Property</h2>
              <p className="text-muted-foreground mb-3">
                You retain ownership of your content but grant Digs & Gigs a non-exclusive, royalty-free right to display it on the platform.
              </p>
              <p className="text-muted-foreground">You may not upload:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-2">
                <li>Copyrighted materials you do not own</li>
                <li>Pornographic, harmful, or illegal content</li>
              </ul>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">11. Dispute Resolution Between Users</h2>
              <p className="text-muted-foreground mb-3">
                Digs & Gigs is not responsible for resolving disputes between Users.
              </p>
              <p className="text-muted-foreground">
                Clients and Diggers must resolve payment disputes directly between themselves.
              </p>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">12. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-3">To the fullest extent permitted by law:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Digs & Gigs is not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability shall not exceed the lead or referral fees paid in the past 3 months</li>
                <li>We provide the Platform "as is" with no warranties of any kind</li>
              </ul>
              <p className="text-muted-foreground mt-3 italic">
                Some jurisdictions may not allow these limitations.
              </p>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">13. Arbitration Agreement (with Small Claims Exception)</h2>
              <p className="text-muted-foreground mb-3">
                You agree that any dispute with Digs & Gigs LLC will be resolved through binding arbitration, except:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>You may bring a claim in small claims court if eligible.</li>
              </ul>
              <p className="text-muted-foreground mt-3 mb-3">You waive the right to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>A jury trial</li>
                <li>Participate in class actions</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Arbitration will be conducted under the AAA Commercial Arbitration Rules.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Location:</strong> Cheyenne, Wyoming<br />
                <strong>Language:</strong> English
              </p>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">14. Governing Law & Venue</h2>
              <p className="text-muted-foreground mb-3">
                These Terms are governed by the laws of the State of Wyoming.
              </p>
              <p className="text-muted-foreground">
                Any small claims or court actions must be filed exclusively in Wyoming courts.
              </p>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">15. Termination</h2>
              <p className="text-muted-foreground mb-3">We may suspend or delete accounts that:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Violate these Terms</li>
                <li>Engage in fraudulent or abusive behavior</li>
                <li>Harm the platform or its Users</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Users may cancel their accounts at any time.
              </p>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">16. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms as needed. Changes take effect upon posting. Continued use of the Platform signifies acceptance.
              </p>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-bold mb-4">17. Contact Information</h2>
              <p className="text-muted-foreground">
                <strong>Digs and Gigs LLC</strong><br />
                1621 CENTRAL AVE # 59147<br />
                CHEYENNE, WY 82001<br />
                Email: <a href="mailto:legal@digsandgigs.net" className="text-primary hover:underline">legal@digsandgigs.net</a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
