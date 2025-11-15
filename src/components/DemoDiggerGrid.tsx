import React from "react";
import DemoDiggerCard from "./DemoDiggerCard";

interface DemoDiggerGridProps {
  gigCategory?: "construction" | "web" | "architecture" | "legal";
}

const diggersByGigCategory = {
  construction: [
    {
      name: "Mike Thompson",
      profession: "General Contractor & Carpenter",
      categories: ["Construction", "Carpentry", "Remodeling"],
      location: "Austin, TX",
      rating: 4.9,
      reviewCount: 47,
      hourlyRateMin: 75,
      hourlyRateMax: 150,
      yearsExperience: 15,
    },
    {
      name: "Sarah Martinez",
      profession: "Licensed Plumber & HVAC Tech",
      categories: ["Plumbing", "HVAC", "Construction"],
      location: "Denver, CO",
      rating: 4.8,
      reviewCount: 32,
      hourlyRateMin: 85,
      hourlyRateMax: 140,
      yearsExperience: 12,
    },
    {
      name: "James Wilson",
      profession: "Electrician & Home Automation",
      categories: ["Electrical", "Smart Home", "Construction"],
      location: "Portland, OR",
      rating: 5.0,
      reviewCount: 28,
      hourlyRateMin: 90,
      hourlyRateMax: 160,
      yearsExperience: 10,
    },
  ],
  web: [
    {
      name: "Alex Chen",
      profession: "Full-Stack Developer & Designer",
      categories: ["Web Development", "UI/UX Design", "Mobile Apps"],
      location: "San Francisco, CA",
      rating: 4.9,
      reviewCount: 56,
      hourlyRateMin: 100,
      hourlyRateMax: 200,
      yearsExperience: 8,
    },
    {
      name: "Emma Rodriguez",
      profession: "E-Commerce Specialist",
      categories: ["Web Development", "Shopify", "Digital Marketing"],
      location: "Miami, FL",
      rating: 4.8,
      reviewCount: 41,
      hourlyRateMin: 80,
      hourlyRateMax: 150,
      yearsExperience: 6,
    },
    {
      name: "David Park",
      profession: "React & Node.js Developer",
      categories: ["Web Development", "API Integration", "Cloud Services"],
      location: "Seattle, WA",
      rating: 5.0,
      reviewCount: 33,
      hourlyRateMin: 120,
      hourlyRateMax: 220,
      yearsExperience: 10,
    },
  ],
  architecture: [
    {
      name: "Jennifer Foster",
      profession: "Licensed Architect & Interior Designer",
      categories: ["Architecture", "Interior Design", "Space Planning"],
      location: "New York, NY",
      rating: 4.9,
      reviewCount: 38,
      hourlyRateMin: 150,
      hourlyRateMax: 300,
      yearsExperience: 18,
    },
    {
      name: "Robert Kim",
      profession: "Structural Engineer & CAD Expert",
      categories: ["Architecture", "Structural Engineering", "3D Modeling"],
      location: "Chicago, IL",
      rating: 4.8,
      reviewCount: 29,
      hourlyRateMin: 140,
      hourlyRateMax: 250,
      yearsExperience: 14,
    },
    {
      name: "Lisa Anderson",
      profession: "Residential Architect",
      categories: ["Architecture", "Renovation Design", "Permit Services"],
      location: "Boston, MA",
      rating: 5.0,
      reviewCount: 25,
      hourlyRateMin: 130,
      hourlyRateMax: 240,
      yearsExperience: 12,
    },
  ],
  legal: [
    {
      name: "Thomas Bradley",
      profession: "Business Attorney",
      categories: ["Business Law", "Contracts", "Corporate Formation"],
      location: "Dallas, TX",
      rating: 4.9,
      reviewCount: 44,
      hourlyRateMin: 200,
      hourlyRateMax: 400,
      yearsExperience: 20,
    },
    {
      name: "Patricia Lee",
      profession: "Intellectual Property Lawyer",
      categories: ["IP Law", "Trademarks", "Business Law"],
      location: "Los Angeles, CA",
      rating: 4.8,
      reviewCount: 36,
      hourlyRateMin: 250,
      hourlyRateMax: 450,
      yearsExperience: 16,
    },
    {
      name: "Michael Johnson",
      profession: "Contract & Compliance Attorney",
      categories: ["Business Law", "Compliance", "Employment Law"],
      location: "Atlanta, GA",
      rating: 5.0,
      reviewCount: 31,
      hourlyRateMin: 180,
      hourlyRateMax: 350,
      yearsExperience: 15,
    },
  ],
};

export const DemoDiggerGrid: React.FC<DemoDiggerGridProps> = ({ gigCategory = "construction" }) => {
  const diggers = diggersByGigCategory[gigCategory];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {diggers.map((digger, i) => (
          <DemoDiggerCard key={i} {...digger} />
        ))}
      </div>
    </div>
  );
};

export default DemoDiggerGrid;
