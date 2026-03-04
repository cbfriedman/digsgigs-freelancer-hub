import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, ArrowRight, Users, Building, DollarSign, TrendingUp, Link, ExternalLink, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
      checkPageBreak(70);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Revenue Model Flow Chart', margin, yPos);
      yPos += 10;

      // Draw flow chart boxes - smaller and centered
      const boxWidth = 45;
      const boxHeight = 18;
      const gap = 15;
      const totalWidth = (boxWidth * 3) + (gap * 4); // 3 boxes + 4 gaps (for arrows)
      const startX = (pageWidth - totalWidth) / 2;

      // Digger box
      doc.setDrawColor(79, 70, 229);
      doc.setFillColor(245, 245, 255);
      doc.roundedRect(startX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('DIGGER', startX + boxWidth / 2, yPos + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('(Service Provider)', startX + boxWidth / 2, yPos + 12, { align: 'center' });

      // Arrow 1
      const arrow1X = startX + boxWidth;
      doc.setDrawColor(100);
      doc.line(arrow1X + 2, yPos + boxHeight / 2, arrow1X + gap - 2, yPos + boxHeight / 2);
      doc.setFontSize(7);
      doc.text('$', arrow1X + gap / 2, yPos + boxHeight / 2 - 2, { align: 'center' });

      // Platform box
      const platformX = startX + boxWidth + gap;
      doc.setDrawColor(34, 197, 94);
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(platformX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PLATFORM', platformX + boxWidth / 2, yPos + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('(Digs & Gigs)', platformX + boxWidth / 2, yPos + 12, { align: 'center' });

      // Arrow 2
      const arrow2X = platformX + boxWidth;
      doc.setDrawColor(100);
      doc.line(arrow2X + 2, yPos + boxHeight / 2, arrow2X + gap - 2, yPos + boxHeight / 2);
      doc.setFontSize(6);
      doc.text('Leads', arrow2X + gap / 2, yPos + boxHeight / 2 - 2, { align: 'center' });

      // Gigger box
      const giggerX = platformX + boxWidth + gap;
      doc.setDrawColor(249, 115, 22);
      doc.setFillColor(255, 247, 237);
      doc.roundedRect(giggerX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('GIGGER', giggerX + boxWidth / 2, yPos + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text('(Consumer)', giggerX + boxWidth / 2, yPos + 12, { align: 'center' });

      yPos += boxHeight + 12;

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
          ['Unified Subscription Pricing', 'COMPLETE'],
          ['Four Lead Reveal Types', 'COMPLETE'],
          ['Profile Discovery Opt-in', 'COMPLETE'],
          ['Geographic Multipliers', 'COMPLETE'],
          ['Confirmed Lead Premium (+50%)', 'COMPLETE'],
          ['High-Value Industry Detection', 'COMPLETE'],
          ['12-Month Price Lock', 'COMPLETE'],
          ['2 Free Accumulating Leads/Month', 'COMPLETE'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          1: { fontStyle: 'bold', textColor: [34, 139, 34] }
        },
        margin: { left: margin, right: margin },
      });

      // SEO & Backlink Strategy
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('SEO & Backlink Strategy', margin, yPos);
      yPos += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const seoIntro = 'Domain Authority (DA) is a 0-100 score developed by Moz that predicts how well a website will rank on search engines. Higher DA sites pass more "link juice" to your site, improving your search rankings. A backlink from a DA 50+ site is worth significantly more than multiple links from low DA sites.';
      const seoLines = doc.splitTextToSize(seoIntro, contentWidth);
      doc.text(seoLines, margin, yPos);
      yPos += seoLines.length * 5 + 8;

      // Free/Low-Cost Backlinks
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Free/Low-Cost Backlinks ($0-$50)', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Platform', 'Type', 'Est. DA', 'Cost', 'Action Required']],
        body: [
          ['Google Business Profile', 'Business Listing', '95+', 'Free', 'Claim & optimize listing'],
          ['Bing Places', 'Business Listing', '90+', 'Free', 'Submit business info'],
          ['Yelp', 'Business Listing', '90+', 'Free', 'Create business profile'],
          ['LinkedIn Company Page', 'Social Profile', '95+', 'Free', 'Create company page'],
          ['Crunchbase', 'Startup Directory', '90+', 'Free', 'Submit company profile'],
          ['AngelList', 'Startup Directory', '85+', 'Free', 'Create startup profile'],
          ['Product Hunt', 'Product Launch', '90+', 'Free', 'Submit for launch'],
          ['HARO (Help a Reporter)', 'PR/Media', 'Varies', 'Free', 'Respond to queries'],
          ['Medium', 'Content Platform', '95+', 'Free', 'Publish guest articles'],
          ['Quora', 'Q&A Platform', '90+', 'Free', 'Answer industry questions'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Mid-Range Backlinks
      checkPageBreak(60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Mid-Range Backlinks ($100-$500)', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Platform', 'Type', 'Est. DA', 'Cost', 'SEO Value']],
        body: [
          ['Clutch.co', 'B2B Directory', 'DA 70', '$300-$500', 'High - Trusted B2B reviews'],
          ['G2', 'Software Reviews', 'DA 80', '$200-$400', 'Very High - Tech authority'],
          ['Capterra', 'Software Directory', 'DA 80', '$100-$300', 'Very High - Established platform'],
          ['GoodFirms', 'Service Directory', 'DA 60', '$150-$300', 'Medium-High - Growing authority'],
          ['Software Advice', 'Review Platform', 'DA 75', '$200-$400', 'High - Gartner owned'],
          ['Chamber of Commerce', 'Business Network', 'DA 50-70', '$200-$500/yr', 'Medium-High - Local authority'],
          ['BBB Accreditation', 'Trust Badge', 'DA 80', '$400-$600/yr', 'High - Trust signal'],
          ['Industry Podcasts', 'Media Outreach', 'DA 40-70', '$200-$500', 'Medium - Niche relevance'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Premium Backlinks
      checkPageBreak(60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Premium Backlinks ($500-$2,000+)', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Platform', 'Type', 'Est. DA', 'Cost', 'SEO Value']],
        body: [
          ['Forbes Councils', 'Contributed Content', 'DA 95', '$1,200-$2,400/yr', 'Exceptional - Top-tier authority'],
          ['Entrepreneur.com', 'Sponsored Content', 'DA 92', '$1,500-$3,000', 'Exceptional - Business authority'],
          ['Inc.com', 'Sponsored Article', 'DA 92', '$1,000-$2,500', 'Exceptional - Business media'],
          ['TechCrunch', 'Press Coverage', 'DA 94', '$500-$2,000 (PR)', 'Exceptional - Tech authority'],
          ['Business Insider', 'Sponsored/PR', 'DA 94', '$2,000-$5,000', 'Exceptional - Wide reach'],
          ['HubSpot Guest Post', 'Content Partner', 'DA 93', '$500-$1,500', 'Very High - Marketing authority'],
          ['Neil Patel Blog', 'Outreach/Guest', 'DA 90', '$500-$1,000', 'Very High - SEO niche'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Service Industry Specific
      checkPageBreak(60);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Service Industry Specific Backlinks', margin, yPos);
      yPos += 6;

      autoTable(doc, {
        startY: yPos,
        head: [['Platform', 'Target Industry', 'Est. DA', 'Cost']],
        body: [
          ['HomeAdvisor/Angi', 'Home Services', 'DA 80', 'Free-$350/yr'],
          ['Thumbtack', 'General Services', 'DA 70', 'Free listing'],
          ['Houzz Pro', 'Home Services', 'DA 85', '$300-$600/mo'],
          ['Avvo', 'Legal', 'DA 75', 'Free-$500/mo'],
          ['FindLaw', 'Legal', 'DA 70', '$300-$800/mo'],
          ['Martindale-Hubbell', 'Legal', 'DA 70', '$200-$500/yr'],
          ['Expertise.com', 'Various Services', 'DA 65', 'Free (earned)'],
          ['Trade Association Sites', 'Industry-specific', 'DA 40-60', '$100-$500/yr'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: margin, right: margin },
      });
      yPos = (doc as any).lastAutoTable.finalY + 12;

      // Priority Actions
      checkPageBreak(50);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Priority Backlink Actions (Recommended Order)', margin, yPos);
      yPos += 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const priorities = [
        '1. IMMEDIATE (Week 1): Google Business Profile, LinkedIn, Bing Places, Yelp - All free, high DA',
        '2. WEEK 2-4: Crunchbase, AngelList, Product Hunt launch - Free startup visibility',
        '3. MONTH 2: Clutch.co, G2, Capterra listings - Paid but high conversion value',
        '4. MONTH 3: Chamber of Commerce, BBB Accreditation - Trust signals',
        '5. ONGOING: HARO responses, Medium articles, Quora answers - Content marketing',
        '6. QUARTERLY: Industry podcasts, guest posts, trade publications - Authority building',
        '7. ANNUALLY: Forbes Councils or similar premium placement - Major credibility boost',
      ];
      priorities.forEach(priority => {
        const pLines = doc.splitTextToSize(priority, contentWidth);
        doc.text(pLines, margin, yPos);
        yPos += pLines.length * 4 + 2;
      });

      yPos += 8;
      doc.setFont('helvetica', 'bold');
      doc.text('Estimated Total Investment:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('• Year 1 Minimum (Free + Essential): $1,000-$2,000', margin + 5, yPos);
      yPos += 5;
      doc.text('• Year 1 Moderate (Add mid-range): $3,000-$5,000', margin + 5, yPos);
      yPos += 5;
      doc.text('• Year 1 Aggressive (Include premium): $8,000-$15,000', margin + 5, yPos);

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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Prominent Download Section */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Digs & Gigs Business Plan</h1>
                <p className="text-muted-foreground text-lg">
                  Lead Generation & Service Marketplace Platform
                </p>
              </div>
              <Button 
                onClick={generatePDF} 
                disabled={isGenerating}
                size="lg"
                className="gap-2 px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <Download className="h-6 w-6" />
                {isGenerating ? 'Generating PDF...' : 'Download Complete PDF'}
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <div className="text-3xl font-bold text-primary">12</div>
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

        {/* SEO & Backlink Strategy Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              SEO & Backlink Strategy
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p><strong>Domain Authority (DA)</strong> is a 0-100 score by Moz predicting how well a site ranks. Higher DA = more valuable backlink. DA 50+ is considered good, DA 70+ is excellent.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              <strong>DA (Domain Authority)</strong> is a search engine ranking score from 0-100 developed by Moz. 
              Higher DA sites pass more "link juice" to improve your rankings. A single DA 80+ backlink can be worth more than dozens of low-quality links.
            </p>

            {/* Free/Low-Cost */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-500/10 text-green-700">Free - $50</Badge>
                Free/Low-Cost Backlinks
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Est. DA</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Google Business Profile</TableCell>
                    <TableCell>Business Listing</TableCell>
                    <TableCell><Badge variant="outline">DA 95+</Badge></TableCell>
                    <TableCell className="text-green-600 font-semibold">Free</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">LinkedIn Company Page</TableCell>
                    <TableCell>Social Profile</TableCell>
                    <TableCell><Badge variant="outline">DA 95+</Badge></TableCell>
                    <TableCell className="text-green-600 font-semibold">Free</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Crunchbase</TableCell>
                    <TableCell>Startup Directory</TableCell>
                    <TableCell><Badge variant="outline">DA 90+</Badge></TableCell>
                    <TableCell className="text-green-600 font-semibold">Free</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Product Hunt</TableCell>
                    <TableCell>Product Launch</TableCell>
                    <TableCell><Badge variant="outline">DA 90+</Badge></TableCell>
                    <TableCell className="text-green-600 font-semibold">Free</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">HARO</TableCell>
                    <TableCell>PR/Media</TableCell>
                    <TableCell><Badge variant="outline">Varies</Badge></TableCell>
                    <TableCell className="text-green-600 font-semibold">Free</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Mid-Range */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-700">$100 - $500</Badge>
                Mid-Range Backlinks
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Est. DA</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>SEO Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Clutch.co</TableCell>
                    <TableCell>B2B Directory</TableCell>
                    <TableCell><Badge variant="outline">DA 70</Badge></TableCell>
                    <TableCell>$300-$500</TableCell>
                    <TableCell><Badge className="bg-green-500">High</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">G2</TableCell>
                    <TableCell>Software Reviews</TableCell>
                    <TableCell><Badge variant="outline">DA 80</Badge></TableCell>
                    <TableCell>$200-$400</TableCell>
                    <TableCell><Badge className="bg-green-600">Very High</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Capterra</TableCell>
                    <TableCell>Software Directory</TableCell>
                    <TableCell><Badge variant="outline">DA 80</Badge></TableCell>
                    <TableCell>$100-$300</TableCell>
                    <TableCell><Badge className="bg-green-600">Very High</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">BBB Accreditation</TableCell>
                    <TableCell>Trust Badge</TableCell>
                    <TableCell><Badge variant="outline">DA 80</Badge></TableCell>
                    <TableCell>$400-$600/yr</TableCell>
                    <TableCell><Badge className="bg-green-500">High</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Premium */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">$500 - $2,000+</Badge>
                Premium Backlinks
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Est. DA</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>SEO Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Forbes Councils</TableCell>
                    <TableCell>Contributed Content</TableCell>
                    <TableCell><Badge variant="outline">DA 95</Badge></TableCell>
                    <TableCell>$1,200-$2,400/yr</TableCell>
                    <TableCell><Badge className="bg-primary">Exceptional</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Entrepreneur.com</TableCell>
                    <TableCell>Sponsored Content</TableCell>
                    <TableCell><Badge variant="outline">DA 92</Badge></TableCell>
                    <TableCell>$1,500-$3,000</TableCell>
                    <TableCell><Badge className="bg-primary">Exceptional</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">TechCrunch</TableCell>
                    <TableCell>Press Coverage</TableCell>
                    <TableCell><Badge variant="outline">DA 94</Badge></TableCell>
                    <TableCell>$500-$2,000 (PR)</TableCell>
                    <TableCell><Badge className="bg-primary">Exceptional</Badge></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">HubSpot Guest Post</TableCell>
                    <TableCell>Content Partner</TableCell>
                    <TableCell><Badge variant="outline">DA 93</Badge></TableCell>
                    <TableCell>$500-$1,500</TableCell>
                    <TableCell><Badge className="bg-green-600">Very High</Badge></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Investment Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4">Estimated Annual Investment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-green-600">$1,000-$2,000</div>
                    <div className="text-sm text-muted-foreground">Minimum (Free + Essential)</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">$3,000-$5,000</div>
                    <div className="text-sm text-muted-foreground">Moderate (+ Mid-range)</div>
                  </div>
                  <div className="text-center p-4 bg-background rounded-lg">
                    <div className="text-2xl font-bold text-primary">$8,000-$15,000</div>
                    <div className="text-sm text-muted-foreground">Aggressive (+ Premium)</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default BusinessPlan;
