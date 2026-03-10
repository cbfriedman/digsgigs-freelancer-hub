import CommunityLanding from "./CommunityLanding";
import { Rocket, Zap, DollarSign, Code } from "lucide-react";

export default function ProductHuntLanding() {
  return (
    <CommunityLanding
      config={{
        source: "producthunt",
        platformName: "Product Hunt",
        heroTitle: (
          <>Stop Chasing Clients. Let Them <span className="text-primary">Come to You.</span></>
        ),
        heroSubtitle: "Digs & Gigs is the marketplace where tech freelancers get project leads delivered to their inbox — no profiles, no bidding wars. Just real projects from real clients.",
        ctaText: "Get Leads in Your Inbox",
        socialProofLine: "🚀 Just launched on Product Hunt!",
        showGigsCTA: true,
        seoTitle: "Digs & Gigs — Freelance Leads Without the Hustle | Product Hunt",
        seoDescription: "Tech freelancer marketplace. Get project leads by email. No profiles, no bidding. Pay per lead or 8% on awarded projects.",
        canonicalPath: "/from/producthunt",
        accentIcon: <Rocket className="w-4 h-4" />,
        benefits: [
          { icon: <Zap className="w-5 h-5 text-primary" />, title: "Zero Hustle", description: "Leads come to you by email. No profiles to maintain." },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "Pay Per Lead", description: "Unlock only the leads you want for $20–$69. No subscriptions." },
          { icon: <Code className="w-5 h-5 text-primary" />, title: "Tech Only", description: "Web, mobile, AI/ML, DevOps — no plumbers or dog walkers." },
        ],
      }}
    />
  );
}
