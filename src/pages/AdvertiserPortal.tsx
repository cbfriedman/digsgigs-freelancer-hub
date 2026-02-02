import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  CreditCard, 
  Image, 
  Megaphone, 
  Plus, 
  Target, 
  TrendingUp, 
  Users,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  Mail,
  Building2,
  ArrowRight
} from "lucide-react";
import { Footer } from "@/components/Footer";

const AdvertiserPortal = () => {
  const [selectedAdType, setSelectedAdType] = useState<string>("");

  const adTypes = [
    {
      id: "sponsored_profile",
      name: "Sponsored Digger Profiles",
      description: "Boost contractor profiles to appear at the top of search results",
      price: "From $49/month",
      icon: Users,
      features: ["Premium placement in search", "Featured badge", "Priority in category pages"],
      color: "bg-blue-500"
    },
    {
      id: "banner",
      name: "Banner Ads",
      description: "Display ads on high-traffic pages across the platform",
      price: "From $199/month",
      icon: Image,
      features: ["Multiple placements", "A/B testing", "Performance analytics"],
      color: "bg-green-500"
    },
    {
      id: "category_sponsor",
      name: "Category Sponsorship",
      description: "Own an entire category page with exclusive branding",
      price: "From $499/month",
      icon: Target,
      features: ["Exclusive category placement", "Logo on all listings", "Custom messaging"],
      color: "bg-purple-500"
    },
    {
      id: "email_sponsor",
      name: "Email Sponsorship",
      description: "Feature your brand in our newsletter to 10,000+ subscribers",
      price: "From $299/send",
      icon: Mail,
      features: ["Targeted audience", "High open rates", "Direct response tracking"],
      color: "bg-orange-500"
    },
    {
      id: "featured_listing",
      name: "Featured Listings",
      description: "Highlight specific gigs or profiles with premium styling",
      price: "From $19/listing",
      icon: Megaphone,
      features: ["Eye-catching design", "Priority display", "Extended visibility"],
      color: "bg-pink-500"
    }
  ];

  // Mock data for demo
  const mockCampaigns = [
    { id: 1, name: "Holiday Promo", type: "Banner", status: "Active", spend: 450, impressions: 12500, clicks: 245, ctr: "1.96%" },
    { id: 2, name: "Plumbing Category", type: "Category Sponsor", status: "Active", spend: 499, impressions: 8200, clicks: 156, ctr: "1.90%" },
    { id: 3, name: "Newsletter Dec", type: "Email", status: "Completed", spend: 299, impressions: 10200, clicks: 312, ctr: "3.06%" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Advertiser Portal</h1>
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </div>
          <p className="text-muted-foreground text-lg">
            Reach thousands of contractors and homeowners on Digs and Gigs
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="create">Create Ad</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">30,900</div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +12% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">713</div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> +8% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. CTR</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.31%</div>
                  <p className="text-xs text-muted-foreground">Industry avg: 1.5%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">$1,248</div>
                  <p className="text-xs text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Ad Types Overview */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Ad Types</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {adTypes.map((adType) => (
                  <Card key={adType.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${adType.color} text-white`}>
                          <adType.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{adType.name}</CardTitle>
                          <p className="text-sm font-semibold text-primary">{adType.price}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{adType.description}</p>
                      <ul className="space-y-1">
                        {adType.features.map((feature, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Button variant="ghost" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground">
                        Get Started <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Why Advertise on Digs and Gigs?</h3>
                    <p className="text-muted-foreground">Reach 10,000+ active contractors and homeowners actively seeking services</p>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-primary">10K+</div>
                      <div className="text-xs text-muted-foreground">Monthly Users</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">2.3%</div>
                      <div className="text-xs text-muted-foreground">Avg. CTR</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">85%</div>
                      <div className="text-xs text-muted-foreground">Brand Recall</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Ad Tab */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Campaign
                </CardTitle>
                <CardDescription>
                  Set up a new advertising campaign to reach your target audience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Ad Type */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">1. Select Ad Type</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {adTypes.map((adType) => (
                      <Card 
                        key={adType.id}
                        className={`cursor-pointer transition-all ${selectedAdType === adType.id ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}
                        onClick={() => setSelectedAdType(adType.id)}
                      >
                        <CardContent className="pt-4 flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${adType.color} text-white`}>
                            <adType.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{adType.name}</p>
                            <p className="text-xs text-muted-foreground">{adType.price}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Step 2: Campaign Details */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">2. Campaign Details</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaign-name">Campaign Name</Label>
                      <Input id="campaign-name" placeholder="e.g., Spring Promotion 2025" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target-category">Target Category (optional)</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="electrical">Electrical</SelectItem>
                          <SelectItem value="hvac">HVAC</SelectItem>
                          <SelectItem value="roofing">Roofing</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Step 3: Creative */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">3. Ad Creative</Label>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="headline">Headline</Label>
                      <Input id="headline" placeholder="e.g., Professional Tools for Professional Results" maxLength={60} />
                      <p className="text-xs text-muted-foreground">Max 60 characters</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Describe your product or offer..." rows={3} maxLength={200} />
                      <p className="text-xs text-muted-foreground">Max 200 characters</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cta-url">Destination URL</Label>
                      <Input id="cta-url" type="url" placeholder="https://yourwebsite.com/offer" />
                    </div>
                    <div className="space-y-2">
                      <Label>Upload Image (optional)</Label>
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                        <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x628px, PNG or JPG</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Budget & Schedule */}
                <div className="space-y-4 pt-4 border-t">
                  <Label className="text-base font-semibold">4. Budget & Schedule</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Monthly Budget</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="budget" type="number" className="pl-9" placeholder="500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Campaign Duration</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Month</SelectItem>
                          <SelectItem value="3">3 Months (10% discount)</SelectItem>
                          <SelectItem value="6">6 Months (15% discount)</SelectItem>
                          <SelectItem value="12">12 Months (20% discount)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="start-date">Start Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="start-date" type="date" className="pl-9" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <Button variant="outline" className="flex-1">Save as Draft</Button>
                  <Button className="flex-1">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Continue to Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Active Campaigns</CardTitle>
                    <CardDescription>Manage and monitor your advertising campaigns</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3 text-left font-medium">Campaign</th>
                        <th className="p-3 text-left font-medium">Type</th>
                        <th className="p-3 text-left font-medium">Status</th>
                        <th className="p-3 text-right font-medium">Spend</th>
                        <th className="p-3 text-right font-medium">Impressions</th>
                        <th className="p-3 text-right font-medium">Clicks</th>
                        <th className="p-3 text-right font-medium">CTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockCampaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-t hover:bg-muted/25 cursor-pointer">
                          <td className="p-3 font-medium">{campaign.name}</td>
                          <td className="p-3">{campaign.type}</td>
                          <td className="p-3">
                            <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'}>
                              {campaign.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-right">${campaign.spend}</td>
                          <td className="p-3 text-right">{campaign.impressions.toLocaleString()}</td>
                          <td className="p-3 text-right">{campaign.clicks}</td>
                          <td className="p-3 text-right">{campaign.ctr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="h-10 w-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center text-white text-xs font-bold">
                      VISA
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">Expires 12/26</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    Update Payment Method
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Billing Summary</CardTitle>
                  <CardDescription>Current billing period: Dec 1 - Dec 31, 2024</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Banner Ads</span>
                    <span className="font-medium">$450.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Category Sponsorship</span>
                    <span className="font-medium">$499.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email Sponsorship</span>
                    <span className="font-medium">$299.00</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between text-lg font-semibold">
                    <span>Total</span>
                    <span>$1,248.00</span>
                  </div>
                  <Button className="w-full">Download Invoice</Button>
                </CardContent>
              </Card>
            </div>

            {/* Invoice History */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { date: "Dec 1, 2024", amount: 1248, status: "Pending" },
                    { date: "Nov 1, 2024", amount: 948, status: "Paid" },
                    { date: "Oct 1, 2024", amount: 749, status: "Paid" },
                  ].map((invoice, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{invoice.date}</p>
                        <p className="text-sm text-muted-foreground">${invoice.amount.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'default'}>
                          {invoice.status}
                        </Badge>
                        <Button variant="ghost" size="sm">Download</Button>
                      </div>
                    </div>
                  ))}
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

export default AdvertiserPortal;
