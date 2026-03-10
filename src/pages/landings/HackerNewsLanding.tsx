import CommunityLanding from "./CommunityLanding";
import { Terminal, Zap, DollarSign, Globe } from "lucide-react";

export default function HackerNewsLanding() {
  return (
    <CommunityLanding
      config={{
        source: "hackernews",
        platformName: "Hacker News",
        heroTitle: (
          <>Freelancing Shouldn't Mean<br /><span className="text-primary">Endless Cold Outreach.</span></>
        ),
        heroSubtitle: "Digs & Gigs delivers tech project leads to your inbox. No profiles to maintain. No bidding. No 20% platform fees. Just leads you can act on.",
        ctaText: "Get Leads — No Profile Needed",
        socialProofLine: "Show HN: A fairer freelance marketplace",
        showGigsCTA: false,
        seoTitle: "Digs & Gigs — Freelance Leads Without the Middleman | HN",
        seoDescription: "Tech freelance marketplace. Get project leads by email. No profiles, no bidding wars, no 20% cuts. Pay per lead or 8% on awarded work.",
        canonicalPath: "/from/hackernews",
        accentIcon: <Terminal className="w-4 h-4" />,
        benefits: [
          { icon: <Zap className="w-5 h-5 text-primary" />, title: "Email-First", description: "No app to check. Leads arrive in your inbox." },
          { icon: <DollarSign className="w-5 h-5 text-primary" />, title: "No Platform Tax", description: "Pay $20–$69 per lead. Or 8% only if awarded. That's it." },
          { icon: <Globe className="w-5 h-5 text-primary" />, title: "Fully Remote", description: "National US tech projects. Work from anywhere." },
        ],
      }}
    />
  );
}
