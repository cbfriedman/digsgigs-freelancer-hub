import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Info } from "lucide-react";
import { BidSubmissionTemplateDemo } from "@/components/BidSubmissionTemplateDemo";
import { AnonymizedBidCard } from "@/components/AnonymizedBidCard";

// Sample bid data for demonstration
const sampleBids = [
  {
    id: "bid-1",
    bidderNumber: 1,
    amountMin: 1800,
    amountMax: 2200,
    timeline: "1-2 weeks",
    proposal: "I can complete this project quickly with my streamlined development process. I specialize in rapid prototyping and MVP development.",
    status: "pending",
    pricingModel: "non_exclusive",
    profile: {
      profession: "Web Developer",
      years_experience: 3,
      average_rating: 4.5,
      total_ratings: 12,
      completion_rate: 92,
      response_time_hours: 4,
      verified: false,
      is_insured: false,
      is_bonded: false,
      is_licensed: null,
      skills: ["React", "JavaScript", "CSS"],
      certifications: [],
      city: "Austin",
      state: "TX",
      offers_free_estimates: true,
      reference_count: 3,
    },
  },
  {
    id: "bid-2",
    bidderNumber: 2,
    amountMin: 3500,
    amountMax: 4500,
    timeline: "2-3 weeks",
    proposal: "With 8 years of full-stack experience, I'll deliver a robust, scalable solution. My work includes comprehensive testing, documentation, and post-launch support.",
    status: "pending",
    pricingModel: "exclusive",
    profile: {
      profession: "Full-Stack Developer",
      years_experience: 8,
      average_rating: 4.9,
      total_ratings: 67,
      completion_rate: 98,
      response_time_hours: 1,
      verified: true,
      is_insured: true,
      is_bonded: true,
      is_licensed: "CA-DEV-2024",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "GraphQL"],
      certifications: ["AWS Certified Developer", "Google Cloud Professional", "Meta Frontend Developer"],
      city: "San Francisco",
      state: "CA",
      offers_free_estimates: true,
      reference_count: 24,
    },
  },
  {
    id: "bid-3",
    bidderNumber: 3,
    amountMin: 5000,
    amountMax: 7500,
    timeline: "3-4 weeks",
    proposal: "As a senior architect with enterprise experience, I provide end-to-end solutions including system design, implementation, security audits, and performance optimization. Premium service for premium results.",
    status: "pending",
    pricingModel: "exclusive",
    profile: {
      profession: "Software Architect",
      years_experience: 15,
      average_rating: 5.0,
      total_ratings: 89,
      completion_rate: 100,
      response_time_hours: 2,
      verified: true,
      is_insured: true,
      is_bonded: true,
      is_licensed: "NY-ARCH-5678",
      skills: ["System Design", "React", "Node.js", "Python", "AWS", "Kubernetes", "Microservices", "Security"],
      certifications: ["AWS Solutions Architect", "CISSP", "PMP", "Kubernetes Administrator", "Azure Expert"],
      city: "New York",
      state: "NY",
      offers_free_estimates: false,
      reference_count: 45,
    },
  },
  {
    id: "bid-4",
    bidderNumber: 4,
    amountMin: 2000,
    amountMax: 2000,
    timeline: "2 weeks",
    proposal: "I can handle this project efficiently. Contact me to discuss details.",
    status: "pending",
    pricingModel: "non_exclusive",
    profile: {
      profession: "Developer",
      years_experience: 1,
      average_rating: 4.0,
      total_ratings: 2,
      completion_rate: 80,
      response_time_hours: 24,
      verified: false,
      is_insured: false,
      is_bonded: false,
      is_licensed: null,
      skills: ["JavaScript", "HTML", "CSS"],
      certifications: [],
      city: "Remote",
      state: null,
      offers_free_estimates: true,
      reference_count: 0,
    },
  },
];

export default function BidTemplatePreview() {
  const [pricingModel, setPricingModel] = useState<"non_exclusive" | "exclusive">("exclusive");
  const [bidStatus, setBidStatus] = useState("pending");

  // Find the lowest bid for badge display
  const lowestBidAmount = Math.min(...sampleBids.map((b) => b.amountMin));

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Bid Template Preview</h1>
            <Badge variant="secondary">Design Review</Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">
            This page demonstrates the bid submission form (Digger's view) and anonymized bid cards
            (Gigger's view) with sample data. No authentication or real data required.
          </p>
        </div>

        {/* Info Banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4 mb-8">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Anonymization Active</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All bid cards hide the Digger's identity (name, handle, photo) until the Gigger
                awards the job or purchases the lead. This prevents direct contact before commitment.
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="submission" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="submission" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Digger's Form
            </TabsTrigger>
            <TabsTrigger value="cards" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Gigger's View
            </TabsTrigger>
          </TabsList>

          {/* Digger's Bid Submission Form */}
          <TabsContent value="submission" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Label>Pricing Model:</Label>
              <Select
                value={pricingModel}
                onValueChange={(v) => setPricingModel(v as "non_exclusive" | "exclusive")}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_exclusive">Non-Exclusive ($1-$49)</SelectItem>
                  <SelectItem value="exclusive">Exclusive (2% Fee)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-w-2xl">
              <BidSubmissionTemplateDemo pricingModel={pricingModel} />
            </div>
          </TabsContent>

          {/* Gigger's View of Bids */}
          <TabsContent value="cards" className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
              <Label>Filter by Status:</Label>
              <Select value={bidStatus} onValueChange={setBidStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {sampleBids.length} sample bids
              </div>
              
              <div className="grid gap-4">
                {sampleBids.map((bid) => (
                  <AnonymizedBidCard
                    key={bid.id}
                    bid={{
                      id: bid.id,
                      amount: (bid.amountMin + bid.amountMax) / 2,
                      amount_min: bid.amountMin,
                      amount_max: bid.amountMax,
                      timeline: bid.timeline,
                      proposal: bid.proposal,
                      status: bidStatus === "all" ? bid.status : bidStatus,
                      pricing_model: bid.pricingModel,
                      created_at: new Date().toISOString(),
                    }}
                    diggerProfile={{
                      id: bid.id,
                      profession: bid.profile.profession,
                      years_experience: bid.profile.years_experience,
                      average_rating: bid.profile.average_rating,
                      total_ratings: bid.profile.total_ratings,
                      completion_rate: bid.profile.completion_rate,
                      response_time_hours: bid.profile.response_time_hours,
                      verified: bid.profile.verified,
                      is_insured: bid.profile.is_insured,
                      is_bonded: bid.profile.is_bonded,
                      is_licensed: bid.profile.is_licensed,
                      skills: bid.profile.skills,
                      certifications: bid.profile.certifications,
                      city: bid.profile.city,
                      state: bid.profile.state,
                      offers_free_estimates: bid.profile.offers_free_estimates,
                    }}
                    bidderNumber={bid.bidderNumber}
                    referenceCount={bid.profile.reference_count}
                    isLowestBid={bid.amountMin === lowestBidAmount}
                    isOwner={false}
                  />
                ))}
              </div>
            </div>

            <Separator className="my-8" />

            {/* Legend */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <h3 className="font-medium mb-3">Bid Card Legend</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500">Lowest Bid</Badge>
                    <span className="text-muted-foreground">Cheapest pending proposal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500">Exclusive</Badge>
                    <span className="text-muted-foreground">2% referral fee model</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500">Non-Exclusive</Badge>
                    <span className="text-muted-foreground">Pay-per-lead model</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-green-500 text-green-600">Verified</Badge>
                    <span className="text-muted-foreground">Identity confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Insured / Bonded / Licensed</Badge>
                    <span className="text-muted-foreground">Trust indicators</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
