import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { faqCategories, getAllFAQs } from "@/data/faqData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, HelpCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const allFAQs = getAllFAQs();
  
  const filteredFAQs = searchQuery.length > 2
    ? allFAQs.filter(
        faq =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": allFAQs.slice(0, 10).map(faq => ({
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
        <title>Frequently Asked Questions | Home Service Costs & Hiring Guide | DigsAndGigs</title>
        <meta
          name="description"
          content="Get answers to common questions about hiring contractors, home service costs, and finding reliable professionals. Expert advice for plumbing, electrical, roofing, HVAC, and more."
        />
        <meta name="keywords" content="home service FAQ, contractor questions, plumber cost, electrician cost, how to hire contractor, home repair questions" />
        <link rel="canonical" href="https://digsandgigs.com/faq" />
        <meta property="og:title" content="Home Service FAQ - Expert Answers | DigsAndGigs" />
        <meta property="og:description" content="Get answers to common questions about hiring contractors and home service costs." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://digsandgigs.com/faq" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <HelpCircle className="h-4 w-4" />
                  Frequently Asked Questions
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                  Your Home Service Questions, Answered
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Expert answers about hiring contractors, understanding costs, and making informed decisions for your home projects.
                </p>
                
                {/* Search */}
                <div className="relative max-w-xl mx-auto">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search questions... (e.g., 'plumber cost')"
                    className="pl-12 py-6 text-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Search Results */}
          {filteredFAQs.length > 0 && (
            <section className="py-8 bg-muted/30">
              <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-lg font-semibold mb-4">
                    Found {filteredFAQs.length} results for "{searchQuery}"
                  </h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {filteredFAQs.slice(0, 10).map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`search-${index}`}
                        className="bg-background rounded-lg border px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </section>
          )}

          {/* Categories Grid */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Browse by Category
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Find answers organized by service type. Each category covers costs, hiring tips, and common concerns.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {faqCategories.map((category) => (
                  <Link key={category.slug} to={`/faq/${category.slug}`}>
                    <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 group">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{category.icon}</span>
                          <div>
                            <CardTitle className="group-hover:text-primary transition-colors">
                              {category.name}
                            </CardTitle>
                            <CardDescription>
                              {category.faqs.length} questions
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {category.description}
                        </p>
                        <ul className="space-y-2">
                          {category.faqs.slice(0, 2).map((faq, index) => (
                            <li key={index} className="text-sm text-foreground flex items-start gap-2">
                              <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{faq.question}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* Popular Questions */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                  Most Popular Questions
                </h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {allFAQs.slice(0, 8).map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`popular-${index}`}
                      className="bg-background rounded-lg border px-4"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Ready to Find a Professional?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Get free quotes from verified professionals in your area. Compare prices, read reviews, and hire with confidence.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/post-gig"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Post Your Project Free
                  </Link>
                  <Link
                    to="/browse-diggers"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    Browse Professionals
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
