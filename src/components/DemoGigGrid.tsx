import React from "react";
import DemoGigCard from "./DemoGigCard";

interface DemoGigGridProps {
  category?: "construction" | "web" | "architecture" | "legal";
}

const gigsByCategory = {
  construction: [
    {
      title: "Kitchen Remodel",
      description:
        "Update cabinets, countertops, lighting, and flooring. Include appliance installation and minor electrical and plumbing adjustments.",
      budgetMin: 8000,
      budgetMax: 25000,
    },
    {
      title: "Bathroom Renovation",
      description:
        "Full bathroom refresh: tile, vanity, fixtures, waterproofing, and shower upgrade. Looking for licensed and insured pro.",
      budgetMin: 5000,
      budgetMax: 18000,
    },
    {
      title: "Deck Construction",
      description:
        "Build a 12x16 composite deck with railings and stairs. Include footings, framing, and permits if required.",
      budgetMin: 7000,
      budgetMax: 20000,
    },
  ],
  web: [
    {
      title: "E-Commerce Website",
      description:
        "Build a modern online store with shopping cart, payment integration, product catalog, and admin dashboard. Need Shopify or custom solution.",
      budgetMin: 5000,
      budgetMax: 15000,
    },
    {
      title: "Mobile App Development",
      description:
        "Create a React Native app for iOS and Android with user authentication, push notifications, and API integration.",
      budgetMin: 10000,
      budgetMax: 30000,
    },
    {
      title: "WordPress Site Redesign",
      description:
        "Modernize existing WordPress site with responsive design, speed optimization, and improved UX. Include SEO enhancements.",
      budgetMin: 3000,
      budgetMax: 8000,
    },
  ],
  architecture: [
    {
      title: "Home Addition Design",
      description:
        "Design plans for a 500 sq ft addition including structural calculations, code compliance, and permit-ready drawings.",
      budgetMin: 8000,
      budgetMax: 15000,
    },
    {
      title: "Commercial Space Planning",
      description:
        "Interior design and space planning for a 3,000 sq ft office. Include furniture layout, lighting design, and material specifications.",
      budgetMin: 12000,
      budgetMax: 25000,
    },
    {
      title: "Kitchen Renovation Plans",
      description:
        "Architectural drawings for upscale kitchen remodel. Include cabinet elevations, electrical plans, and material selections.",
      budgetMin: 4000,
      budgetMax: 10000,
    },
  ],
  legal: [
    {
      title: "Business Contract Review",
      description:
        "Review and revise commercial lease agreement, employment contracts, and vendor agreements. Provide risk assessment and recommendations.",
      budgetMin: 2000,
      budgetMax: 5000,
    },
    {
      title: "Trademark Registration",
      description:
        "Complete trademark search, file application with USPTO, and handle office actions. Include consultation on brand protection strategy.",
      budgetMin: 1500,
      budgetMax: 3500,
    },
    {
      title: "LLC Formation & Operating Agreement",
      description:
        "Form new LLC, draft comprehensive operating agreement, obtain EIN, and advise on corporate governance and compliance.",
      budgetMin: 1000,
      budgetMax: 3000,
    },
  ],
};

export const DemoGigGrid: React.FC<DemoGigGridProps> = ({ category = "construction" }) => {
  const gigs = gigsByCategory[category];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {gigs.map((g, i) => (
          <DemoGigCard key={i} {...g} />
        ))}
      </div>
    </div>
  );
};

export default DemoGigGrid;
