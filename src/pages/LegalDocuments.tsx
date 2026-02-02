import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LegalDocuments = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Legal Documents & Disclosures</h1>
        <p className="text-muted-foreground mb-8">
          Additional policies and disclosures for Digs and Gigs LLC
        </p>

        <Tabs defaultValue="dmca" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2">
            <TabsTrigger value="dmca" className="text-xs sm:text-sm">DMCA</TabsTrigger>
            <TabsTrigger value="earnings" className="text-xs sm:text-sm">Earnings</TabsTrigger>
            <TabsTrigger value="lead-pricing" className="text-xs sm:text-sm">Lead Pricing</TabsTrigger>
            <TabsTrigger value="contractor" className="text-xs sm:text-sm">Contractor</TabsTrigger>
            <TabsTrigger value="aup" className="text-xs sm:text-sm">AUP</TabsTrigger>
          </TabsList>

          {/* DMCA Policy */}
          <TabsContent value="dmca">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">DMCA Policy</h2>
                <p className="text-muted-foreground">
                  If you believe that content on Digs & Gigs infringes your copyright, send a DMCA notice to{" "}
                  <a href="mailto:legal@digsandgigs.net" className="text-primary hover:underline">legal@digsandgigs.net</a> with:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Your contact info</li>
                  <li>Identification of the copyrighted work</li>
                  <li>The infringing content</li>
                  <li>A statement of good faith belief</li>
                  <li>A statement under penalty of perjury</li>
                  <li>Your signature</li>
                </ul>
                <p className="text-muted-foreground">
                  We will investigate and remove content where appropriate.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Disclaimer */}
          <TabsContent value="earnings">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Earnings Disclaimer</h2>
                <p className="text-muted-foreground">
                  Digs & Gigs does not guarantee income, job offers, number of leads, or client responses. 
                  Freelancers are independent contractors and are solely responsible for their own business results.
                </p>
                <p className="text-muted-foreground">
                  Any examples of earnings or success stories shared on the Platform are illustrative only and 
                  should not be considered as guarantees of future results. Individual outcomes vary based on 
                  factors including but not limited to: skills, experience, effort, market conditions, and location.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lead Pricing Disclosure */}
          <TabsContent value="lead-pricing">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Lead Pricing Disclosure</h2>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Founders Program Pricing</h3>
                  <p className="text-muted-foreground">Founding Diggers (first 500 freelancers) receive:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li><strong>$10</strong> standard leads</li>
                    <li><strong>$25</strong> high-value leads</li>
                    <li>For their <strong>first 12 months</strong></li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">After the First Year</h3>
                  <p className="text-muted-foreground">
                    Lead pricing may adjust after the first year. New pricing will be communicated with reasonable notice.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Refund Policy</h3>
                  <p className="text-muted-foreground font-semibold">
                    Lead fees are non-refundable.
                  </p>
                  <p className="text-muted-foreground">
                    This applies even if the client does not respond, changes their mind, or misrepresented their project.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Independent Contractor Notice */}
          <TabsContent value="contractor">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Independent Contractor Notice</h2>
                <p className="text-muted-foreground font-semibold">
                  All Diggers are independent contractors.
                </p>
                <p className="text-muted-foreground mb-4">Digs & Gigs:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Does not employ freelancers</li>
                  <li>Does not set rates</li>
                  <li>Does not guarantee payment</li>
                  <li>Is not responsible for disputes</li>
                  <li>Is not a party to contracts between freelancers and clients</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Freelancers are responsible for their own taxes, insurance, licenses, and compliance with 
                  applicable laws and regulations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acceptable Use Policy */}
          <TabsContent value="aup">
            <Card>
              <CardContent className="p-8 space-y-6">
                <h2 className="text-2xl font-bold">Acceptable Use Policy</h2>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Prohibited Actions</h3>
                  <p className="text-muted-foreground">Users may NOT:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Harass or abuse other users</li>
                    <li>Commit fraud, use false identities, or post fake projects</li>
                    <li>Post illegal or prohibited content</li>
                    <li>Circumvent lead fees</li>
                    <li>Engage in off-platform solicitation</li>
                    <li>Scrape data from the platform</li>
                    <li>Upload viruses or harmful code</li>
                    <li>Impersonate another person</li>
                    <li>Exchange contact info before lead reveal</li>
                    <li>Abuse refunds or chargebacks</li>
                    <li>Spam other users</li>
                  </ul>
                  <p className="text-muted-foreground mt-4 font-semibold">
                    Violations may result in suspension or termination.
                  </p>
                </div>

                <div className="space-y-4 pt-6 border-t">
                  <h3 className="text-lg font-semibold">Community Guidelines</h3>
                  <p className="text-muted-foreground">We expect all users to:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Be respectful and professional</li>
                    <li>Honor agreements made</li>
                    <li>Respond in a timely manner</li>
                    <li>Provide accurate project descriptions</li>
                    <li>Report safety concerns</li>
                    <li>Maintain truthful profiles</li>
                    <li>Communicate clearly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LegalDocuments;
