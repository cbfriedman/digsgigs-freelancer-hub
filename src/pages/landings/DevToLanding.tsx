import CommunityLanding from "./CommunityLanding";
import { Code, Zap, DollarSign, Terminal } from "lucide-react";

export default function DevToLanding() {
  return (
    <CommunityLanding
      config={{
        source: "devto",
        platformName: "Dev.to",
        heroTitle: (
          <>Write Code. Get Paid.<br /><span className="text-primary">Skip the Hustle.</span></>
        ),
        heroSubtitle: "Digs & Gigs sends real tech project leads to your inbox. No profile needed. No bidding. No 20% platform fees. Just projects from clients who need developers.",
        ctaText: "Get Dev Leads by Email",
        socialProofLine: "Built for developers who ship",
        showGigsCTA: false,
        seoTitle: "Digs & Gigs — Freelance Project Leads for Developers",
        seoDescription: "Get tech project leads by email. No profiles, no bidding, no 20% cuts. Built for developers. Pay per lead or 8% on awarded projects.",
        canonicalPath: "/from/devto",
        accentIcon: <Code className="w-4 h-4" />,
        benefits: [
          { icon: <Terminal className="w-5 h-5 text-primary" />, title: "Dev-Focused", description: "Web, mobile, AI/ML, blockchain, DevOps — your stack." },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "Fair Pricing", description: "$20–$69 per lead. Or 8% on awarded work. No subscriptions." },
          { icon: <Zap className="w-5 h-5 text-primary" />, title: "30-Second Signup", description: "Name, email, phone. That's it. Start getting leads." },
        ],
      }}
    />
  );
}
