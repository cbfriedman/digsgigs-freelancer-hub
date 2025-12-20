export interface FAQ {
  question: string;
  answer: string;
}

export interface FAQCategory {
  slug: string;
  name: string;
  description: string;
  icon: string;
  faqs: FAQ[];
}

export const faqCategories: FAQCategory[] = [
  {
    slug: "plumbing",
    name: "Plumbing",
    description: "Common questions about plumbing services, costs, and when to hire a professional plumber.",
    icon: "🔧",
    faqs: [
      {
        question: "How much does a plumber cost per hour?",
        answer: "Plumbers typically charge between $45-$200 per hour depending on location, experience, and the complexity of the job. Emergency calls and after-hours work usually cost 1.5-2x the standard rate. On DigsAndGigs, you can compare quotes from multiple licensed plumbers to find competitive rates."
      },
      {
        question: "Do I need a permit for plumbing work?",
        answer: "Most major plumbing work requires a permit, including: adding new pipes, moving existing plumbing, installing water heaters, and replacing sewer lines. Minor repairs like fixing leaks or replacing faucets typically don't need permits. A licensed plumber will know your local requirements."
      },
      {
        question: "When should I call an emergency plumber?",
        answer: "Call an emergency plumber for: burst pipes, sewage backups, no water supply, gas leaks near water lines, or flooding. These issues can cause significant damage if not addressed immediately. Regular clogs and slow drains can usually wait for a scheduled appointment."
      },
      {
        question: "How do I find a reliable plumber near me?",
        answer: "Look for licensed, insured plumbers with verified reviews. On DigsAndGigs, all service providers are vetted and you can see ratings, reviews, and compare quotes before hiring. Always get at least 2-3 quotes for major work."
      },
      {
        question: "What's the difference between a plumber and a pipefitter?",
        answer: "Plumbers install and repair water supply, drainage, and gas lines in residential and commercial buildings. Pipefitters work on industrial piping systems that carry chemicals, gases, and other materials under high pressure. For home projects, you need a plumber."
      },
      {
        question: "How long does it take to replace a water heater?",
        answer: "A standard water heater replacement takes 2-4 hours for a like-for-like swap. If you're switching from tank to tankless, or need electrical/gas line modifications, expect 4-8 hours. Get quotes that include removal and disposal of the old unit."
      }
    ]
  },
  {
    slug: "electrical",
    name: "Electrical",
    description: "Answers to common electrical service questions including safety, costs, and hiring electricians.",
    icon: "⚡",
    faqs: [
      {
        question: "How much does an electrician charge per hour?",
        answer: "Electricians typically charge $50-$150 per hour for standard work. Master electricians and specialized work (like panel upgrades) cost more. Many electricians charge a service call fee ($50-$100) plus hourly labor. Compare quotes on DigsAndGigs to find fair pricing."
      },
      {
        question: "Do I need an electrician to install a ceiling fan?",
        answer: "If you're replacing an existing fixture with a ceiling fan, a handy homeowner can often do it. However, if you need new wiring, a new switch, or the box needs reinforcement, hire a licensed electrician. It's always safer to hire a pro for electrical work."
      },
      {
        question: "How do I know if my electrical panel needs upgrading?",
        answer: "Signs you need a panel upgrade: frequently tripping breakers, burning smell near the panel, flickering lights, using many extension cords, or a panel over 25 years old. Modern homes need 200-amp service for appliances, EVs, and electronics."
      },
      {
        question: "Is it safe to do my own electrical work?",
        answer: "Minor tasks like changing outlets or light switches can be DIY with proper precautions. However, any work involving the panel, new circuits, or rewiring should be done by a licensed electrician. Improper electrical work is a fire hazard and may void insurance."
      },
      {
        question: "How much does it cost to rewire a house?",
        answer: "Rewiring a house costs $8,000-$30,000+ depending on size, accessibility, and local codes. A 1,500 sq ft home typically costs $8,000-$15,000. This includes new wiring, outlets, switches, and usually a panel upgrade. Get multiple quotes and check licensing."
      },
      {
        question: "What's the difference between a handyman and an electrician?",
        answer: "Electricians are licensed, trained, and insured to work on electrical systems. Handymen can do minor repairs but legally cannot do work requiring permits. For safety and code compliance, always use a licensed electrician for electrical projects."
      }
    ]
  },
  {
    slug: "roofing",
    name: "Roofing",
    description: "Everything you need to know about roof repairs, replacements, and hiring roofing contractors.",
    icon: "🏠",
    faqs: [
      {
        question: "How much does a new roof cost?",
        answer: "A new roof costs $5,000-$30,000+ depending on size, materials, and complexity. Asphalt shingles run $3-$5 per sq ft installed, while metal roofing costs $7-$15 per sq ft. A typical 2,000 sq ft roof with asphalt shingles costs $8,000-$15,000."
      },
      {
        question: "How long does a roof last?",
        answer: "Asphalt shingles last 20-30 years, metal roofs 40-70 years, tile roofs 50-100 years, and slate roofs 75-150 years. Lifespan depends on climate, maintenance, and installation quality. Regular inspections extend roof life."
      },
      {
        question: "How do I know if I need a new roof or just repairs?",
        answer: "Consider replacement if: shingles are curling/missing, roof is 20+ years old, you see daylight through the attic, or there's widespread damage. Isolated leaks or a few missing shingles can often be repaired. Get a professional inspection for an honest assessment."
      },
      {
        question: "Does homeowners insurance cover roof replacement?",
        answer: "Insurance typically covers roof damage from storms, hail, fire, or fallen trees. It doesn't cover wear and tear or neglected maintenance. Document damage with photos and get contractor estimates before filing a claim."
      },
      {
        question: "Should I repair or replace my roof before selling my house?",
        answer: "A new roof can increase home value by $15,000-$25,000 and makes your home more attractive to buyers. If your roof is near end-of-life, replacement usually offers better ROI than repairs. At minimum, address visible damage and leaks."
      },
      {
        question: "What questions should I ask a roofing contractor?",
        answer: "Ask about: licensing and insurance, warranty (workmanship and materials), timeline, payment schedule, permit handling, cleanup process, and references. Get everything in writing. On DigsAndGigs, you can compare verified contractors easily."
      }
    ]
  },
  {
    slug: "hvac",
    name: "HVAC",
    description: "Common questions about heating, cooling, and ventilation services for your home.",
    icon: "❄️",
    faqs: [
      {
        question: "How much does a new HVAC system cost?",
        answer: "A complete HVAC system (furnace + AC) costs $5,000-$15,000 installed. Central AC alone runs $3,000-$7,000, and a furnace costs $2,500-$6,000. High-efficiency systems cost more upfront but save on energy bills long-term."
      },
      {
        question: "How often should I replace my HVAC filter?",
        answer: "Replace standard 1-inch filters every 1-3 months. 4-inch filters last 6-12 months. Homes with pets, allergies, or dusty conditions need more frequent changes. A dirty filter reduces efficiency and can damage your system."
      },
      {
        question: "How long does an HVAC system last?",
        answer: "Air conditioners last 15-20 years, furnaces 15-30 years, and heat pumps 10-15 years. Regular maintenance extends lifespan. If your system needs frequent repairs or utility bills are increasing, it may be time to replace."
      },
      {
        question: "Should I repair or replace my AC unit?",
        answer: "Consider the 5,000 rule: if repair cost × age in years > $5,000, replace. Also replace if: it uses R-22 refrigerant (phased out), repairs exceed 50% of replacement cost, or it's over 15 years old and inefficient."
      },
      {
        question: "What SEER rating should I look for?",
        answer: "Minimum SEER for new units is 14-15 depending on region. SEER 16-18 offers good efficiency for most homes. SEER 20+ is premium efficiency with highest energy savings. Higher SEER = higher upfront cost but lower operating costs."
      },
      {
        question: "How much does HVAC maintenance cost?",
        answer: "Annual HVAC tune-ups cost $75-$200 per system. Many companies offer maintenance plans at $150-$300/year covering both heating and cooling. Regular maintenance prevents costly repairs and extends system life."
      }
    ]
  },
  {
    slug: "landscaping",
    name: "Landscaping",
    description: "Questions about lawn care, landscaping projects, and hiring landscapers.",
    icon: "🌳",
    faqs: [
      {
        question: "How much does landscaping cost?",
        answer: "Basic landscaping runs $4-$12 per sq ft, while premium projects cost $20-$40+ per sq ft. A typical front yard makeover costs $3,000-$15,000. Ongoing lawn maintenance runs $100-$300/month depending on property size and services."
      },
      {
        question: "How often should I mow my lawn?",
        answer: "Mow weekly during peak growing season (spring/early summer), every 10-14 days in moderate weather, and less in drought or dormancy. Never cut more than 1/3 of blade height at once. Keep grass 2.5-4 inches tall for health."
      },
      {
        question: "When is the best time to plant trees?",
        answer: "Fall is ideal for most trees—cooler temps and rain help roots establish before summer stress. Spring is second best. Avoid planting in summer heat or frozen winter ground. Container trees can be planted almost anytime with proper watering."
      },
      {
        question: "Do landscapers need to be licensed?",
        answer: "Licensing varies by state and work type. Most states require licenses for pesticide application, irrigation, and large hardscape projects. Always verify insurance regardless of licensing. On DigsAndGigs, all providers are vetted for credentials."
      },
      {
        question: "How much does a sprinkler system cost?",
        answer: "Sprinkler system installation costs $2,500-$5,000 for a typical residential yard. Cost depends on yard size, number of zones, and water source. Smart controllers add $100-$300 but save water. Annual winterization runs $50-$150."
      },
      {
        question: "What's included in a landscape design?",
        answer: "A professional landscape design includes: site analysis, plant selection, hardscape layout, irrigation planning, lighting design, and detailed drawings. Costs range from $500 for basic plans to $5,000+ for comprehensive designs."
      }
    ]
  },
  {
    slug: "painting",
    name: "Painting",
    description: "Answers about interior and exterior painting costs, preparation, and hiring painters.",
    icon: "🎨",
    faqs: [
      {
        question: "How much does it cost to paint a house interior?",
        answer: "Interior painting costs $2-$6 per sq ft, or $1,500-$4,000 for an average room including labor and materials. A full 2,000 sq ft home interior runs $4,000-$12,000. Costs vary by wall condition, paint quality, and trim complexity."
      },
      {
        question: "How much does exterior house painting cost?",
        answer: "Exterior painting costs $1.50-$4 per sq ft, or $2,500-$10,000 for a typical home. Factors include home size, stories, siding type, and prep work needed. Lead paint remediation and wood repair add significant cost."
      },
      {
        question: "How long does interior paint last?",
        answer: "Quality interior paint lasts 5-10 years in normal conditions. High-traffic areas like kitchens, hallways, and kids' rooms may need repainting every 3-5 years. Ceilings can go 10-15 years between paintings."
      },
      {
        question: "Should I paint before or after installing new floors?",
        answer: "Paint before installing new floors when possible—it's easier to protect subfloor than finished flooring. If floors are already installed, paint carefully with proper drop cloths and tape. Baseboards are typically painted after flooring."
      },
      {
        question: "What's the difference between flat, eggshell, and semi-gloss paint?",
        answer: "Flat/matte hides imperfections but marks easily—best for ceilings and low-traffic areas. Eggshell offers slight sheen and washability—great for living rooms and bedrooms. Semi-gloss is durable and easy to clean—ideal for kitchens, baths, and trim."
      },
      {
        question: "How do I find a good painter?",
        answer: "Look for painters with: liability insurance, references, detailed written estimates, and portfolio of similar work. Get 3+ quotes and compare scope, not just price. On DigsAndGigs, compare verified painters with real reviews."
      }
    ]
  },
  {
    slug: "general",
    name: "Hiring Contractors",
    description: "General advice on finding, vetting, and working with home service professionals.",
    icon: "📋",
    faqs: [
      {
        question: "How do I find a trustworthy contractor?",
        answer: "Check licensing with your state board, verify insurance, read reviews on multiple platforms, get references for similar projects, and get detailed written estimates. On DigsAndGigs, all pros are vetted and you can compare quotes easily."
      },
      {
        question: "How many quotes should I get for a home project?",
        answer: "Get at least 3 quotes for any significant project. This helps you understand fair pricing, compare approaches, and identify red flags. Be wary of quotes significantly lower than others—it may indicate cut corners or hidden costs."
      },
      {
        question: "What should be in a contractor's estimate?",
        answer: "A good estimate includes: detailed scope of work, materials specified (brand/quality), timeline, payment schedule, warranty information, permit responsibilities, and change order process. Avoid vague estimates or verbal agreements."
      },
      {
        question: "Should I pay a contractor upfront?",
        answer: "Never pay 100% upfront. Standard practice is 10-30% deposit, with payments tied to milestones. Final payment (10-20%) should be held until work is complete and inspected. Large upfront payment demands are a red flag."
      },
      {
        question: "What if I'm not happy with a contractor's work?",
        answer: "First, communicate concerns in writing and give them a chance to fix issues. Document everything with photos. If unresolved, file complaints with state licensing boards, BBB, and leave honest reviews. Small claims court handles disputes under $10,000 in most states."
      },
      {
        question: "Do I need a written contract for small jobs?",
        answer: "Yes, always get written agreements—even for small jobs. Include: scope, price, timeline, and what happens if scope changes. This protects both parties and prevents misunderstandings. Email confirmations count as written agreements."
      }
    ]
  }
];

export const getAllFAQs = (): FAQ[] => {
  return faqCategories.flatMap(category => category.faqs);
};

export const getFAQCategoryBySlug = (slug: string): FAQCategory | undefined => {
  return faqCategories.find(category => category.slug === slug);
};
