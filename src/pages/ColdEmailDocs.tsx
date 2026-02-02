import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mail, 
  Brain, 
  Clock, 
  Users, 
  Database, 
  Zap, 
  FileText,
  CheckCircle,
  ArrowRight,
  Code,
  Upload
} from "lucide-react";

const ColdEmailDocs = () => {
  const industries = [
    "Plumbing", "Electrical", "HVAC", "Roofing", "Landscaping",
    "Cleaning", "Painting", "Flooring", "Carpentry", "Pest Control",
    "Pool Services", "Appliance Repair", "Locksmith", "Moving",
    "Handyman", "Concrete", "Fencing", "Garage Doors", "Gutters",
    "Home Inspection", "Interior Design", "Kitchen Remodeling",
    "Bathroom Remodeling", "Solar Installation", "Window Installation",
    "Siding", "Tree Service", "Pressure Washing", "Chimney Services",
    "Foundation Repair", "Waterproofing", "Demolition", "Excavation",
    "Masonry", "Tile Work", "Drywall", "Insulation", "Security Systems",
    "Smart Home", "General Contractor"
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Documentation</Badge>
          <h1 className="text-4xl font-bold mb-4">AI Cold Email System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Automated, AI-powered cold email campaigns that generate personalized content based on industry and lead type.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="architecture">Architecture</TabsTrigger>
            <TabsTrigger value="usage">How to Use</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  What is the AI Cold Email System?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  The AI Cold Email System is an automated outreach platform that generates <strong>personalized, 
                  industry-specific emails</strong> for both Diggers (service providers) and Giggers (customers). 
                  Unlike static templates, each email is dynamically crafted by AI to address specific pain points 
                  and value propositions relevant to the recipient's industry.
                </p>
                
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Mail className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Personalized Content</h3>
                    <p className="text-sm text-muted-foreground">
                      AI generates unique subject lines, preheaders, and body content for each recipient
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Clock className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">4-Step Drip Sequence</h3>
                    <p className="text-sm text-muted-foreground">
                      Automated follow-up emails spaced 3 days apart for maximum engagement
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Dual Audience</h3>
                    <p className="text-sm text-muted-foreground">
                      Separate messaging strategies for Diggers and Giggers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Sequence Flow */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  The 4-Step Email Sequence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: 1, title: "Introduction Email", desc: "Introduces the platform and primary value proposition tailored to their industry" },
                    { step: 2, title: "Social Proof Email", desc: "Shares success stories and testimonials from similar businesses (sent 3 days later)" },
                    { step: 3, title: "Pain Point Email", desc: "Addresses specific industry challenges and how the platform solves them (sent 6 days later)" },
                    { step: 4, title: "Final CTA Email", desc: "Creates urgency with a compelling final call-to-action (sent 9 days later)" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="font-semibold">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      {i < 3 && <ArrowRight className="h-5 w-5 text-muted-foreground ml-auto hidden md:block" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Architecture Tab */}
          <TabsContent value="architecture" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  System Components
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Database Tables */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Database className="h-4 w-4" /> Database Tables
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 rounded border bg-muted/30">
                        <code className="text-sm font-mono">cold_email_leads</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Stores lead data: email, name, industry, lead_type, status
                        </p>
                      </div>
                      <div className="p-3 rounded border bg-muted/30">
                        <code className="text-sm font-mono">cold_email_sequence</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Tracks sequence progress: current_step, timestamps, engagement
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Edge Functions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Code className="h-4 w-4" /> Edge Functions
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 rounded border bg-muted/30">
                        <code className="text-sm font-mono">generate-cold-email</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI-powered email content generator using Lovable AI
                        </p>
                      </div>
                      <div className="p-3 rounded border bg-muted/30">
                        <code className="text-sm font-mono">process-cold-email-sequence</code>
                        <p className="text-xs text-muted-foreground mt-1">
                          Orchestrates the drip sequence and sends emails via Resend
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flow Diagram */}
                <div className="mt-8 p-6 rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-4">Data Flow</h3>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                    <Badge variant="outline">CSV Import</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="outline">cold_email_leads</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="outline">cold_email_sequence</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge>generate-cold-email</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="outline">Resend API</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge variant="secondary">Inbox</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Generation Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Email Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  The <code className="text-sm bg-muted px-1 rounded">generate-cold-email</code> function uses 
                  Lovable AI (Gemini 2.5 Flash) to create personalized emails based on:
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Input Parameters</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <code>leadType</code> - "digger" or "gigger"</li>
                      <li>• <code>industry</code> - e.g., "Plumbing", "HVAC"</li>
                      <li>• <code>firstName</code> - Recipient's first name</li>
                      <li>• <code>step</code> - Sequence step (1-4)</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Output</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <code>subject</code> - Personalized subject line</li>
                      <li>• <code>preheader</code> - Email preview text</li>
                      <li>• <code>body</code> - Full HTML email content</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Example Prompt Context</h4>
                  <p className="text-sm text-muted-foreground">
                    "Generate a step 1 introduction email for a Plumbing professional (digger). 
                    The email should emphasize how Digs & Gigs helps plumbers find quality leads 
                    without expensive advertising, with industry-specific examples and pain points."
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Importing Leads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Navigate to <strong>Admin Dashboard → Cold Outreach</strong> tab to manage leads.</p>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">CSV Format</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left border-r">Column</th>
                          <th className="p-2 text-left border-r">Required</th>
                          <th className="p-2 text-left">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>email</code></td>
                          <td className="p-2 border-r"><CheckCircle className="h-4 w-4 text-green-500" /></td>
                          <td className="p-2">Lead's email address</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>first_name</code></td>
                          <td className="p-2 border-r">Optional</td>
                          <td className="p-2">For personalization (defaults to "there")</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>last_name</code></td>
                          <td className="p-2 border-r">Optional</td>
                          <td className="p-2">Lead's last name</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>lead_type</code></td>
                          <td className="p-2 border-r"><CheckCircle className="h-4 w-4 text-green-500" /></td>
                          <td className="p-2">"digger" or "gigger"</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>industry</code></td>
                          <td className="p-2 border-r">Recommended</td>
                          <td className="p-2">Industry for personalization</td>
                        </tr>
                        <tr className="border-t">
                          <td className="p-2 border-r"><code>source</code></td>
                          <td className="p-2 border-r">Optional</td>
                          <td className="p-2">Where the lead came from</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-semibold mb-2">Sample CSV</h4>
                    <pre className="text-xs overflow-x-auto">
{`email,first_name,last_name,lead_type,industry,source
john@example.com,John,Smith,digger,Plumbing,website
mary@example.com,Mary,Johnson,gigger,Home Renovation,referral`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Starting Sequences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3">
                  <li>
                    <strong>Import leads</strong> via CSV or add individually
                  </li>
                  <li>
                    <strong>Review leads</strong> in the table - verify industry and lead type are correct
                  </li>
                  <li>
                    <strong>Select leads</strong> using checkboxes
                  </li>
                  <li>
                    <strong>Click "Start Sequence"</strong> to initialize the drip campaign
                  </li>
                  <li>
                    The system will automatically:
                    <ul className="list-disc list-inside ml-6 mt-2 text-muted-foreground">
                      <li>Generate AI-personalized emails for each recipient</li>
                      <li>Send emails via Resend</li>
                      <li>Schedule follow-ups 3 days apart</li>
                      <li>Track opens, clicks, and conversions</li>
                    </ul>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reference Tab */}
          <TabsContent value="reference" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Supported Industries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-muted-foreground">
                  The AI generates industry-specific content for these categories:
                </p>
                <div className="flex flex-wrap gap-2">
                  {industries.map((industry) => (
                    <Badge key={industry} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  API Reference
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">generate-cold-email</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Generates personalized email content using AI.
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`POST /functions/v1/generate-cold-email

Body:
{
  "leadType": "digger" | "gigger",
  "industry": "Plumbing",
  "firstName": "John",
  "step": 1
}

Response:
{
  "subject": "...",
  "preheader": "...",
  "body": "<html>...</html>"
}`}
                  </pre>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">process-cold-email-sequence</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Processes all pending emails in the sequence queue.
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`POST /functions/v1/process-cold-email-sequence

Body: {} (no parameters required)

Response:
{
  "success": true,
  "processed": 5,
  "errors": []
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default ColdEmailDocs;
