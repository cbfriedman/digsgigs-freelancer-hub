import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { generateFAQSchema } from "@/components/StructuredData";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

const FAQ = () => {
  const faqData = {
    general: [
      {
        question: "What is Digs & Gigs?",
        answer: "Digs & Gigs is a freelance marketplace where consumers (clients) can post projects and freelancers (\"Diggers\") can connect with them. We charge no commissions — freelancers pay only for subscription access and optional lead reveals."
      },
      {
        question: "Is Digs & Gigs a bidding platform?",
        answer: "No. Freelancers do not compete in bidding wars. Instead, freelancers choose which leads they want to pursue and pay a flat-rate fee to access the client's contact info."
      },
      {
        question: "Who can use the platform?",
        answer: "Anyone 18 or older can create an account. Freelancers worldwide may join. Consumers may post any project that does not violate our terms."
      },
      {
        question: "Does Digs & Gigs take a percentage of what freelancers earn?",
        answer: "Never. Freelancers keep 100% of what they make."
      }
    ],
    forDiggers: [
      {
        question: "How do I become a Digger?",
        answer: "Click \"Become a Digger\", create a profile, choose your categories, and start receiving project matches."
      },
      {
        question: "How does matching work?",
        answer: "When a consumer posts a project, our system automatically pairs it with Diggers whose skills match the project criteria."
      },
      {
        question: "Do I need to buy credits or tokens?",
        answer: "No. We do not use credit packs or point systems. You simply pay the monthly subscription and pay flat-rate prices for lead reveals. That's it."
      },
      {
        question: "What do I get when I pay for a lead reveal?",
        answer: "Freelancers receive: Client's full name, email address, phone number, project description, budget range (if provided), timeline, and attachments."
      },
      {
        question: "Are leads exclusive?",
        answer: "Not necessarily. Multiple Diggers can reveal the same lead. This ensures clients receive multiple viable options, and freelancers can pursue as many leads as they want."
      },
      {
        question: "If a client doesn't respond, do I get a refund?",
        answer: "No. Lead fees are non-refundable. Like all freelance marketplaces, Digs & Gigs cannot guarantee client responsiveness or job outcomes."
      },
      {
        question: "Do you guarantee freelance work?",
        answer: "No. We provide access to project opportunities, not guaranteed earnings."
      },
      {
        question: "Can freelancers be removed from the platform?",
        answer: "Yes — accounts may be suspended for: Harassment, attempting to bypass lead fees (\"off-platform solicitation\"), fraudulent or misleading behavior, abusing refund systems, or violating platform policies."
      }
    ],
    forConsumers: [
      {
        question: "Is it free to post a project?",
        answer: "Yes. Consumers post projects for free."
      },
      {
        question: "How many freelancers will contact me?",
        answer: "It depends on the category, your budget, timeline, and project clarity. Typically, 1–6 freelancers reach out per project."
      },
      {
        question: "Does it cost money for consumers to hire freelancers?",
        answer: "No. Consumers pay nothing to use the platform."
      },
      {
        question: "Do freelancers see my contact info automatically?",
        answer: "No. A freelancer must choose to pay to reveal your contact details."
      },
      {
        question: "Do you vet freelancers?",
        answer: "We review accounts for compliance, but we do not certify, employ, or guarantee the skills of freelancers. Consumers must review profiles and portfolios before hiring."
      }
    ],
    pricing: [
      {
        question: "How much does it cost to use Digs & Gigs as a freelancer?",
        answer: "Two components: Subscription ($19/month for Founders) and optional lead reveal fees ($10/$25 for first-year Founders)."
      },
      {
        question: "Are subscription fees refundable?",
        answer: "No. Because subscription access is immediate, all subscription payments are non-refundable except where law requires."
      },
      {
        question: "How long is the $19/month Founder subscription price guaranteed?",
        answer: "For life — as long as the subscription remains active. If a Founder cancels or lapses for any reason, the lifetime guarantee expires."
      },
      {
        question: "Will lead pricing increase after a year?",
        answer: "It may. Founders receive the lowest lead pricing we will ever offer — $10/$25 for their entire first year. Pricing may adjust afterward."
      }
    ],
    leads: [
      {
        question: "What counts as a \"lead\"?",
        answer: "A project opportunity where the freelancer reveals the client's contact information."
      },
      {
        question: "Do you guarantee the client will hire me?",
        answer: "No. No freelance marketplace can guarantee a job outcome."
      },
      {
        question: "Do you guarantee client responsiveness?",
        answer: "No. Lead pricing reflects contact information access, not job fulfillment."
      },
      {
        question: "Can I request a refund on a bad lead?",
        answer: "Digs & Gigs does not refund lead fees unless legally required. Refunds are not provided for: Non-responsive clients, duplicate clients, clients who change their mind, inaccurate budgets, or competitively revealed leads."
      },
      {
        question: "Why do multiple freelancers sometimes contact a client?",
        answer: "Digs & Gigs is built to give consumers multiple high-quality freelancer options, which increases the likelihood of project completion."
      }
    ],
    safety: [
      {
        question: "Do you screen freelancers?",
        answer: "We verify profiles for policy compliance but cannot fully vet identity, training, or skills."
      },
      {
        question: "What if a freelancer or consumer behaves inappropriately?",
        answer: "Report the behavior immediately. Accounts may be suspended or removed for: Harassment, fraud, misrepresentation, or abuse."
      },
      {
        question: "Do you protect user data?",
        answer: "Yes. User data is encrypted, and payments are handled securely through Stripe."
      }
    ],
    founders: [
      {
        question: "What is the Founders Program?",
        answer: "A limited offer for the first 500 freelancers who join Digs & Gigs."
      },
      {
        question: "What do Founders receive?",
        answer: "Free 60-day subscription, $19/month subscription locked for life, lowest lead pricing we will ever offer — $10/$25 for the first 12 months, priority ranking, and Founding Digger badge."
      },
      {
        question: "Can new freelancers join after all 500 spots are taken?",
        answer: "Yes, but they will not receive: $19 lifetime subscription, first-year $10/$25 lead pricing, Founders badge, or priority ranking."
      },
      {
        question: "Can Founders lose their lifetime subscription price?",
        answer: "Yes. If a Founder cancels or lapses payments, the guarantee permanently expires."
      },
      {
        question: "Will Founders still receive new features as the platform grows?",
        answer: "Yes. All active Founders will continue to receive all new platform features."
      }
    ]
  };

  // Generate FAQ structured data for search engines
  const allFAQs = Object.values(faqData).flat();

  return (
    <>
      <SEOHead
        title="Frequently Asked Questions | Digs & Gigs"
        description="Get answers to common questions about Digs & Gigs freelance marketplace. Learn about pricing, leads, the Founders Program, and how to get started as a freelancer or client."
        canonical="/faq"
        keywords="FAQ, Digs and Gigs questions, freelance marketplace help, lead pricing, founders program, freelancer questions"
        structuredData={generateFAQSchema(allFAQs)}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-xl text-muted-foreground">
                Everything you need to know about Digs & Gigs
              </p>
            </div>

            <div className="space-y-8">
              {/* General Questions */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">🌐 General</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.general.map((faq, index) => (
                    <AccordionItem key={index} value={`general-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* For Diggers */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">💼 For Diggers (Freelancers)</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.forDiggers.map((faq, index) => (
                    <AccordionItem key={index} value={`digger-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* For Consumers */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">👤 For Consumers (Clients)</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.forConsumers.map((faq, index) => (
                    <AccordionItem key={index} value={`consumer-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Pricing */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">💰 Pricing</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.pricing.map((faq, index) => (
                    <AccordionItem key={index} value={`pricing-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Leads */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">📩 Leads</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.leads.map((faq, index) => (
                    <AccordionItem key={index} value={`leads-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Trust & Safety */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">🛡️ Trust & Safety</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.safety.map((faq, index) => (
                    <AccordionItem key={index} value={`safety-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>

              {/* Founders Program */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">👑 Founders Program</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.founders.map((faq, index) => (
                    <AccordionItem key={index} value={`founders-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </div>

            {/* Still have questions CTA */}
            <Card className="mt-12 p-8 text-center bg-primary/5">
              <h2 className="text-2xl font-semibold mb-4">Still have questions?</h2>
              <p className="text-muted-foreground mb-6">
                Can't find the answer you're looking for? Our support team is here to help.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Contact Support
              </a>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQ;
