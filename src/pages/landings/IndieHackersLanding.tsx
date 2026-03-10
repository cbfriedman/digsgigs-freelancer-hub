import CommunityLanding from "./CommunityLanding";
import { Users, Zap, DollarSign, Code } from "lucide-react";

export default function IndieHackersLanding() {
  return (
    <CommunityLanding
      config={{
        source: "indiehackers",
        platformName: "Indie Hackers",
        heroTitle: (
          <>Side Project? Full-Time Freelancer?<br /><span className="text-primary">Get Paid Projects.</span></>
        ),
        heroSubtitle: "We built Digs & Gigs because every freelance marketplace charges too much and delivers too little. Leads emailed to you. No profiles. No 20% cuts. Keep what you earn.",
        ctaText: "Start Getting Leads",
        socialProofLine: "Built by an indie hacker, for indie hackers",
        showGigsCTA: true,
        seoTitle: "Digs & Gigs — Freelance Leads for Indie Hackers & Builders",
        seoDescription: "Get tech project leads by email. No profiles, no 20% platform cuts. Pay per lead or 8% on awarded projects. Built by an indie hacker.",
        canonicalPath: "/from/indiehackers",
        accentIcon: <Users className="w-4 h-4" />,
        benefits: [
          { icon: <Zap className="w-5 h-5 text-primary" />, title: "No Upwork Tax", description: "Keep 92–100% of what you earn. No 20% platform cuts." },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "Transparent Pricing", description: "$20–$69 per lead unlock. Or 8% only when awarded." },
          { icon: <Code className="w-5 h-5 text-primary" />, title: "Tech-Only Leads", description: "Web dev, mobile, AI, DevOps — projects you actually want." },
        ],
      }}
    />
  );
}
