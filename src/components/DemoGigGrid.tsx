import React from "react";
import DemoGigCard from "./DemoGigCard";

export const DemoGigGrid: React.FC = () => {
  const gigs = [
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
      title: "Garage Conversion",
      description:
        "Convert garage to a home office with insulation, drywall, flooring, mini-split HVAC, and electrical outlets.",
      budgetMin: 12000,
      budgetMax: 30000,
    },
    {
      title: "Deck Construction",
      description:
        "Build a 12x16 composite deck with railings and stairs. Include footings, framing, and permits if required.",
      budgetMin: 7000,
      budgetMax: 20000,
    },
    {
      title: "Roof Repair",
      description:
        "Fix leak around chimney, replace damaged shingles, check flashing, and inspect overall roof condition.",
      budgetMin: 1200,
      budgetMax: 4500,
    },
    {
      title: "Backyard Landscaping",
      description:
        "Install pavers, garden beds, and drip irrigation. Low-maintenance plants and small seating area preferred.",
      budgetMin: 3000,
      budgetMax: 12000,
    },
  ];

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
