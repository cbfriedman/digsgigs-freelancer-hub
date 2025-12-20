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
  // HOME SERVICES
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
        question: "How much does it cost to rewire a house?",
        answer: "Rewiring a house costs $8,000-$30,000+ depending on size, accessibility, and local codes. A 1,500 sq ft home typically costs $8,000-$15,000. This includes new wiring, outlets, switches, and usually a panel upgrade. Get multiple quotes and check licensing."
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
        question: "What SEER rating should I look for?",
        answer: "Minimum SEER for new units is 14-15 depending on region. SEER 16-18 offers good efficiency for most homes. SEER 20+ is premium efficiency with highest energy savings. Higher SEER = higher upfront cost but lower operating costs."
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
        question: "How much does a sprinkler system cost?",
        answer: "Sprinkler system installation costs $2,500-$5,000 for a typical residential yard. Cost depends on yard size, number of zones, and water source. Smart controllers add $100-$300 but save water. Annual winterization runs $50-$150."
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
        question: "What's the difference between flat, eggshell, and semi-gloss paint?",
        answer: "Flat/matte hides imperfections but marks easily—best for ceilings and low-traffic areas. Eggshell offers slight sheen and washability—great for living rooms and bedrooms. Semi-gloss is durable and easy to clean—ideal for kitchens, baths, and trim."
      }
    ]
  },
  
  // FINANCIAL SERVICES
  {
    slug: "credit-repair",
    name: "Credit Repair",
    description: "Common questions about credit repair services, credit scores, and improving your credit.",
    icon: "💳",
    faqs: [
      {
        question: "How much does credit repair cost?",
        answer: "Credit repair services typically cost $50-$150 per month, with some charging setup fees of $50-$200. Some companies offer pay-per-deletion models at $50-$150 per removed item. DIY credit repair is free but time-consuming. Compare options on DigsAndGigs."
      },
      {
        question: "How long does credit repair take?",
        answer: "Credit repair typically takes 3-6 months to see significant improvements, though some items can be removed in 30-45 days. Complex cases with multiple negative items may take 12+ months. Results depend on the nature and number of negative items."
      },
      {
        question: "Can credit repair really work?",
        answer: "Yes, legitimate credit repair works by disputing inaccurate, unverifiable, or unfair negative items on your credit report. By law, credit bureaus must investigate disputes within 30 days. However, accurate negative information cannot legally be removed."
      },
      {
        question: "What's the difference between credit repair and credit counseling?",
        answer: "Credit repair focuses on removing negative items from your credit report. Credit counseling helps you manage debt and create budgets, often including debt management plans. Some situations benefit from both services working together."
      },
      {
        question: "Can I do credit repair myself?",
        answer: "Yes, you can dispute errors directly with credit bureaus for free. Request your free annual credit reports, identify errors, and send dispute letters. Professional services save time and have experience navigating the process effectively."
      }
    ]
  },
  {
    slug: "tax-relief",
    name: "Tax Relief Services",
    description: "Answers about IRS tax debt, tax relief options, and resolving tax problems.",
    icon: "📋",
    faqs: [
      {
        question: "How much does tax relief services cost?",
        answer: "Tax relief services range from $500 for simple cases to $10,000+ for complex IRS negotiations. Most companies charge $2,000-$5,000 for Offer in Compromise cases. Get a free consultation and written fee agreement before hiring."
      },
      {
        question: "What is an Offer in Compromise?",
        answer: "An Offer in Compromise (OIC) lets you settle tax debt for less than you owe if you can prove you can't pay the full amount. The IRS accepts about 30% of OIC applications. You must be current on all filing requirements to qualify."
      },
      {
        question: "Can the IRS take my house for back taxes?",
        answer: "Yes, the IRS can place a lien on your home and eventually levy (seize) it for unpaid taxes, though this is rare for primary residences. They typically try other collection methods first. Tax relief professionals can help protect your assets."
      },
      {
        question: "How long does the IRS have to collect back taxes?",
        answer: "The IRS has 10 years from the assessment date to collect taxes. This is called the Collection Statute Expiration Date (CSED). After this period, the debt is legally uncollectible. Certain actions can pause or extend this period."
      },
      {
        question: "What is IRS penalty abatement?",
        answer: "Penalty abatement removes or reduces IRS penalties for late filing, late payment, or underpayment. First-time penalty abatement is often granted automatically if you have a clean history. Reasonable cause abatement requires documentation of hardship."
      }
    ]
  },
  {
    slug: "legal-services",
    name: "Legal Services",
    description: "Common questions about hiring lawyers, legal fees, and different types of legal help.",
    icon: "⚖️",
    faqs: [
      {
        question: "How much does a lawyer cost?",
        answer: "Lawyer fees vary widely: $150-$400/hour for general practice, $300-$1,000+/hour for specialized attorneys. Many offer free consultations. Personal injury lawyers often work on contingency (25-40% of settlement). Get fee structures in writing."
      },
      {
        question: "When do I need a lawyer vs. handling it myself?",
        answer: "Consider a lawyer for: criminal charges, lawsuits, complex contracts, real estate transactions, business formation, or family law matters. Small claims court, simple wills, and minor disputes can often be handled yourself."
      },
      {
        question: "What's the difference between a lawyer and an attorney?",
        answer: "In the US, the terms are interchangeable—both refer to someone licensed to practice law. 'Attorney' technically means someone authorized to act on another's behalf. All practicing lawyers are attorneys, and vice versa."
      },
      {
        question: "How do contingency fees work?",
        answer: "With contingency fees, the lawyer only gets paid if you win. They typically take 25-40% of the settlement or award. Common in personal injury, employment discrimination, and class action cases. You may still owe costs like filing fees."
      },
      {
        question: "How long do lawsuits take?",
        answer: "Simple cases may settle in 3-6 months. Complex litigation can take 2-5 years or more. Factors include court backlog, case complexity, number of parties, and willingness to settle. 95% of civil cases settle before trial."
      }
    ]
  },
  {
    slug: "insurance",
    name: "Insurance",
    description: "Questions about different types of insurance, coverage, and finding the right policy.",
    icon: "🛡️",
    faqs: [
      {
        question: "How much life insurance do I need?",
        answer: "A common rule is 10-15x your annual income, but needs vary. Consider: outstanding debts, mortgage balance, future education costs, income replacement needs, and final expenses. Term life is affordable; whole life builds cash value."
      },
      {
        question: "What's the difference between term and whole life insurance?",
        answer: "Term life covers a specific period (10-30 years) and is affordable. Whole life covers your entire life and builds cash value but costs 5-15x more. Most families benefit from term life with separate investments."
      },
      {
        question: "How can I lower my car insurance?",
        answer: "Lower premiums by: bundling policies, raising deductibles, maintaining good credit, taking defensive driving courses, asking about discounts, and shopping around annually. Compare quotes on DigsAndGigs to find better rates."
      },
      {
        question: "What does homeowners insurance cover?",
        answer: "Standard policies cover: dwelling damage, personal property, liability, and additional living expenses. They typically exclude: floods, earthquakes, and normal wear. Review your policy limits and consider umbrella coverage for extra protection."
      },
      {
        question: "Do I need umbrella insurance?",
        answer: "Umbrella insurance provides extra liability coverage beyond home and auto policies, typically $1-5 million. Consider it if you have significant assets, a pool, rental properties, or higher lawsuit risk. Costs $150-$400/year per million."
      }
    ]
  },
  {
    slug: "mortgage-financing",
    name: "Mortgage & Financing",
    description: "Common questions about mortgages, refinancing, and home loans.",
    icon: "🏦",
    faqs: [
      {
        question: "What credit score do I need for a mortgage?",
        answer: "Conventional loans typically require 620+, FHA loans accept 580+ (or 500 with 10% down), and VA/USDA loans are flexible. Higher scores (740+) get the best rates. Work on credit before applying to save thousands over the loan term."
      },
      {
        question: "How much house can I afford?",
        answer: "Lenders typically approve loans where total debt payments (including mortgage) are under 43% of gross income. A safer target is housing costs under 28% of income. Consider property taxes, insurance, maintenance, and your comfort level."
      },
      {
        question: "Should I refinance my mortgage?",
        answer: "Refinancing makes sense if you can lower your rate by 0.5-1%+, need to remove PMI, want to shorten your term, or need cash out. Calculate break-even point (closing costs ÷ monthly savings) to see if it's worthwhile."
      },
      {
        question: "What's the difference between a mortgage broker and a lender?",
        answer: "Lenders provide the actual loan funds. Mortgage brokers shop multiple lenders to find you the best rate and terms. Brokers can save time and find better deals, but may charge fees. Compare both options when shopping."
      },
      {
        question: "How much are closing costs?",
        answer: "Closing costs typically run 2-5% of the loan amount. On a $300,000 home, expect $6,000-$15,000. Costs include: appraisal, title insurance, attorney fees, origination fees, and prepaid items. Some costs are negotiable."
      }
    ]
  },
  {
    slug: "financial-services",
    name: "Financial Services & Accounting",
    description: "Questions about accountants, financial planning, tax preparation, and bookkeeping.",
    icon: "📊",
    faqs: [
      {
        question: "How much does a CPA cost?",
        answer: "CPAs charge $150-$400/hour for consulting, $200-$500 for simple tax returns, and $500-$2,000+ for complex returns. Bookkeeping runs $300-$2,000/month depending on transaction volume. Get quotes based on your specific needs."
      },
      {
        question: "Do I need a CPA or can I use tax software?",
        answer: "Tax software works for simple returns (W-2 income, standard deductions). Consider a CPA for: self-employment, rental properties, investments, business ownership, or complex situations. The cost often pays for itself in found deductions."
      },
      {
        question: "What's the difference between a CPA and an accountant?",
        answer: "CPAs are licensed by the state, pass rigorous exams, and must complete continuing education. Accountants may have degrees but aren't licensed. CPAs can represent you before the IRS, sign audit reports, and offer specialized services."
      },
      {
        question: "How much does a financial advisor cost?",
        answer: "Fee-only advisors charge $150-$400/hour or 0.5-1.5% of assets annually. Commission-based advisors earn from product sales. Fee-only advisors have fewer conflicts of interest. Look for fiduciary duty—they must act in your best interest."
      },
      {
        question: "When should I hire a bookkeeper?",
        answer: "Hire a bookkeeper when you're spending more than a few hours monthly on finances, making errors, or can't focus on growing your business. Most small businesses benefit from bookkeeping when revenue exceeds $100-200K annually."
      }
    ]
  },
  
  // TECHNOLOGY
  {
    slug: "technology-services",
    name: "Technology Services",
    description: "Questions about web development, IT support, and hiring tech professionals.",
    icon: "💻",
    faqs: [
      {
        question: "How much does a website cost?",
        answer: "Simple websites cost $1,000-$5,000, custom business sites $5,000-$25,000, and complex web applications $25,000-$100,000+. Factors include design complexity, features, and ongoing maintenance. Get detailed quotes on DigsAndGigs."
      },
      {
        question: "How long does it take to build a website?",
        answer: "Simple sites take 2-4 weeks, business websites 4-8 weeks, and complex applications 3-6+ months. Timeline depends on scope, revisions, content readiness, and developer availability. Clear requirements speed up the process."
      },
      {
        question: "Should I hire a freelancer or agency for web development?",
        answer: "Freelancers cost less and offer flexibility for smaller projects. Agencies provide teams, project management, and reliability for larger projects. Consider your budget, timeline, and ongoing support needs when deciding."
      },
      {
        question: "How much does IT support cost for a small business?",
        answer: "Managed IT services run $100-$250 per user monthly, covering monitoring, maintenance, and support. Break-fix support charges $75-$200/hour as needed. Most small businesses save money with managed services vs. full-time IT staff."
      },
      {
        question: "Do I need a mobile app or is a mobile website enough?",
        answer: "Mobile websites work for most businesses—they're cheaper and reach all users. Apps make sense for: frequent user engagement, offline functionality, device features (camera, GPS), or complex functionality. Apps cost $25,000-$150,000+ to develop."
      }
    ]
  },
  
  // MEDICAL
  {
    slug: "medical-healthcare",
    name: "Medical & Healthcare",
    description: "Common questions about healthcare providers, costs, and medical services.",
    icon: "🏥",
    faqs: [
      {
        question: "How do I find a good doctor?",
        answer: "Check board certification, read patient reviews, verify insurance acceptance, and consider location/hours. Ask about their communication style and approach to care. Many doctors offer meet-and-greet appointments for new patients."
      },
      {
        question: "What's the difference between urgent care and the ER?",
        answer: "Urgent care handles non-life-threatening issues: minor injuries, infections, flu, sprains. ER is for emergencies: chest pain, difficulty breathing, severe bleeding, stroke symptoms. Urgent care costs much less ($100-$200 vs. $1,000+)."
      },
      {
        question: "How much does therapy cost without insurance?",
        answer: "Therapy typically costs $100-$250 per session without insurance. Many therapists offer sliding scale fees based on income. Online therapy platforms cost $60-$100/week. Some community mental health centers offer low-cost options."
      },
      {
        question: "Do I need a referral to see a specialist?",
        answer: "With HMO plans, you typically need a referral from your primary care doctor. PPO and other plans usually allow direct specialist visits. Check your specific insurance policy. Some specialists require referrals regardless of insurance."
      },
      {
        question: "How can I lower my healthcare costs?",
        answer: "Use in-network providers, compare prices for procedures, ask about cash-pay discounts (often 20-50% off), use urgent care instead of ER, review bills for errors, and consider high-deductible plans with HSAs if healthy."
      }
    ]
  },
  
  // AUTOMOTIVE
  {
    slug: "automotive",
    name: "Automotive Services",
    description: "Questions about auto repair, maintenance, and finding reliable mechanics.",
    icon: "🚗",
    faqs: [
      {
        question: "How much does an oil change cost?",
        answer: "Conventional oil changes cost $25-$50, synthetic blend $40-$70, and full synthetic $65-$125. DIY saves money if you're comfortable. Many shops offer coupons and loyalty programs. Change oil every 5,000-7,500 miles for most vehicles."
      },
      {
        question: "How do I find a trustworthy mechanic?",
        answer: "Look for ASE certification, read reviews, ask for recommendations, and start with small repairs to build trust. Get written estimates and ask questions about repairs. On DigsAndGigs, you can compare verified auto service providers."
      },
      {
        question: "How much do brake repairs cost?",
        answer: "Brake pad replacement costs $100-$300 per axle. Rotors add $150-$400 per axle. Full brake system work (pads, rotors, calipers) runs $500-$1,000+ per axle. Prices vary by vehicle type and parts quality."
      },
      {
        question: "How often should I service my car?",
        answer: "Follow your owner's manual schedule, typically: oil every 5,000-7,500 miles, tires rotated every 5,000-7,500 miles, brakes inspected annually, transmission fluid every 30,000-60,000 miles. Newer cars need less frequent service."
      },
      {
        question: "Should I go to the dealer or an independent mechanic?",
        answer: "Dealers charge more but know your specific vehicle and use OEM parts. Independent shops often cost 25-50% less for quality work. For warranty work and recalls, use the dealer. For routine maintenance, independents often provide better value."
      }
    ]
  },
  
  // PET CARE
  {
    slug: "pet-care",
    name: "Pet Care",
    description: "Questions about pet sitting, grooming, veterinary care, and pet services.",
    icon: "🐕",
    faqs: [
      {
        question: "How much does dog walking cost?",
        answer: "Dog walking typically costs $15-$25 for a 30-minute walk, $20-$35 for 60 minutes. Prices vary by location and number of dogs. Regular scheduled walks often get discounted rates. Group walks cost less than private walks."
      },
      {
        question: "How much does pet sitting cost?",
        answer: "In-home pet sitting costs $25-$75 per day for basic care, more for multiple pets or special needs. Overnight stays run $50-$100+. Boarding facilities charge $25-$85 per night. Prices increase during holidays."
      },
      {
        question: "How much does dog grooming cost?",
        answer: "Basic grooming (bath, brush, nails) costs $30-$50 for small dogs, $50-$90 for large dogs. Full grooming with haircut runs $50-$90 for small dogs, $75-$150+ for large dogs. Prices vary by coat type and condition."
      },
      {
        question: "How often should I take my dog to the vet?",
        answer: "Annual wellness exams are standard for adult dogs. Puppies need visits every 3-4 weeks until 16 weeks old. Senior dogs (7+) benefit from twice-yearly checkups. Visit immediately for illness, injury, or behavior changes."
      },
      {
        question: "Is pet insurance worth it?",
        answer: "Pet insurance makes sense for puppies/kittens, breeds prone to health issues, and if a surprise $5,000+ vet bill would cause financial hardship. Coverage costs $30-$70/month for dogs, $15-$35 for cats. Compare plans carefully."
      }
    ]
  },
  
  // EDUCATION
  {
    slug: "education-tutoring",
    name: "Education & Tutoring",
    description: "Questions about tutoring services, test prep, and hiring educators.",
    icon: "📚",
    faqs: [
      {
        question: "How much does tutoring cost?",
        answer: "Private tutoring costs $25-$80/hour depending on subject and tutor qualifications. Test prep specialists charge $50-$200+/hour. Group tutoring and online options cost less. College students often tutor for $15-$30/hour."
      },
      {
        question: "How do I find a good tutor?",
        answer: "Look for subject expertise, teaching experience, and positive reviews. Ask about their teaching approach and success metrics. Request references and try a trial session. On DigsAndGigs, compare verified tutors with real reviews."
      },
      {
        question: "How often should my child see a tutor?",
        answer: "Most students benefit from 1-2 sessions per week for steady progress. Intensive test prep may require 3-4 sessions weekly. Consistency matters more than frequency—regular weekly sessions beat sporadic cramming."
      },
      {
        question: "Is online tutoring as effective as in-person?",
        answer: "Research shows online tutoring can be equally effective, especially for older students. Benefits include: more tutor options, flexible scheduling, and recorded sessions. Younger children and hands-on subjects may benefit from in-person."
      },
      {
        question: "When should I start SAT/ACT prep?",
        answer: "Most students start 3-6 months before their test date, typically junior year. Earlier prep helps if targeting top scores or significant improvement needed. Take a practice test first to establish baseline and identify weak areas."
      }
    ]
  },
  
  // FITNESS
  {
    slug: "fitness-wellness",
    name: "Fitness & Wellness",
    description: "Questions about personal trainers, wellness coaching, and fitness services.",
    icon: "💪",
    faqs: [
      {
        question: "How much does a personal trainer cost?",
        answer: "Personal trainers charge $40-$100+ per session at gyms, $60-$150+ for private/in-home training. Package deals (10-20 sessions) offer 10-20% discounts. Online coaching costs $100-$300/month. Prices vary by experience and location."
      },
      {
        question: "How often should I work with a personal trainer?",
        answer: "2-3 sessions weekly works well for most beginners. As you learn proper form and build habits, 1-2 weekly sessions maintain progress. Some clients do monthly check-ins once comfortable with independent workouts."
      },
      {
        question: "What certifications should a personal trainer have?",
        answer: "Look for NASM, ACE, ACSM, or NSCA certifications—these require exams and continuing education. Specialty certifications matter for specific goals (weight loss, sports, seniors). CPR/AED certification is essential. Ask about liability insurance."
      },
      {
        question: "Is a nutritionist or dietitian better?",
        answer: "Dietitians are licensed healthcare providers with clinical training who can treat medical conditions. Nutritionists have varying credentials and focus on general wellness. For medical nutrition needs, choose a Registered Dietitian (RD)."
      },
      {
        question: "How much does yoga instruction cost?",
        answer: "Group yoga classes cost $15-$25 per class or $100-$200/month unlimited. Private yoga sessions run $75-$150/hour. Many studios offer introductory deals for new students. Online platforms offer affordable monthly subscriptions."
      }
    ]
  },
  
  // EVENTS
  {
    slug: "event-services",
    name: "Event Services",
    description: "Questions about wedding vendors, event planning, photography, and catering.",
    icon: "🎉",
    faqs: [
      {
        question: "How much does wedding photography cost?",
        answer: "Wedding photographers charge $2,500-$10,000+ depending on experience, hours, and deliverables. Budget photographers start at $1,000-$2,000. Luxury photographers charge $8,000-$15,000+. Albums, prints, and second shooters add to cost."
      },
      {
        question: "How much does catering cost per person?",
        answer: "Catering costs $15-$35 per person for casual buffets, $50-$100+ for plated dinners, and $150-$300+ for high-end events. Costs include food, service staff, rentals, and setup. Alcohol, if provided, adds significantly."
      },
      {
        question: "How far in advance should I book wedding vendors?",
        answer: "Book venue 12-18 months ahead, photographer and caterer 9-12 months, DJ/band 6-9 months, florist 4-6 months. Popular dates (Saturdays in spring/fall) book faster. Off-peak dates offer more flexibility and often better prices."
      },
      {
        question: "How much does an event planner cost?",
        answer: "Full-service wedding planners charge 10-20% of budget or $3,000-$10,000+ flat fee. Day-of coordinators cost $1,000-$2,500. Hourly consulting runs $50-$150/hour. Corporate event planners often charge 15-20% of event budget."
      },
      {
        question: "How much should I tip wedding vendors?",
        answer: "Standard tips: 15-20% for catering staff, $50-$200 for photographer, $50-$150 for DJ, $50-$100 for officiant, 15-20% for hair/makeup. Some contracts include gratuity—check before tipping double. Venue coordinators vary."
      }
    ]
  },
  
  // CLEANING
  {
    slug: "cleaning-maintenance",
    name: "Cleaning & Maintenance",
    description: "Questions about house cleaning, commercial cleaning, and maintenance services.",
    icon: "🧹",
    faqs: [
      {
        question: "How much does house cleaning cost?",
        answer: "House cleaning costs $120-$250 for a standard home, or $25-$50 per hour. Deep cleaning runs $200-$400+. Recurring service (weekly/biweekly) often discounts 10-20%. Prices vary by home size, condition, and location."
      },
      {
        question: "How often should I have my house professionally cleaned?",
        answer: "Weekly cleaning keeps homes consistently tidy. Biweekly works for most families and is most popular. Monthly deep cleans suit those who maintain between visits. Consider your household size, pets, and tolerance for mess."
      },
      {
        question: "Should I tip my house cleaner?",
        answer: "Tipping isn't required but appreciated—15-20% for one-time cleans, $10-$20 per regular visit, or a larger holiday bonus (equivalent to one cleaning). For cleaning company employees, check if tips go directly to cleaners."
      },
      {
        question: "How much does carpet cleaning cost?",
        answer: "Professional carpet cleaning costs $25-$75 per room or $0.20-$0.40 per sq ft. Whole-house cleaning runs $200-$500 for average homes. Stain treatment, pet odor removal, and furniture moving add to cost."
      },
      {
        question: "What's included in a deep cleaning?",
        answer: "Deep cleaning goes beyond regular cleaning: inside appliances, behind furniture, baseboards, window sills, light fixtures, cabinet interiors, and detailed bathroom/kitchen scrubbing. Typically takes 2-3x longer than standard cleaning."
      }
    ]
  },
  
  // MOVING
  {
    slug: "moving-storage",
    name: "Moving & Storage",
    description: "Questions about moving companies, storage units, and relocation services.",
    icon: "📦",
    faqs: [
      {
        question: "How much do movers cost?",
        answer: "Local moves cost $80-$150/hour for 2 movers + truck, totaling $300-$1,500 for most moves. Long-distance moves run $2,000-$7,500+ based on distance and weight. Get binding estimates to avoid surprises. Compare quotes on DigsAndGigs."
      },
      {
        question: "How far in advance should I book movers?",
        answer: "Book 4-6 weeks ahead for most moves, 6-8 weeks for summer moves or month-end dates. Last-minute booking is possible but limits options and may cost more. Flexible dates often get better rates."
      },
      {
        question: "How much should I tip movers?",
        answer: "Tip $20-$40 per mover for local moves, $40-$60+ for long-distance or challenging moves. Base it on job difficulty, time, and service quality. Tip individually and in cash at the end of the move."
      },
      {
        question: "What size storage unit do I need?",
        answer: "5x5 fits a small closet worth. 5x10 fits a studio apartment or one room. 10x10 fits a one-bedroom apartment. 10x20 fits a three-bedroom home. Stacking and organization maximize space efficiency."
      },
      {
        question: "Should I hire movers or rent a truck?",
        answer: "DIY saves money if you have help and can do heavy lifting. Movers are worth it for: large/heavy items, stairs, tight spaces, or if your time is valuable. Factor in truck rental, gas, insurance, and your labor."
      }
    ]
  },
  
  // BEAUTY
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    description: "Questions about hair stylists, salon services, and beauty professionals.",
    icon: "💇",
    faqs: [
      {
        question: "How much does a haircut cost?",
        answer: "Women's haircuts cost $40-$100+ at salons, $20-$40 at chains. Men's cuts run $20-$50 at barbershops, $15-$25 at chains. Prices vary by stylist experience, location, and salon prestige. Tips of 15-20% are standard."
      },
      {
        question: "How much does hair coloring cost?",
        answer: "Single process color costs $75-$150, highlights $100-$250, balayage $150-$350+. Root touch-ups run $50-$100. Color correction for fixes can exceed $300+. Prices vary significantly by hair length and technique complexity."
      },
      {
        question: "How do I find a good hair stylist?",
        answer: "Check Instagram for portfolio, read reviews mentioning your hair type, ask for consultations, and start with a simple service. Look for stylists experienced with your hair texture. Referrals from friends with similar hair help."
      },
      {
        question: "How much should I tip my hairstylist?",
        answer: "Tip 15-20% for standard service, 20-25% for exceptional service. Tip shampoo assistants $3-$5. If the owner does your hair, tipping is optional but appreciated. Holiday tips often equal one service cost."
      },
      {
        question: "How often should I get my hair cut?",
        answer: "Short styles need cuts every 3-4 weeks. Medium length works at 6-8 weeks. Long hair benefits from trims every 8-12 weeks. If growing out your hair, longer intervals are fine but trims prevent split ends."
      }
    ]
  },
  
  // GENERAL
  {
    slug: "hiring-contractors",
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

export const getFAQCategoriesByType = (type: 'home' | 'financial' | 'tech' | 'other'): FAQCategory[] => {
  const homeCategories = ['plumbing', 'electrical', 'roofing', 'hvac', 'landscaping', 'painting', 'cleaning-maintenance', 'moving-storage'];
  const financialCategories = ['credit-repair', 'tax-relief', 'legal-services', 'insurance', 'mortgage-financing', 'financial-services'];
  const techCategories = ['technology-services'];
  
  switch (type) {
    case 'home':
      return faqCategories.filter(c => homeCategories.includes(c.slug));
    case 'financial':
      return faqCategories.filter(c => financialCategories.includes(c.slug));
    case 'tech':
      return faqCategories.filter(c => techCategories.includes(c.slug));
    default:
      return faqCategories.filter(c => 
        !homeCategories.includes(c.slug) && 
        !financialCategories.includes(c.slug) && 
        !techCategories.includes(c.slug)
      );
  }
};
