import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { competitors } from "@/data/comparisonData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight, Scale } from "lucide-react";

export default function CompareHub() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Compare DigsAndGigs to Other Platforms",
    "description": "See how DigsAndGigs compares to Bark, Thumbtack, Angi, HomeAdvisor, and other lead generation platforms for service professionals.",
    "url": "https://digsandgigs.com/compare"
  };

  return (
    <>
      <Helmet>
        <title>Compare DigsAndGigs vs Bark, Thumbtack, Angi & More | Platform Comparison</title>
        <meta
          name="description"
          content="Compare DigsAndGigs to Bark, Thumbtack, Angi, HomeAdvisor, Houzz and Yelp. See features, pricing, and which platform is best for your service business."
        />
        <meta 
          name="keywords" 
          content="DigsAndGigs vs Bark, DigsAndGigs vs Thumbtack, DigsAndGigs alternative, Bark alternative, Thumbtack alternative, lead generation comparison" 
        />
        <link rel="canonical" href="https://digsandgigs.com/compare" />
        <meta property="og:title" content="Compare DigsAndGigs vs Competitors | Platform Comparison" />
        <meta property="og:description" content="See how DigsAndGigs stacks up against other lead generation platforms." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://digsandgigs.com/compare" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Scale className="h-4 w-4" />
                  Platform Comparison
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                  How Does DigsAndGigs Compare?
                </h1>
                <p className="text-lg text-muted-foreground">
                  See how we stack up against other lead generation platforms. Compare features, pricing models, and find the best fit for your business.
                </p>
              </div>
            </div>
          </section>

          {/* Key Differentiators */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                {[
                  { label: "Exclusive Leads", desc: "Less competition per lead" },
                  { label: "Transparent Pricing", desc: "Know costs upfront" },
                  { label: "No Contracts", desc: "Cancel anytime" },
                  { label: "Escrow Protection", desc: "Payment security built-in" },
                ].map((item, index) => (
                  <div key={index} className="text-center p-4">
                    <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="font-semibold text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Comparison Cards */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Compare Platforms
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Click any comparison to see detailed feature breakdowns, pros and cons, and our honest verdict.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {competitors.map((competitor) => {
                  const advantageCount = competitor.features.filter(
                    f => f.advantage === 'digsandgigs'
                  ).length;
                  
                  return (
                    <Link key={competitor.slug} to={`/compare/${competitor.slug}`}>
                      <Card className="h-full hover:shadow-lg transition-all hover:border-primary/50 group">
                        <CardHeader>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary">vs</Badge>
                            <Badge variant="outline" className="text-primary border-primary">
                              {advantageCount} advantages
                            </Badge>
                          </div>
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            DigsAndGigs vs {competitor.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {competitor.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3 mb-4">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Their model: </span>
                              <span className="text-foreground">{competitor.pricingModel}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {competitor.prosDigsAndGigs.slice(0, 2).map((pro, index) => (
                                <div
                                  key={index}
                                  className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-1 rounded"
                                >
                                  ✓ {pro.split(' ').slice(0, 3).join(' ')}...
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center text-primary text-sm font-medium">
                            View full comparison
                            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Summary Table */}
          <section className="py-16 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Quick Comparison Overview
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full max-w-5xl mx-auto bg-background rounded-lg border">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold">Platform</th>
                      <th className="text-center p-4 font-semibold">Pricing Model</th>
                      <th className="text-center p-4 font-semibold">Exclusive Leads</th>
                      <th className="text-center p-4 font-semibold">No Contracts</th>
                      <th className="text-center p-4 font-semibold">Escrow</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b bg-primary/5">
                      <td className="p-4 font-semibold text-primary">DigsAndGigs</td>
                      <td className="text-center p-4">Pay-per-lead</td>
                      <td className="text-center p-4 text-green-600">✓</td>
                      <td className="text-center p-4 text-green-600">✓</td>
                      <td className="text-center p-4 text-green-600">✓</td>
                    </tr>
                    {competitors.map((c) => (
                      <tr key={c.slug} className="border-b">
                        <td className="p-4">{c.name}</td>
                        <td className="text-center p-4 text-sm text-muted-foreground">
                          {c.pricingModel}
                        </td>
                        <td className="text-center p-4">
                          {c.features.find(f => f.feature.toLowerCase().includes('exclusiv'))?.competitor ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-muted-foreground">✗</span>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {c.features.find(f => f.feature.toLowerCase().includes('contract'))?.competitor === false ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-muted-foreground">✗</span>
                          )}
                        </td>
                        <td className="text-center p-4">
                          {c.features.find(f => f.feature.toLowerCase().includes('escrow'))?.competitor ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-muted-foreground">✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Ready to Try a Better Way?
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Join thousands of professionals who switched to DigsAndGigs for transparent pricing, exclusive leads, and better conversion rates.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    to="/register?role=digger"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Join as a Professional
                  </Link>
                  <Link
                    to="/post-gig"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm hover:bg-accent"
                  >
                    Post a Project Free
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
