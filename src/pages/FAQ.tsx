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
        question: "What is this platform?",
        answer: "We're a marketplace connecting homeowners and businesses with verified service professionals (diggers) for projects of all sizes. Whether you need a plumber, electrician, contractor, or any other skilled professional, our platform makes it easy to find, compare, and hire the right person for your job."
      },
      {
        question: "How does the platform work?",
        answer: "For consumers: Post your project details for free, receive bids from qualified professionals, review their profiles and ratings, then choose who to hire. For service professionals: Create a profile, browse available projects, submit competitive bids, and get hired for jobs that match your skills."
      },
      {
        question: "Is the platform free to use?",
        answer: "Posting projects is completely free for consumers. Service professionals can browse projects for free, but pay a small fee per lead when they want to contact a potential client. We also offer subscription plans for professionals who want unlimited leads and additional features."
      }
    ],
    forConsumers: [
      {
        question: "How do I post a project?",
        answer: "Click 'Post a Gig' in the navigation menu, fill out details about your project including description, location, budget, and timeline. Your project will be visible to relevant professionals immediately. You'll receive bids from interested service providers within hours."
      },
      {
        question: "How do I choose the right professional?",
        answer: "Review each professional's profile including their ratings, reviews, certifications, years of experience, and portfolio. Compare bids, read past client feedback, and check if they're licensed and insured. You can also message professionals directly to ask questions before hiring."
      },
      {
        question: "What payment methods are accepted?",
        answer: "We accept all major credit cards and debit cards through our secure Stripe payment integration. For larger projects, we also offer escrow services to protect both parties and milestone-based payments."
      },
      {
        question: "What is escrow and how does it work?",
        answer: "Escrow is a secure payment method where funds are held by us until work is completed. You fund the project upfront, we hold the money safely, and release payments to the professional as they complete agreed-upon milestones. This protects both you and the service provider."
      }
    ],
    forProfessionals: [
      {
        question: "How do I create a professional profile?",
        answer: "Click 'Digger Registration' to create your profile. Add your business information, services offered, service area, hourly rates, certifications, licenses, insurance information, and portfolio photos. A complete profile helps you get hired faster."
      },
      {
        question: "How much does it cost to use the platform?",
        answer: "Creating a profile is free. We offer three pricing tiers: Free (pay per lead), Pro ($49/month with discounted leads), and Premium ($99/month with unlimited leads). Choose the plan that fits your business size and growth goals."
      },
      {
        question: "How do lead credits work?",
        answer: "When you want to contact a potential client or respond to a project, you purchase a 'lead'. Lead prices vary based on project value and your subscription tier. Free tier pays full price per lead, Pro gets 50% off, and Premium gets unlimited leads included."
      },
      {
        question: "When do I get paid?",
        answer: "For direct payments, you receive payment according to your agreement with the client. For escrow contracts, you receive payment when the client approves each completed milestone. Funds are transferred to your connected bank account within 2-3 business days."
      },
      {
        question: "What are the platform fees?",
        answer: "We charge a 5% platform fee on completed transactions processed through our escrow system. This covers payment processing, dispute resolution, and platform maintenance. Direct payments between you and clients have no platform fees."
      }
    ],
    safety: [
      {
        question: "How do you verify professionals?",
        answer: "We verify business information, check licenses where applicable, and encourage professionals to upload insurance certificates and certifications. We also maintain a rating and review system where past clients can share their experiences."
      },
      {
        question: "What if there's a problem with my project?",
        answer: "Contact our support team immediately. For escrow contracts, we can hold milestone payments while disputes are resolved. We review all complaints and work with both parties to find fair solutions. Serious violations may result in account suspension."
      },
      {
        question: "Are professionals insured?",
        answer: "Many professionals on our platform carry insurance, but it's not required for all services. Each profile clearly shows if the professional is licensed, insured, and bonded. We recommend choosing insured professionals for larger projects."
      }
    ],
    technical: [
      {
        question: "Can I save my favorite professionals?",
        answer: "Yes! You can save professionals to your favorites list and set up saved searches with email alerts. This way you'll be notified when new professionals matching your criteria join the platform or when new projects in your area are posted."
      },
      {
        question: "How do notifications work?",
        answer: "You'll receive notifications for important events like new bids on your projects, messages from professionals, milestone approvals, and payment confirmations. You can customize notification preferences in your account settings."
      },
      {
        question: "Is my payment information secure?",
        answer: "Absolutely. We use Stripe, an industry-leading payment processor, to handle all transactions. We never store your full credit card details on our servers. All payment data is encrypted and PCI-DSS compliant."
      }
    ]
  };

  // Generate FAQ structured data for search engines
  const allFAQs = Object.values(faqData).flat();

  return (
    <>
      <SEOHead
        title="Frequently Asked Questions - Find Service Professionals"
        description="Get answers to common questions about finding and hiring service professionals, posting projects, pricing, payments, and platform features. Learn how our marketplace works for consumers and professionals."
        canonical="/faq"
        keywords="FAQ, service professional questions, hiring help, platform guide, pricing questions, payment information"
        structuredData={generateFAQSchema(allFAQs)}
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
              <p className="text-xl text-muted-foreground">
                Everything you need to know about our platform
              </p>
            </div>

            <div className="space-y-8">
              {/* General Questions */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">General Questions</h2>
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

              {/* For Consumers */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">For Consumers</h2>
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

              {/* For Professionals */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">For Service Professionals</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.forProfessionals.map((faq, index) => (
                    <AccordionItem key={index} value={`professional-${index}`}>
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

              {/* Safety & Trust */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Safety & Trust</h2>
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

              {/* Technical Questions */}
              <Card className="p-6">
                <h2 className="text-2xl font-semibold mb-4">Technical Questions</h2>
                <Accordion type="single" collapsible className="w-full">
                  {faqData.technical.map((faq, index) => (
                    <AccordionItem key={index} value={`technical-${index}`}>
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
