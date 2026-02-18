import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { getFAQCategoryBySlug, faqCategories } from "@/data/faqData";
import { ChevronRight, ArrowLeft } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FAQCategory() {
  const { category } = useParams<{ category: string }>();
  const categoryData = category ? getFAQCategoryBySlug(category) : undefined;

  if (!categoryData) {
    return <Navigate to="/faq" replace />;
  }

  const relatedCategories = faqCategories.filter(c => c.slug !== category).slice(0, 3);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": categoryData.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <title>{categoryData.name} FAQ - Common Questions & Answers | DigsAndGigs</title>
        <meta
          name="description"
          content={`${categoryData.description} Get expert answers about ${categoryData.name.toLowerCase()} costs, hiring tips, and what to expect.`}
        />
        <meta 
          name="keywords" 
          content={`${categoryData.name.toLowerCase()} FAQ, ${categoryData.name.toLowerCase()} cost, hire ${categoryData.name.toLowerCase()}, ${categoryData.name.toLowerCase()} questions`} 
        />
        <link rel="canonical" href={`https://digsandgigs.com/faq/${category}`} />
        <meta property="og:title" content={`${categoryData.name} FAQ | DigsAndGigs`} />
        <meta property="og:description" content={categoryData.description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://digsandgigs.com/faq/${category}`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          {/* Hero */}
          <section className="py-12 md:py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            <div className="container mx-auto px-4">
              <Link
                to="/faq"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to all FAQs
              </Link>
              
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{categoryData.icon}</span>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {categoryData.name} FAQ
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    {categoryData.faqs.length} common questions answered
                  </p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground max-w-3xl">
                {categoryData.description}
              </p>
            </div>
          </section>

          {/* FAQ Content */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main FAQ List */}
                <div className="lg:col-span-2">
                  <Accordion type="single" collapsible className="space-y-4">
                    {categoryData.faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="bg-card rounded-lg border px-6 shadow-sm"
                      >
                        <AccordionTrigger className="text-left hover:no-underline py-5">
                          <span className="font-medium text-foreground pr-4">
                            {faq.question}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* CTA Card */}
                  <Card className="bg-primary text-primary-foreground">
                    <CardHeader>
                      <CardTitle className="text-xl">Need a {categoryData.name} Pro?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-primary-foreground/90">
                        Get free quotes from verified {categoryData.name.toLowerCase()} professionals in your area.
                      </p>
                      <Link
                        to="/post-gig"
                        className="inline-flex w-full items-center justify-center rounded-md bg-background text-foreground px-4 py-2 text-sm font-medium hover:bg-background/90"
                      >
                        Get Free Quotes
                      </Link>
                    </CardContent>
                  </Card>

                  {/* Related Categories */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Related Topics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {relatedCategories.map((cat) => (
                        <Link
                          key={cat.slug}
                          to={`/faq/${cat.slug}`}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{cat.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {cat.faqs.length} questions
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Quick Links */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Link
                        to="/browse-diggers"
                        className="block text-sm text-primary hover:underline"
                      >
                        Find {categoryData.name} Professionals →
                      </Link>
                      <Link
                        to="/how-it-works"
                        className="block text-sm text-primary hover:underline"
                      >
                        How DigsAndGigs Works →
                      </Link>
                      <Link
                        to="/pricing"
                        className="block text-sm text-primary hover:underline"
                      >
                        Pricing for Professionals →
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Still Have Questions?
              </h2>
              <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                Our team is here to help. Contact us or post your project to get personalized advice from professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium shadow-sm hover:bg-accent"
                >
                  Contact Us
                </Link>
                <Link
                  to="/post-gig"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  Post Your Project
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
