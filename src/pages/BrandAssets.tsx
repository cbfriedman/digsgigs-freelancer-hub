import { useState } from "react";
import { Footer } from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

const BrandAssets = () => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const colors = [
    { name: "Primary Purple", hex: "#5B21B6", hsl: "250 70% 45%", usage: "Gradient start, primary actions" },
    { name: "Accent Orange", hex: "#F97316", hsl: "25 95% 53%", usage: "Gradient end, highlights" },
    { name: "Dark Gray", hex: "#1F2937", hsl: "215 28% 17%", usage: "Body text, headings" },
    { name: "White", hex: "#FFFFFF", hsl: "0 0% 100%", usage: "Backgrounds, text on dark" },
  ];

  const copyToClipboard = (text: string, colorName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(colorName);
    toast.success(`Copied ${text} to clipboard`);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Digs&Gigs Brand Guidelines", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("For Freelancers, Partners & Media", pageWidth / 2, y, { align: "center" });
    y += 20;

    // Wordmark Section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("1. Wordmark", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("The official wordmark is: Digs&Gigs", 20, y);
    y += 7;
    doc.text("• Use ampersand (&), not 'and'", 25, y);
    y += 6;
    doc.text("• No spaces between words", 25, y);
    y += 6;
    doc.text("• Capital D and G only", 25, y);
    y += 15;

    // Colors Section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("2. Brand Colors", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    colors.forEach((color) => {
      doc.text(`${color.name}: ${color.hex}`, 25, y);
      y += 6;
    });
    y += 5;

    doc.text("Gradient: Linear gradient from Primary Purple (#5B21B6) to Accent Orange (#F97316)", 20, y);
    y += 7;
    doc.text("Direction: Left to right (90 degrees)", 20, y);
    y += 15;

    // Typography Section
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("3. Typography", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Wordmark Font: System sans-serif, Bold weight", 25, y);
    y += 6;
    doc.text("Marketing Materials: Inter or similar modern sans-serif", 25, y);
    y += 15;

    // Usage Guidelines
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("4. Usage Guidelines", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DO:", 25, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("• Use the gradient on light backgrounds", 30, y);
    y += 6;
    doc.text("• Maintain adequate spacing around the wordmark", 30, y);
    y += 6;
    doc.text("• Keep the exact spelling: Digs&Gigs", 30, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.text("DON'T:", 25, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.text("• Alter or substitute the brand colors", 30, y);
    y += 6;
    doc.text("• Add effects (shadows, outlines, glows)", 30, y);
    y += 6;
    doc.text("• Stretch, distort, or rotate the wordmark", 30, y);
    y += 6;
    doc.text("• Use alternate spellings (Digs and Gigs, DigsAndGigs)", 30, y);
    y += 15;

    // Website & CTA
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("5. Website & Call-to-Action", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Primary URL: DigsandGigs.net", 25, y);
    y += 10;

    doc.text("Preferred CTAs:", 25, y);
    y += 7;
    doc.text("• \"Post your project FREE at DigsandGigs.net\"", 30, y);
    y += 6;
    doc.text("• \"Find skilled pros at DigsandGigs.net\"", 30, y);
    y += 6;
    doc.text("• \"Visit DigsandGigs.net\"", 30, y);
    y += 15;

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(128);
    doc.text(`Generated ${new Date().toLocaleDateString()} | DigsandGigs.net`, pageWidth / 2, 280, { align: "center" });

    doc.save("DigsandGigs-Brand-Guidelines.pdf");
    toast.success("Brand guidelines downloaded!");
  };

  return (
    <>
      <SEOHead
        title="Brand Assets | Digs&Gigs"
        description="Official Digs&Gigs brand guidelines, colors, and assets for freelancers, partners, and media."
      />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Brand Assets</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Official brand guidelines for freelancers, partners, and media. Use these resources to maintain consistency when representing Digs&Gigs.
            </p>
          </div>

          {/* Wordmark Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Wordmark</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Light Background */}
                <div className="p-8 bg-white rounded-lg border flex items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Digs&Gigs
                  </span>
                </div>
                
                {/* Dark Background */}
                <div className="p-8 bg-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Digs&Gigs
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">Correct Spelling:</p>
                <code className="text-lg font-mono bg-background px-3 py-1 rounded">Digs&Gigs</code>
                <ul className="mt-3 text-sm text-muted-foreground space-y-1">
                  <li>• Use ampersand (&), not "and"</li>
                  <li>• No spaces between words</li>
                  <li>• Capital D and G only</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {colors.map((color) => (
                  <div key={color.name} className="border rounded-lg overflow-hidden">
                    <div 
                      className="h-24 cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                      style={{ backgroundColor: color.hex }}
                      onClick={() => copyToClipboard(color.hex, color.name)}
                    >
                      {copiedColor === color.name ? (
                        <Check className={`w-6 h-6 ${color.hex === "#FFFFFF" ? "text-gray-800" : "text-white"}`} />
                      ) : (
                        <Copy className={`w-5 h-5 opacity-50 ${color.hex === "#FFFFFF" ? "text-gray-800" : "text-white"}`} />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm">{color.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                      <p className="text-xs text-muted-foreground mt-1">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gradient Example */}
              <div className="border rounded-lg overflow-hidden">
                <div className="h-16 bg-gradient-to-r from-primary to-accent" />
                <div className="p-4">
                  <p className="font-medium mb-2">Brand Gradient</p>
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded block">
                    background: linear-gradient(90deg, #5B21B6, #F97316);
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Typography</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <Badge className="mb-2">Wordmark</Badge>
                  <p className="text-2xl font-bold">System Sans-Serif, Bold</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    font-family: system-ui, -apple-system, sans-serif; font-weight: 700;
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <Badge variant="secondary" className="mb-2">Marketing Materials</Badge>
                  <p className="text-2xl font-medium">Inter or similar modern sans-serif</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clean, professional, and highly readable
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Guidelines */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Usage Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Do's */}
                <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700 dark:text-green-400">Do</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Use the gradient on light backgrounds</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Maintain adequate spacing around the wordmark</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Keep the exact spelling: Digs&Gigs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Use on video end screens and thumbnails</span>
                    </li>
                  </ul>
                </div>

                {/* Don'ts */}
                <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-700 dark:text-red-400">Don't</span>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <span>Alter or substitute the brand colors</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <span>Add effects (shadows, outlines, glows)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <span>Stretch, distort, or rotate the wordmark</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <X className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <span>Use alternate spellings (Digs and Gigs)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Website & CTA */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Website & Call-to-Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Primary URL</p>
                <code className="text-xl font-mono bg-muted px-4 py-2 rounded-lg inline-block">
                  DigsandGigs.net
                </code>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-3">Preferred CTAs for Videos & Campaigns</p>
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg font-medium">
                    "Post your project FREE at DigsandGigs.net"
                  </div>
                  <div className="p-3 bg-muted rounded-lg font-medium">
                    "Find skilled pros at DigsandGigs.net"
                  </div>
                  <div className="p-3 bg-muted rounded-lg font-medium">
                    "Visit DigsandGigs.net"
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Download Section */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="py-8 text-center">
              <h3 className="text-xl font-bold mb-2">Download Brand Guidelines</h3>
              <p className="text-muted-foreground mb-6">
                Get a PDF version of these guidelines to share with your team.
              </p>
              <Button size="lg" onClick={generatePDF}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default BrandAssets;
