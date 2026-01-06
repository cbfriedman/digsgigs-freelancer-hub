import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const GiveawayTerms = () => {
  return (
    <>
      <SEOHead
        title="Giveaway Terms & Conditions | Digs & Gigs"
        description="Terms and conditions for the Digs & Gigs Early-Access Freelancer Grant Giveaway"
        canonical="/giveaway-terms"
      />

      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <h1 className="text-4xl font-bold mb-4">
              Early-Access Freelancer Grant Giveaway
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Terms and Conditions
            </p>

            <div className="bg-muted/50 rounded-lg p-6 mb-8">
              <p className="text-muted-foreground">
                <strong>Note:</strong> Full terms and conditions are being finalized and will be published here shortly.
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold mb-4">Campaign Overview</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li><strong>Campaign Name:</strong> Digs & Gigs Early-Access Freelancer Grant Giveaway</li>
                  <li><strong>Purpose:</strong> Encourage freelancers ("Diggers") to fully complete their profile when applying</li>
                  <li><strong>Prizes:</strong> Four total winners - 2 winners × $500, 2 winners × $250</li>
                  <li><strong>Selection:</strong> Winners are selected randomly after we reach 500 eligible profiles, or 30 days — whichever comes first</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Eligibility Requirements</h2>
                <p className="text-muted-foreground mb-4">
                  A Digger becomes eligible once ALL of the following are completed:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Account created</li>
                  <li>Email verified</li>
                  <li>Profile fields completed</li>
                  <li>Categories selected</li>
                  <li>Profile photo uploaded</li>
                  <li>Admin approval completed</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Only approved and complete profiles qualify.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Additional Information</h2>
                <p className="text-muted-foreground">
                  Full terms and conditions, including eligibility requirements, prize details, selection process, and legal disclaimers will be published here before the campaign begins.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Questions?</h2>
                <p className="text-muted-foreground">
                  If you have questions about the giveaway, please{" "}
                  <Link to="/contact" className="text-primary hover:underline">
                    contact us
                  </Link>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default GiveawayTerms;
