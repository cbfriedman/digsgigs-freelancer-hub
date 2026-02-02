import { Helmet } from "react-helmet-async";
import { Link, useParams, Navigate } from "react-router-dom";
import { Footer } from "@/components/Footer";
import { getCompetitorBySlug, competitors } from "@/data/comparisonData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, MinusCircle, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CompareDetail() {
  const { competitor: slug } = useParams<{ competitor: string }>();
  const competitor = slug ? getCompetitorBySlug(slug) : undefined;

  if (!competitor) {
    return <Navigate to="/compare" replace />;
  }

  const otherComparisons = competitors.filter(c => c.slug !== slug).slice(0, 3);

  const comparisonSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `DigsAndGigs vs ${competitor.name} Comparison`,
    "description": competitor.tagline,
    "url": `https://digsandgigs.com/compare/${slug}`
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://digsandgigs.com" },
      { "@type": "ListItem", "position": 2, "name": "Compare", "item": "https://digsandgigs.com/compare" },
      { "@type": "ListItem", "position": 3, "name": `vs ${competitor.name}`, "item": `https://digsandgigs.com/compare/${slug}` }
    ]
  };

  const renderFeatureValue = (value: string | boolean, isAdvantage: boolean) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle className={`h-5 w-5 ${isAdvantage ? 'text-green-600' : 'text-muted-foreground'}`} />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground" />
      );
    }
    return <span className={isAdvantage ? 'text-green-600 font-medium' : ''}>{value}</span>;
  };

  return (
    <>
      <Helmet>
        <title>DigsAndGigs vs {competitor.name}: Honest Comparison | Which is Better?</title>
        <meta name="description" content={competitor.tagline} />
        <meta 
          name="keywords" 
          content={`DigsAndGigs vs ${competitor.name}, ${competitor.name} alternative, ${competitor.name} review, lead generation comparison`} 
        />
        <link rel="canonical" href={`https://digsandgigs.com/compare/${slug}`} />
        <meta property="og:title" content={`DigsAndGigs vs ${competitor.name} | Comparison`} />
        <meta property="og:description" content={competitor.tagline} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://digsandgigs.com/compare/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(comparisonSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1">
          {/* Breadcrumb */}
          <div className="border-b bg-muted/30">
            <div className="container mx-auto px-4 py-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/compare">Compare</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>vs {competitor.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Hero */}
          <section className="py-12 md:py-16 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            <div className="container mx-auto px-4">
              <Link
                to="/compare"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                All comparisons
              </Link>
              
              <div className="flex items-center gap-4 mb-6">
                <Badge variant="outline" className="text-lg px-4 py-1">VS</Badge>
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                DigsAndGigs vs {competitor.name}
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl">
                {competitor.tagline}
              </p>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="py-8 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {competitor.features.filter(f => f.advantage === 'digsandgigs').length}
                  </div>
                  <div className="text-sm text-muted-foreground">DigsAndGigs Advantages</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-muted-foreground">
                    {competitor.features.filter(f => f.advantage === 'competitor').length}
                  </div>
                  <div className="text-sm text-muted-foreground">{competitor.name} Advantages</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-muted-foreground">
                    {competitor.features.filter(f => f.advantage === 'tie').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Tied Features</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">
                    {competitor.features.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Features Compared</div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Comparison Table */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Feature-by-Feature Comparison
              </h2>
              
              <div className="max-w-4xl mx-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Feature</TableHead>
                      <TableHead className="text-center bg-primary/5">DigsAndGigs</TableHead>
                      <TableHead className="text-center">{competitor.name}</TableHead>
                      <TableHead className="text-center w-[120px]">Winner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {competitor.features.map((feature, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{feature.feature}</TableCell>
                        <TableCell className="text-center bg-primary/5">
                          <div className="flex justify-center">
                            {renderFeatureValue(feature.digsandgigs, feature.advantage === 'digsandgigs')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {renderFeatureValue(feature.competitor, feature.advantage === 'competitor')}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {feature.advantage === 'digsandgigs' && (
                            <Badge className="bg-green-600">DigsAndGigs</Badge>
                          )}
                          {feature.advantage === 'competitor' && (
                            <Badge variant="secondary">{competitor.name}</Badge>
                          )}
                          {feature.advantage === 'tie' && (
                            <Badge variant="outline">Tie</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </section>

          {/* Pros and Cons */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* DigsAndGigs */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">DigsAndGigs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Pros
                      </h4>
                      <ul className="space-y-2">
                        {competitor.prosDigsAndGigs.map((pro, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-600 mt-1">+</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <XCircle className="h-5 w-5" /> Cons
                      </h4>
                      <ul className="space-y-2">
                        {competitor.consDigsAndGigs.map((con, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-600 mt-1">-</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Competitor */}
                <Card>
                  <CardHeader>
                    <CardTitle>{competitor.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" /> Pros
                      </h4>
                      <ul className="space-y-2">
                        {competitor.prosCompetitor.map((pro, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-green-600 mt-1">+</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <XCircle className="h-5 w-5" /> Cons
                      </h4>
                      <ul className="space-y-2">
                        {competitor.consCompetitor.map((con, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-red-600 mt-1">-</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Verdict */}
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-xl">Our Verdict</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {competitor.verdict}
                    </p>
                    
                    <div className="grid md:grid-cols-2 gap-4 pt-4">
                      <div className="p-4 bg-primary/5 rounded-lg">
                        <h4 className="font-semibold text-primary mb-2">Choose DigsAndGigs if...</h4>
                        <p className="text-sm text-muted-foreground">
                          {competitor.bestFor.digsandgigs}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Choose {competitor.name} if...</h4>
                        <p className="text-sm text-muted-foreground">
                          {competitor.bestFor.competitor}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Other Comparisons */}
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
                Other Comparisons
              </h2>
              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {otherComparisons.map((other) => (
                  <Link key={other.slug} to={`/compare/${other.slug}`}>
                    <Card className="hover:shadow-md transition-shadow hover:border-primary/50">
                      <CardContent className="p-6">
                        <div className="font-semibold text-foreground mb-2">
                          vs {other.name}
                        </div>
                        <div className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {other.description}
                        </div>
                        <div className="text-primary text-sm flex items-center">
                          Compare <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Make the Switch?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join DigsAndGigs today and experience transparent pricing, exclusive leads, and better conversion rates.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register?role=digger"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  Start Free Today
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm hover:bg-accent"
                >
                  View Pricing
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
