import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet-async";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About | Digs & Gigs</title>
        <meta name="description" content="Digs & Gigs connects Diggers (freelancers) with Giggers (clients). Leads by email. Pay per lead or when awarded. No subscriptions." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">
            About Digs & Gigs
          </h1>

          <div className="space-y-8 sm:space-y-10 text-muted-foreground">
            <p className="text-base sm:text-lg leading-relaxed">
              Digs & Gigs is a lead marketplace. <strong className="text-foreground">Giggers</strong> (clients) post gigs. <strong className="text-foreground">Diggers</strong> (freelancers) get leads by email. Pay per lead or pay when you’re awarded—no subscriptions.
            </p>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Mission</h2>
              <p className="text-base sm:text-lg leading-relaxed">
                We build a transparent, fair place where Diggers keep what they earn and Giggers find talent without friction. No hidden fees, no bidding wars.
              </p>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">What we stand for</h2>
              <ul className="space-y-2 sm:space-y-3 text-base sm:text-lg leading-relaxed list-none pl-0">
                <li><strong className="text-foreground">Transparency</strong> — See the unlock price before you pay.</li>
                <li><strong className="text-foreground">Fairness</strong> — Diggers keep 100% of what they earn.</li>
                <li><strong className="text-foreground">Simplicity</strong> — No commissions, no membership required.</li>
                <li><strong className="text-foreground">Trust</strong> — Bad leads are refundable.</li>
              </ul>
            </div>

            <p className="text-base sm:text-lg leading-relaxed pt-2">
              Questions? <a href="/contact" className="text-primary hover:underline">Contact us</a>.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
