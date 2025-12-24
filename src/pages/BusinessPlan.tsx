import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ArrowRight, Users, Building, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
const BusinessPlan = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // Helper function to add page if needed
      const checkPageBreak = (requiredSpace: number) => {
        if (yPos + requiredSpace > 270) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Digs & Gigs Business Plan', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text('Lead Generation & Service Marketplace Platform', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      doc.setTextColor(0);

      // Executive Summary
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Executive Summary', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const execSummary = 'Digs & Gigs is a two-sided marketplace connecting service providers (Diggers) with consumers (Giggers). Revenue is generated through subscription fees, per-lead reveal charges, and profile discovery fees. The platform offers significant cost savings compared to traditional advertising channels like Google Ads.';
      const summaryLines = doc.splitTextToSize(execSummary, contentWidth);
      doc.text(summaryLines, margin, yPos);
      yPos += summaryLines.length * 5 + 10;

      // Revenue Model Flow Chart (simplified text representation)
      checkPageBreak(60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Model Flow Chart', margin, yPos);
      yPos += 10;

      // Draw flow chart boxes
      const boxWidth = 50;
      const boxHeight = 20;
      const startX = 25;

      // Digger box
      doc.setDrawColor(79, 70, 229);
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(startX, yPos, boxWidth, boxHeight, 3, 3, 'FD');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('DIGGER', startX + boxWidth / 2, yPos + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('(Service Provider)', startX + boxWidth / 2, yPos + 14, { align: 'center' });

      // Arrow 1
      doc.setDrawColor(100);
      doc.line(startX + boxWidth + 5, yPos + boxHeight / 2, startX + boxWidth + 20, yPos + boxHeight / 2);
      doc.text('$', startX + boxWidth + 10, yPos + boxHeight / 2 - 3);

      // Platform box
      const platformX = startX + boxWidth + 25;
      doc.setDrawColor(34, 197, 94);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(platformX, yPos, boxWidth, boxHeight, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('PLATFORM', platformX + boxWidth / 2, yPos + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('(Digs & Gigs)', platformX + boxWidth / 2, yPos + 14, { align: 'center' });

      // Arrow 2
      doc.setDrawColor(100);
      doc.line(platformX + boxWidth + 5, yPos + boxHeight / 2, platformX + boxWidth + 20, yPos + boxHeight / 2);
      doc.text('Leads', platformX + boxWidth + 7, yPos + boxHeight / 2 - 3);

      // Gigger box
      const giggerX = platformX + boxWidth + 25;
      doc.setDrawColor(249, 115, 22);
      doc.setFillColor(255, 247, 237);
      doc.roundedRect(giggerX, yPos, boxWidth, boxHeight, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.text('GIGGER', giggerX + boxWidth / 2, yPos + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('(Consumer)', giggerX + boxWidth / 2, yPos + 14, { align: 'center' });

      yPos += boxHeight + 15;

      // Revenue streams below
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Streams:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('1. Subscriptions ($29-$299/mo)', margin + 5, yPos);
      yPos += 4;
      doc.text('2. Lead Reveals ($16.50-$158.40/lead)', margin + 5, yPos);
      yPos += 4;
      doc.text('3. Profile Discovery ($85-$510/contact)', margin + 5, yPos);
      yPos += 12;

      // Subscription Pricing
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Subscription Pricing', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Geographic Tier', 'Monthly Price', 'Annual Price', 'Key Features']],
        body: [
          ['Local (25mi radius)', '$29/month', '$290/year (save $58)', '2 free leads/mo, price lock'],
          ['Statewide', '$59/month + $15/state', 'Max $199/month', 'Multi-state coverage'],
          ['Nationwide', '$299/month', '$2,990/year', 'Full US coverage'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Lead Reveal Pricing
      checkPageBreak(60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Lead Reveal Pricing (Digger → Gigger)', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Subscriber Rates:', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Lead Type', 'Local', 'Statewide', 'Nationwide']],
        body: [
          ['Standard (Unconfirmed)', '$16.50', '$33.00', '$49.50'],
          ['Standard (Confirmed)', '$24.75', '$49.50', '$74.25'],
          ['High-Value (Unconfirmed)', '$35.20', '$70.40', '$105.60'],
          ['High-Value (Confirmed)', '$52.80', '$105.60', '$158.40'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Formula: Base CPL × Geographic Multiplier × Confirmed Premium (1.5x if confirmed)', margin, yPos);
      yPos += 12;

      // Profile Discovery Pricing
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. Profile Discovery Pricing (Gigger → Digger)', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Industry Type', 'Local', 'Statewide', 'Nationwide']],
        body: [
          ['Standard Industries', '$85', '$170', '$255'],
          ['High-Value Industries', '$170', '$340', '$510'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // High-Value Industries
      checkPageBreak(40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('High-Value Industries', margin, yPos);
      yPos += 7;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const hvIndustries = 'Attorney/Lawyer, CPA/Accountant, Financial Advisor, Real Estate Agent, Insurance Agent, Mortgage Broker, Business Consultant, Marketing Consultant, Investment Advisor, Tax Preparer, Wealth Manager, Estate Planner, Business Broker, Commercial Real Estate, Mergers & Acquisitions';
      const hvLines = doc.splitTextToSize(hvIndustries, contentWidth);
      doc.text(hvLines, margin, yPos);
      yPos += hvLines.length * 4 + 10;

      // Competitive Comparison
      checkPageBreak(60);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Competitive Comparison vs. Google Ads', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Service Category', 'Google CPC', 'Our Cost', 'Savings']],
        body: [
          ['Plumber', '$41.30', '$16.50', '60%'],
          ['Electrician', '$18.89', '$16.50', '12%'],
          ['HVAC', '$52.14', '$16.50', '68%'],
          ['Attorney', '$196.31', '$35.20', '82%'],
          ['CPA/Accountant', '$69.42', '$35.20', '49%'],
          ['Real Estate Agent', '$41.03', '$35.20', '14%'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Revenue Projections
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Projections', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Conservative', 'Moderate', 'Optimistic']],
        body: [
          ['Monthly Subscription ARPU', '$29', '$59', '$149'],
          ['Lead Reveals/Digger/Month', '3', '5', '10'],
          ['Lead Revenue/Digger/Month', '$50', '$100', '$250'],
          ['Total ARPU', '$79', '$159', '$399'],
          ['Platform (1,000 Diggers)', '$79,000/mo', '$159,000/mo', '$399,000/mo'],
          ['Platform (10,000 Diggers)', '$790,000/mo', '$1.59M/mo', '$3.99M/mo'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Implementation Status
      checkPageBreak(50);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Implementation Status', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Feature', 'Status']],
        body: [
          ['Unified Subscription Pricing', '✓ Implemented'],
          ['Four Lead Reveal Types', '✓ Implemented'],
          ['Profile Discovery Opt-in', '✓ Implemented'],
          ['Geographic Multipliers', '✓ Implemented'],
          ['Confirmed Lead Premium (+50%)', '✓ Implemented'],
          ['High-Value Industry Detection', '✓ Implemented'],
          ['12-Month Price Lock', '✓ Implemented'],
          ['2 Free Accumulating Leads/Month', '✓ Implemented'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin },
      });

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount} | Digs & Gigs Business Plan`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save('DigsAndGigs_BusinessPlan.pdf');
      toast.success('Business plan PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Digs & Gigs Business Plan</h1>
          <p className="text-muted-foreground text-lg mb-6">
            Lead Generation & Service Marketplace Platform
          </p>
          <Button 
            onClick={generatePDF} 
            disabled={isGenerating}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isGenerating ? 'Generating PDF...' : 'Download Business Plan PDF'}
          </Button>
        </div>

        {/* Flow Chart Visual */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Model Flow Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-8">
              {/* Digger */}
              <div className="flex flex-col items-center">
                <div className="w-40 h-24 bg-primary/10 border-2 border-primary rounded-xl flex flex-col items-center justify-center">
                  <Users className="h-8 w-8 text-primary mb-1" />
                  <span className="font-bold text-primary">DIGGER</span>
                  <span className="text-xs text-muted-foreground">Service Provider</span>
                </div>
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  Pays subscriptions<br />+ lead reveals
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <ArrowRight className="h-8 w-8 text-green-500 hidden md:block" />
                <div className="md:hidden h-8 w-8 text-green-500 rotate-90">
                  <ArrowRight className="h-8 w-8" />
                </div>
                <span className="text-sm font-bold text-green-600">$$$</span>
              </div>

              {/* Platform */}
              <div className="flex flex-col items-center">
                <div className="w-40 h-24 bg-green-500/10 border-2 border-green-500 rounded-xl flex flex-col items-center justify-center">
                  <Building className="h-8 w-8 text-green-600 mb-1" />
                  <span className="font-bold text-green-600">PLATFORM</span>
                  <span className="text-xs text-muted-foreground">Digs & Gigs</span>
                </div>
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  Matches leads<br />Processes payments
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center">
                <ArrowRight className="h-8 w-8 text-orange-500 hidden md:block" />
                <div className="md:hidden h-8 w-8 text-orange-500 rotate-90">
                  <ArrowRight className="h-8 w-8" />
                </div>
                <span className="text-sm font-bold text-orange-600">Leads</span>
              </div>

              {/* Gigger */}
              <div className="flex flex-col items-center">
                <div className="w-40 h-24 bg-orange-500/10 border-2 border-orange-500 rounded-xl flex flex-col items-center justify-center">
                  <FileText className="h-8 w-8 text-orange-600 mb-1" />
                  <span className="font-bold text-orange-600">GIGGER</span>
                  <span className="text-xs text-muted-foreground">Consumer</span>
                </div>
                <div className="mt-2 text-xs text-center text-muted-foreground">
                  Posts jobs<br />Receives quotes
                </div>
              </div>
            </div>

            {/* Revenue Streams */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center p-4 bg-primary/5 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="font-bold text-primary">Subscriptions</div>
                <div className="text-sm text-muted-foreground">$29 - $299/month</div>
              </div>
              <div className="text-center p-4 bg-green-500/5 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="font-bold text-green-600">Lead Reveals</div>
                <div className="text-sm text-muted-foreground">$16.50 - $158.40/lead</div>
              </div>
              <div className="text-center p-4 bg-orange-500/5 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <div className="font-bold text-orange-600">Profile Discovery</div>
                <div className="text-sm text-muted-foreground">$85 - $510/contact</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-primary">$29</div>
              <div className="text-sm text-muted-foreground">Starting Subscription</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-green-600">60%</div>
              <div className="text-sm text-muted-foreground">Avg. Google Ads Savings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-orange-600">2</div>
              <div className="text-sm text-muted-foreground">Free Leads/Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-purple-600">12</div>
              <div className="text-sm text-muted-foreground">Month Price Lock</div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Tables Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Local (25mi)</span>
                  <span className="font-bold">$29/mo</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Statewide</span>
                  <span className="font-bold">$59/mo + $15/state</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Nationwide</span>
                  <span className="font-bold">$299/mo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Reveal Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Standard (Unconfirmed)</span>
                  <span className="font-bold">$16.50 - $49.50</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>Standard (Confirmed)</span>
                  <span className="font-bold">$24.75 - $74.25</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>High-Value (Unconfirmed)</span>
                  <span className="font-bold">$35.20 - $105.60</span>
                </div>
                <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                  <span>High-Value (Confirmed)</span>
                  <span className="font-bold">$52.80 - $158.40</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BusinessPlan;
