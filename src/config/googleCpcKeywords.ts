/**
 * Google CPC Keyword Database for Exclusive Lead Pricing
 * 
 * This data represents the top 20 most expensive Google Ads keywords by industry.
 * Diggers will be limited to selecting from these keywords for exclusive leads.
 * 
 * Pricing Strategy:
 * - Exclusive 24-hour leads: 90% of Google CPC (10% discount)
 * - Non-exclusive leads: 20% of Google CPC
 * - Minimum exclusive: $80 (internet) / $60 (telemarketing)
 * - Minimum non-exclusive: $20
 * 
 * Data Sources: WordStream, Ahrefs, PPC.io, LocalIQ (2024-2025)
 */

export interface KeywordData {
  keyword: string;
  cpc: number; // Google CPC in USD
  searchVolume: number; // Estimated monthly searches
  competitionLevel: 'high' | 'medium' | 'low';
}

export interface IndustryCpcData {
  industry: string;
  category: 'high-value' | 'mid-value' | 'low-value';
  averageCpc: number;
  keywords: KeywordData[];
}

export const GOOGLE_CPC_KEYWORDS: IndustryCpcData[] = [
  // LEGAL SERVICES - Highest CPC Industry
  {
    industry: 'Personal Injury Law',
    category: 'high-value',
    averageCpc: 450,
    keywords: [
      { keyword: 'mesothelioma lawyer', cpc: 935, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'structured settlement', cpc: 875, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'car accident lawyer', cpc: 520, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'truck accident lawyer', cpc: 485, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'motorcycle accident lawyer', cpc: 465, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'personal injury attorney', cpc: 445, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'wrongful death lawyer', cpc: 425, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'slip and fall lawyer', cpc: 410, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'medical malpractice lawyer', cpc: 395, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'birth injury lawyer', cpc: 385, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'brain injury lawyer', cpc: 375, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'spinal cord injury lawyer', cpc: 365, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'work injury lawyer', cpc: 355, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'construction accident lawyer', cpc: 345, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'pedestrian accident lawyer', cpc: 335, searchVolume: 6600, competitionLevel: 'high' },
      { keyword: 'dog bite lawyer', cpc: 325, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'premises liability lawyer', cpc: 315, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'product liability lawyer', cpc: 305, searchVolume: 2900, competitionLevel: 'high' },
      { keyword: 'catastrophic injury lawyer', cpc: 295, searchVolume: 2400, competitionLevel: 'high' },
      { keyword: 'burn injury lawyer', cpc: 285, searchVolume: 1900, competitionLevel: 'high' },
    ],
  },
  {
    industry: 'Criminal Defense Law',
    category: 'high-value',
    averageCpc: 280,
    keywords: [
      { keyword: 'DUI lawyer', cpc: 385, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'DWI attorney', cpc: 365, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'criminal defense lawyer', cpc: 345, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'drug crime lawyer', cpc: 325, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'federal criminal lawyer', cpc: 305, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'white collar crime lawyer', cpc: 295, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'sex crime lawyer', cpc: 285, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'assault lawyer', cpc: 275, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'domestic violence lawyer', cpc: 265, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'theft lawyer', cpc: 255, searchVolume: 6600, competitionLevel: 'high' },
      { keyword: 'fraud lawyer', cpc: 245, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'expungement lawyer', cpc: 235, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'juvenile defense lawyer', cpc: 225, searchVolume: 2900, competitionLevel: 'high' },
      { keyword: 'weapons charge lawyer', cpc: 215, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'probation violation lawyer', cpc: 205, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'parole lawyer', cpc: 195, searchVolume: 2400, competitionLevel: 'high' },
      { keyword: 'appeals lawyer', cpc: 185, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'post conviction lawyer', cpc: 175, searchVolume: 1900, competitionLevel: 'high' },
      { keyword: 'warrant lawyer', cpc: 165, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'bail bond lawyer', cpc: 155, searchVolume: 8100, competitionLevel: 'high' },
    ],
  },
  {
    industry: 'Family Law',
    category: 'high-value',
    averageCpc: 195,
    keywords: [
      { keyword: 'divorce lawyer', cpc: 285, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'child custody lawyer', cpc: 265, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'family law attorney', cpc: 245, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'adoption lawyer', cpc: 225, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'child support lawyer', cpc: 215, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'paternity lawyer', cpc: 205, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'alimony lawyer', cpc: 195, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'mediation lawyer', cpc: 185, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'prenuptial agreement lawyer', cpc: 175, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'legal separation lawyer', cpc: 165, searchVolume: 6600, competitionLevel: 'high' },
      { keyword: 'guardianship lawyer', cpc: 155, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'visitation rights lawyer', cpc: 145, searchVolume: 4400, competitionLevel: 'high' },
      { keyword: 'modification lawyer', cpc: 135, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'enforcement lawyer', cpc: 125, searchVolume: 2900, competitionLevel: 'high' },
      { keyword: 'annulment lawyer', cpc: 115, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'collaborative divorce lawyer', cpc: 105, searchVolume: 2400, competitionLevel: 'medium' },
      { keyword: 'parental rights lawyer', cpc: 95, searchVolume: 3600, competitionLevel: 'medium' },
      { keyword: 'unmarried parents lawyer', cpc: 90, searchVolume: 1900, competitionLevel: 'medium' },
      { keyword: 'domestic partnership lawyer', cpc: 85, searchVolume: 1600, competitionLevel: 'medium' },
      { keyword: 'family mediation services', cpc: 80, searchVolume: 4400, competitionLevel: 'medium' },
    ],
  },

  // INSURANCE - Second Highest CPC Industry
  {
    industry: 'Auto Insurance',
    category: 'high-value',
    averageCpc: 165,
    keywords: [
      { keyword: 'car insurance quotes', cpc: 285, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'cheap car insurance', cpc: 265, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'auto insurance quotes online', cpc: 245, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'commercial auto insurance', cpc: 225, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'SR22 insurance', cpc: 205, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'high risk auto insurance', cpc: 195, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'classic car insurance', cpc: 185, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'full coverage car insurance', cpc: 175, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'liability car insurance', cpc: 165, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'comprehensive car insurance', cpc: 155, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'collision coverage', cpc: 145, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'uninsured motorist coverage', cpc: 135, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'teen driver insurance', cpc: 125, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'multi car insurance', cpc: 115, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'non owner car insurance', cpc: 105, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'pay per mile insurance', cpc: 95, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'rideshare insurance', cpc: 90, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'rental car insurance', cpc: 85, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'gap insurance', cpc: 80, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'roadside assistance insurance', cpc: 75, searchVolume: 18100, competitionLevel: 'medium' },
    ],
  },
  {
    industry: 'Health Insurance',
    category: 'high-value',
    averageCpc: 245,
    keywords: [
      { keyword: 'health insurance quotes', cpc: 385, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'affordable health insurance', cpc: 365, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'individual health insurance', cpc: 345, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'family health insurance', cpc: 325, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'short term health insurance', cpc: 305, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'catastrophic health insurance', cpc: 285, searchVolume: 6600, competitionLevel: 'high' },
      { keyword: 'small business health insurance', cpc: 265, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'self employed health insurance', cpc: 245, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'high deductible health plan', cpc: 225, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'PPO health insurance', cpc: 205, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'HMO health insurance', cpc: 195, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'Medicare supplement insurance', cpc: 185, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'Medicare Advantage plans', cpc: 175, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'dental insurance', cpc: 165, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'vision insurance', cpc: 155, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'prescription drug insurance', cpc: 145, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'maternity insurance', cpc: 135, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'health savings account', cpc: 125, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'COBRA insurance', cpc: 115, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'critical illness insurance', cpc: 105, searchVolume: 12100, competitionLevel: 'medium' },
    ],
  },
  {
    industry: 'Life Insurance',
    category: 'high-value',
    averageCpc: 185,
    keywords: [
      { keyword: 'life insurance quotes', cpc: 295, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'term life insurance', cpc: 275, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'whole life insurance', cpc: 255, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'universal life insurance', cpc: 235, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'no exam life insurance', cpc: 215, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'final expense insurance', cpc: 205, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'burial insurance', cpc: 195, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'guaranteed issue life insurance', cpc: 185, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'senior life insurance', cpc: 175, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'mortgage life insurance', cpc: 165, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'group life insurance', cpc: 155, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'accidental death insurance', cpc: 145, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'disability life insurance', cpc: 135, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'key person insurance', cpc: 125, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'indexed universal life', cpc: 115, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'variable life insurance', cpc: 105, searchVolume: 4400, competitionLevel: 'medium' },
      { keyword: 'survivorship life insurance', cpc: 95, searchVolume: 2900, competitionLevel: 'medium' },
      { keyword: 'simplified issue life insurance', cpc: 90, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'return of premium life insurance', cpc: 85, searchVolume: 3600, competitionLevel: 'medium' },
      { keyword: 'convertible term life insurance', cpc: 80, searchVolume: 2400, competitionLevel: 'medium' },
    ],
  },

  // FINANCIAL SERVICES
  {
    industry: 'Mortgage & Refinancing',
    category: 'high-value',
    averageCpc: 175,
    keywords: [
      { keyword: 'mortgage refinance rates', cpc: 295, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'cash out refinance', cpc: 275, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'FHA loan', cpc: 255, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'VA loan', cpc: 235, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'reverse mortgage', cpc: 225, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'jumbo mortgage', cpc: 215, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'first time home buyer loan', cpc: 205, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'home equity loan', cpc: 195, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'HELOC rates', cpc: 185, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'no closing cost refinance', cpc: 175, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: '203k loan', cpc: 165, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'construction loan', cpc: 155, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'hard money loan', cpc: 145, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'bridge loan', cpc: 135, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'USDA loan', cpc: 125, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'adjustable rate mortgage', cpc: 115, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'fixed rate mortgage', cpc: 105, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'interest only mortgage', cpc: 95, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'streamline refinance', cpc: 90, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'conventional loan', cpc: 85, searchVolume: 60500, competitionLevel: 'medium' },
    ],
  },
  {
    industry: 'Business Loans',
    category: 'high-value',
    averageCpc: 195,
    keywords: [
      { keyword: 'SBA loan', cpc: 325, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'business line of credit', cpc: 305, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'equipment financing', cpc: 285, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'commercial real estate loan', cpc: 265, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'merchant cash advance', cpc: 245, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'invoice factoring', cpc: 225, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'working capital loan', cpc: 205, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'startup business loan', cpc: 195, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'franchise financing', cpc: 185, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'business acquisition loan', cpc: 175, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'construction business loan', cpc: 165, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'restaurant financing', cpc: 155, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'medical practice loan', cpc: 145, searchVolume: 6600, competitionLevel: 'high' },
      { keyword: 'dental practice loan', cpc: 135, searchVolume: 5400, competitionLevel: 'high' },
      { keyword: 'veterinary practice loan', cpc: 125, searchVolume: 3600, competitionLevel: 'high' },
      { keyword: 'accounts receivable financing', cpc: 115, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'inventory financing', cpc: 105, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'bridge loan business', cpc: 95, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'mezzanine financing', cpc: 90, searchVolume: 2900, competitionLevel: 'medium' },
      { keyword: 'business credit card', cpc: 85, searchVolume: 74000, competitionLevel: 'medium' },
    ],
  },

  // HOME SERVICES - HVAC & PLUMBING
  {
    industry: 'HVAC Services',
    category: 'mid-value',
    averageCpc: 95,
    keywords: [
      { keyword: 'emergency HVAC repair', cpc: 185, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'AC repair near me', cpc: 165, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'furnace repair', cpc: 155, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'HVAC installation', cpc: 145, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'central air conditioning installation', cpc: 135, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'ductless mini split installation', cpc: 125, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'heat pump installation', cpc: 115, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'boiler installation', cpc: 105, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'commercial HVAC services', cpc: 95, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'duct cleaning services', cpc: 90, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'HVAC maintenance', cpc: 85, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'AC tune up', cpc: 80, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'furnace tune up', cpc: 75, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'thermostat installation', cpc: 70, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'AC compressor replacement', cpc: 65, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'furnace blower motor replacement', cpc: 60, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'air handler replacement', cpc: 58, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'evaporator coil replacement', cpc: 56, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'condenser unit replacement', cpc: 54, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'HVAC zone system installation', cpc: 52, searchVolume: 5400, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Plumbing Services',
    category: 'mid-value',
    averageCpc: 85,
    keywords: [
      { keyword: 'emergency plumber', cpc: 175, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'water heater installation', cpc: 155, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'sewer line repair', cpc: 145, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'drain cleaning service', cpc: 135, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'sump pump installation', cpc: 125, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'tankless water heater installation', cpc: 115, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'water line repair', cpc: 105, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'sewer line replacement', cpc: 95, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'gas line installation', cpc: 90, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'toilet installation', cpc: 85, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'garbage disposal installation', cpc: 80, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'faucet repair', cpc: 75, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'water leak detection', cpc: 70, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'pipe repair', cpc: 68, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'bathroom plumbing', cpc: 66, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'kitchen plumbing', cpc: 64, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'bathtub installation', cpc: 62, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'shower installation', cpc: 60, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'sink installation', cpc: 58, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'commercial plumbing services', cpc: 56, searchVolume: 12100, competitionLevel: 'low' },
    ],
  },

  // HOME SERVICES - ELECTRICAL & ROOFING
  {
    industry: 'Electrical Services',
    category: 'mid-value',
    averageCpc: 88,
    keywords: [
      { keyword: 'emergency electrician', cpc: 165, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'electrical panel upgrade', cpc: 155, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'whole house generator installation', cpc: 145, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'EV charger installation', cpc: 135, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'electrical rewiring', cpc: 125, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'ceiling fan installation', cpc: 115, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'outdoor lighting installation', cpc: 105, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'recessed lighting installation', cpc: 95, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'surge protector installation', cpc: 90, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'electrical inspection', cpc: 85, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'outlet installation', cpc: 80, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'light switch installation', cpc: 75, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'smoke detector installation', cpc: 70, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'chandelier installation', cpc: 68, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'landscape lighting installation', cpc: 66, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'home automation wiring', cpc: 64, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'security system wiring', cpc: 62, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'commercial electrical services', cpc: 60, searchVolume: 9900, competitionLevel: 'low' },
      { keyword: 'industrial electrical services', cpc: 58, searchVolume: 6600, competitionLevel: 'low' },
      { keyword: 'electrical troubleshooting', cpc: 56, searchVolume: 33100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Roofing Services',
    category: 'mid-value',
    averageCpc: 105,
    keywords: [
      { keyword: 'emergency roof repair', cpc: 195, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'roof replacement cost', cpc: 185, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'metal roof installation', cpc: 175, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'commercial roofing contractor', cpc: 165, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'flat roof repair', cpc: 155, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'shingle roof replacement', cpc: 145, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'roof leak repair', cpc: 135, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'TPO roofing installation', cpc: 125, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'slate roof repair', cpc: 115, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'tile roof installation', cpc: 105, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'roof inspection', cpc: 95, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'gutter installation', cpc: 90, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'skylight installation', cpc: 85, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'roof ventilation installation', cpc: 80, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'chimney flashing repair', cpc: 75, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'roof coating', cpc: 72, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'ice dam removal', cpc: 70, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'roof moss removal', cpc: 68, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'storm damage roof repair', cpc: 66, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'asphalt shingle installation', cpc: 64, searchVolume: 33100, competitionLevel: 'low' },
    ],
  },

  // HOME IMPROVEMENT & REMODELING
  {
    industry: 'Kitchen Remodeling',
    category: 'mid-value',
    averageCpc: 115,
    keywords: [
      { keyword: 'kitchen remodel cost', cpc: 205, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'custom kitchen cabinets', cpc: 195, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'kitchen renovation contractor', cpc: 185, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'luxury kitchen remodel', cpc: 175, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'kitchen countertop installation', cpc: 165, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'kitchen island installation', cpc: 155, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'kitchen cabinet refacing', cpc: 145, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'granite countertop installation', cpc: 135, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'quartz countertop installation', cpc: 125, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'kitchen backsplash installation', cpc: 115, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'kitchen floor installation', cpc: 105, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'kitchen lighting installation', cpc: 95, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'kitchen sink installation', cpc: 90, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'kitchen appliance installation', cpc: 85, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'pantry installation', cpc: 80, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'kitchen peninsula installation', cpc: 78, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'open concept kitchen remodel', cpc: 76, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'kitchen paint cabinets', cpc: 74, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'kitchen hardware installation', cpc: 72, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'kitchen design consultation', cpc: 70, searchVolume: 33100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Bathroom Remodeling',
    category: 'mid-value',
    averageCpc: 105,
    keywords: [
      { keyword: 'bathroom remodel cost', cpc: 195, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'master bathroom remodel', cpc: 185, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'walk in shower installation', cpc: 175, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'bathroom renovation contractor', cpc: 165, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'luxury bathroom remodel', cpc: 155, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'bathroom tile installation', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'bathroom vanity installation', cpc: 135, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'tub to shower conversion', cpc: 125, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'bathroom floor installation', cpc: 115, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'bathroom lighting installation', cpc: 105, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'bathroom mirror installation', cpc: 95, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'bathroom exhaust fan installation', cpc: 90, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'bathroom countertop installation', cpc: 85, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'handicap bathroom remodel', cpc: 80, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'bathroom waterproofing', cpc: 78, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'heated bathroom floor installation', cpc: 76, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'bathroom storage installation', cpc: 74, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'powder room remodel', cpc: 72, searchVolume: 18100, competitionLevel: 'low' },
      { keyword: 'bathroom paint', cpc: 70, searchVolume: 60500, competitionLevel: 'low' },
      { keyword: 'bathroom design consultation', cpc: 68, searchVolume: 27100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Flooring Installation',
    category: 'mid-value',
    averageCpc: 82,
    keywords: [
      { keyword: 'hardwood floor installation cost', cpc: 155, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'tile flooring installation', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'luxury vinyl plank installation', cpc: 135, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'carpet installation', cpc: 125, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'laminate flooring installation', cpc: 115, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'engineered hardwood installation', cpc: 105, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'bamboo flooring installation', cpc: 95, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'cork flooring installation', cpc: 90, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'marble floor installation', cpc: 85, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'porcelain tile installation', cpc: 80, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'commercial flooring installation', cpc: 75, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'floor refinishing', cpc: 72, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'subfloor installation', cpc: 70, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'radiant floor heating installation', cpc: 68, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'epoxy floor coating', cpc: 66, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'stair flooring installation', cpc: 64, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'floor leveling', cpc: 62, searchVolume: 22200, competitionLevel: 'low' },
      { keyword: 'floor transition strips installation', cpc: 60, searchVolume: 14800, competitionLevel: 'low' },
      { keyword: 'floor soundproofing', cpc: 58, searchVolume: 9900, competitionLevel: 'low' },
      { keyword: 'floor moisture barrier installation', cpc: 56, searchVolume: 6600, competitionLevel: 'low' },
    ],
  },

  // HEALTHCARE & MEDICAL
  {
    industry: 'Dental Services',
    category: 'mid-value',
    averageCpc: 95,
    keywords: [
      { keyword: 'dental implants cost', cpc: 185, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'cosmetic dentist near me', cpc: 175, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'invisalign cost', cpc: 165, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'teeth whitening', cpc: 155, searchVolume: 165000, competitionLevel: 'high' },
      { keyword: 'veneers cost', cpc: 145, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'emergency dentist', cpc: 135, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'root canal therapy', cpc: 125, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'dental crowns', cpc: 115, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'tooth extraction', cpc: 105, searchVolume: 110000, competitionLevel: 'medium' },
      { keyword: 'wisdom teeth removal', cpc: 95, searchVolume: 165000, competitionLevel: 'medium' },
      { keyword: 'dental bridges', cpc: 90, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'dentures cost', cpc: 85, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'orthodontist near me', cpc: 80, searchVolume: 110000, competitionLevel: 'medium' },
      { keyword: 'gum disease treatment', cpc: 78, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'dental bonding', cpc: 76, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'teeth cleaning', cpc: 74, searchVolume: 201000, competitionLevel: 'medium' },
      { keyword: 'pediatric dentist', cpc: 72, searchVolume: 110000, competitionLevel: 'medium' },
      { keyword: 'sedation dentistry', cpc: 70, searchVolume: 40500, competitionLevel: 'low' },
      { keyword: 'dental sealants', cpc: 68, searchVolume: 49500, competitionLevel: 'low' },
      { keyword: 'fluoride treatment', cpc: 66, searchVolume: 60500, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Cosmetic Surgery',
    category: 'high-value',
    averageCpc: 165,
    keywords: [
      { keyword: 'breast augmentation cost', cpc: 295, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'liposuction cost', cpc: 285, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'rhinoplasty surgeon', cpc: 275, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'tummy tuck cost', cpc: 265, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'facelift surgeon', cpc: 255, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'blepharoplasty cost', cpc: 245, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'Brazilian butt lift cost', cpc: 235, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'breast lift cost', cpc: 225, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'mommy makeover cost', cpc: 215, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'breast reduction cost', cpc: 205, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'otoplasty cost', cpc: 195, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'brow lift cost', cpc: 185, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'arm lift cost', cpc: 175, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'thigh lift cost', cpc: 165, searchVolume: 9900, competitionLevel: 'high' },
      { keyword: 'chin implant cost', cpc: 155, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'cheek implants cost', cpc: 145, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'lip lift cost', cpc: 135, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'neck lift cost', cpc: 125, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'fat transfer cost', cpc: 115, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'scar revision cost', cpc: 105, searchVolume: 12100, competitionLevel: 'medium' },
    ],
  },

  // MORE LEGAL SERVICES
  {
    industry: 'Immigration Law',
    category: 'high-value',
    averageCpc: 165,
    keywords: [
      { keyword: 'immigration lawyer', cpc: 295, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'green card lawyer', cpc: 275, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'deportation lawyer', cpc: 255, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'visa lawyer', cpc: 235, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'citizenship lawyer', cpc: 215, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'asylum lawyer', cpc: 205, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'work permit lawyer', cpc: 195, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'H1B visa lawyer', cpc: 185, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'K1 visa lawyer', cpc: 175, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'naturalization lawyer', cpc: 165, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'immigration appeals lawyer', cpc: 155, searchVolume: 8100, competitionLevel: 'high' },
      { keyword: 'DACA lawyer', cpc: 145, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'waiver lawyer', cpc: 135, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'family petition lawyer', cpc: 125, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'adjustment of status lawyer', cpc: 115, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'consular processing lawyer', cpc: 105, searchVolume: 5400, competitionLevel: 'medium' },
      { keyword: 'employment immigration lawyer', cpc: 95, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'removal defense lawyer', cpc: 90, searchVolume: 4400, competitionLevel: 'medium' },
      { keyword: 'immigration bond lawyer', cpc: 85, searchVolume: 3600, competitionLevel: 'medium' },
      { keyword: 'TPS lawyer', cpc: 80, searchVolume: 2900, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Bankruptcy Law',
    category: 'high-value',
    averageCpc: 145,
    keywords: [
      { keyword: 'bankruptcy lawyer', cpc: 265, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'Chapter 7 bankruptcy lawyer', cpc: 245, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'Chapter 13 bankruptcy lawyer', cpc: 225, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'business bankruptcy lawyer', cpc: 205, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'foreclosure defense lawyer', cpc: 195, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'debt relief lawyer', cpc: 185, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'Chapter 11 bankruptcy lawyer', cpc: 175, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'bankruptcy attorney near me', cpc: 165, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'debt settlement lawyer', cpc: 155, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'bankruptcy consultation', cpc: 145, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'stop foreclosure lawyer', cpc: 135, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'wage garnishment lawyer', cpc: 125, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'repossession defense lawyer', cpc: 115, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'creditor harassment lawyer', cpc: 105, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'bankruptcy discharge lawyer', cpc: 95, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'bankruptcy alternatives lawyer', cpc: 90, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'bankruptcy trustee lawyer', cpc: 85, searchVolume: 4400, competitionLevel: 'medium' },
      { keyword: 'bankruptcy appeal lawyer', cpc: 80, searchVolume: 2900, competitionLevel: 'medium' },
      { keyword: 'bankruptcy modification lawyer', cpc: 78, searchVolume: 3600, competitionLevel: 'low' },
      { keyword: 'bankruptcy fraud lawyer', cpc: 76, searchVolume: 1900, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Employment Law',
    category: 'high-value',
    averageCpc: 135,
    keywords: [
      { keyword: 'employment lawyer', cpc: 255, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'wrongful termination lawyer', cpc: 235, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'discrimination lawyer', cpc: 215, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'sexual harassment lawyer', cpc: 205, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'workplace retaliation lawyer', cpc: 195, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'whistleblower lawyer', cpc: 185, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'hostile work environment lawyer', cpc: 175, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'FMLA lawyer', cpc: 165, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'wage and hour lawyer', cpc: 155, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'unpaid wages lawyer', cpc: 145, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'severance agreement lawyer', cpc: 135, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'non-compete lawyer', cpc: 125, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'disability discrimination lawyer', cpc: 115, searchVolume: 14800, competitionLevel: 'medium' },
      { keyword: 'age discrimination lawyer', cpc: 105, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'pregnancy discrimination lawyer', cpc: 95, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'overtime lawyer', cpc: 90, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'workers rights lawyer', cpc: 85, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'employee benefits lawyer', cpc: 80, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'labor law attorney', cpc: 78, searchVolume: 22200, competitionLevel: 'low' },
      { keyword: 'employment contract lawyer', cpc: 76, searchVolume: 12100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Real Estate Law',
    category: 'high-value',
    averageCpc: 125,
    keywords: [
      { keyword: 'real estate lawyer', cpc: 225, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'property lawyer', cpc: 205, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'landlord tenant lawyer', cpc: 195, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'eviction lawyer', cpc: 185, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'real estate attorney near me', cpc: 175, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'title dispute lawyer', cpc: 165, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'boundary dispute lawyer', cpc: 155, searchVolume: 12100, competitionLevel: 'high' },
      { keyword: 'easement lawyer', cpc: 145, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'zoning lawyer', cpc: 135, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'real estate closing lawyer', cpc: 125, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'commercial real estate lawyer', cpc: 115, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'construction lien lawyer', cpc: 105, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'adverse possession lawyer', cpc: 95, searchVolume: 5400, competitionLevel: 'medium' },
      { keyword: 'partition action lawyer', cpc: 90, searchVolume: 4400, competitionLevel: 'medium' },
      { keyword: 'quiet title lawyer', cpc: 85, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'real estate contract lawyer', cpc: 80, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'deed transfer lawyer', cpc: 78, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'HOA lawyer', cpc: 76, searchVolume: 40500, competitionLevel: 'low' },
      { keyword: 'property tax lawyer', cpc: 74, searchVolume: 18100, competitionLevel: 'low' },
      { keyword: 'real estate litigation lawyer', cpc: 72, searchVolume: 14800, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Estate Planning Law',
    category: 'mid-value',
    averageCpc: 115,
    keywords: [
      { keyword: 'estate planning lawyer', cpc: 205, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'will attorney', cpc: 195, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'trust lawyer', cpc: 185, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'probate lawyer', cpc: 175, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'living trust lawyer', cpc: 165, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'revocable trust lawyer', cpc: 155, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'irrevocable trust lawyer', cpc: 145, searchVolume: 18100, competitionLevel: 'high' },
      { keyword: 'power of attorney lawyer', cpc: 135, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'estate tax lawyer', cpc: 125, searchVolume: 22200, competitionLevel: 'high' },
      { keyword: 'asset protection lawyer', cpc: 115, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'probate administration lawyer', cpc: 105, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'estate litigation lawyer', cpc: 95, searchVolume: 8100, competitionLevel: 'medium' },
      { keyword: 'will contest lawyer', cpc: 90, searchVolume: 12100, competitionLevel: 'medium' },
      { keyword: 'special needs trust lawyer', cpc: 85, searchVolume: 9900, competitionLevel: 'medium' },
      { keyword: 'charitable trust lawyer', cpc: 80, searchVolume: 5400, competitionLevel: 'medium' },
      { keyword: 'healthcare proxy lawyer', cpc: 78, searchVolume: 6600, competitionLevel: 'medium' },
      { keyword: 'living will lawyer', cpc: 76, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'beneficiary designation lawyer', cpc: 74, searchVolume: 4400, competitionLevel: 'low' },
      { keyword: 'guardianship estate lawyer', cpc: 72, searchVolume: 8100, competitionLevel: 'low' },
      { keyword: 'inheritance lawyer', cpc: 70, searchVolume: 40500, competitionLevel: 'low' },
    ],
  },

  // CONSTRUCTION & HOME SERVICES
  {
    industry: 'Roofing Services',
    category: 'mid-value',
    averageCpc: 105,
    keywords: [
      { keyword: 'roof replacement cost', cpc: 195, searchVolume: 165000, competitionLevel: 'high' },
      { keyword: 'emergency roof repair', cpc: 185, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'roofing contractor near me', cpc: 175, searchVolume: 201000, competitionLevel: 'high' },
      { keyword: 'metal roofing installation', cpc: 165, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'flat roof repair', cpc: 155, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'commercial roofing contractor', cpc: 145, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'roof leak repair', cpc: 135, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'shingle roof replacement', cpc: 125, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'tile roof installation', cpc: 115, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'slate roof repair', cpc: 105, searchVolume: 14800, competitionLevel: 'high' },
      { keyword: 'roof inspection services', cpc: 95, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'roof ventilation installation', cpc: 90, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'skylight installation', cpc: 85, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'gutter installation', cpc: 80, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'roof coating services', cpc: 78, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'storm damage roof repair', cpc: 76, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'roof flashing repair', cpc: 74, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'chimney flashing repair', cpc: 72, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'roof maintenance services', cpc: 70, searchVolume: 33100, competitionLevel: 'low' },
      { keyword: 'roof warranty services', cpc: 68, searchVolume: 12100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Electrical Services',
    category: 'mid-value',
    averageCpc: 95,
    keywords: [
      { keyword: 'emergency electrician', cpc: 185, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'electrical panel upgrade', cpc: 175, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'whole house generator installation', cpc: 165, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'electrical rewiring cost', cpc: 155, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'commercial electrician', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'EV charger installation', cpc: 135, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'electrical service upgrade', cpc: 125, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'circuit breaker replacement', cpc: 115, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'lighting installation services', cpc: 105, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'electrical troubleshooting', cpc: 95, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'ceiling fan installation', cpc: 90, searchVolume: 135000, competitionLevel: 'medium' },
      { keyword: 'outlet installation', cpc: 85, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'GFCI outlet installation', cpc: 80, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'smoke detector installation', cpc: 78, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'surge protection installation', cpc: 76, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'landscape lighting installation', cpc: 74, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'recessed lighting installation', cpc: 72, searchVolume: 74000, competitionLevel: 'low' },
      { keyword: 'electrical safety inspection', cpc: 70, searchVolume: 33100, competitionLevel: 'low' },
      { keyword: 'knob and tube wiring replacement', cpc: 68, searchVolume: 18100, competitionLevel: 'low' },
      { keyword: 'home automation electrician', cpc: 66, searchVolume: 22200, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'General Contractors',
    category: 'mid-value',
    averageCpc: 115,
    keywords: [
      { keyword: 'home addition contractor', cpc: 205, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'home remodeling contractor', cpc: 195, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'general contractor near me', cpc: 185, searchVolume: 201000, competitionLevel: 'high' },
      { keyword: 'custom home builder', cpc: 175, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'commercial contractor', cpc: 165, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'home renovation contractor', cpc: 155, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'basement finishing contractor', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'house framing contractor', cpc: 135, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'home repair contractor', cpc: 125, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'room addition contractor', cpc: 115, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'porch builder', cpc: 105, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'deck builder', cpc: 95, searchVolume: 135000, competitionLevel: 'medium' },
      { keyword: 'shed builder', cpc: 90, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'garage builder', cpc: 85, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'ADU contractor', cpc: 80, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'storm damage contractor', cpc: 78, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'historical restoration contractor', cpc: 76, searchVolume: 12100, competitionLevel: 'low' },
      { keyword: 'green building contractor', cpc: 74, searchVolume: 18100, competitionLevel: 'low' },
      { keyword: 'structural engineer contractor', cpc: 72, searchVolume: 22200, competitionLevel: 'low' },
      { keyword: 'permitted contractor', cpc: 70, searchVolume: 49500, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Kitchen Remodeling',
    category: 'mid-value',
    averageCpc: 125,
    keywords: [
      { keyword: 'kitchen remodeling cost', cpc: 225, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'kitchen renovation contractor', cpc: 215, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'custom kitchen cabinets', cpc: 205, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'kitchen cabinet installation', cpc: 195, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'kitchen countertop installation', cpc: 185, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'granite countertop installation', cpc: 175, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'quartz countertop installation', cpc: 165, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'kitchen backsplash installation', cpc: 155, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'kitchen island installation', cpc: 145, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'kitchen flooring installation', cpc: 135, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'kitchen lighting design', cpc: 125, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'kitchen plumbing installation', cpc: 115, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'kitchen sink installation', cpc: 105, searchVolume: 110000, competitionLevel: 'medium' },
      { keyword: 'kitchen faucet installation', cpc: 95, searchVolume: 135000, competitionLevel: 'medium' },
      { keyword: 'cabinet refacing', cpc: 90, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'cabinet painting', cpc: 85, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'kitchen design services', cpc: 80, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'custom pantry design', cpc: 78, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'kitchen appliance installation', cpc: 76, searchVolume: 49500, competitionLevel: 'low' },
      { keyword: 'kitchen ventilation installation', cpc: 74, searchVolume: 22200, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Bathroom Remodeling',
    category: 'mid-value',
    averageCpc: 115,
    keywords: [
      { keyword: 'bathroom remodeling cost', cpc: 215, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'bathroom renovation contractor', cpc: 205, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'shower installation', cpc: 195, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'bathtub installation', cpc: 185, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'walk-in shower installation', cpc: 175, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'tile shower installation', cpc: 165, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'bathroom vanity installation', cpc: 155, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'bathroom tile installation', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'bathtub to shower conversion', cpc: 135, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'bathroom flooring installation', cpc: 125, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'bathroom lighting installation', cpc: 115, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'bathroom ventilation fan', cpc: 105, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'bathroom mirror installation', cpc: 95, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'bathroom countertop installation', cpc: 90, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'accessible bathroom remodel', cpc: 85, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'bathroom addition', cpc: 80, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'half bath installation', cpc: 78, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'bathroom design services', cpc: 76, searchVolume: 49500, competitionLevel: 'low' },
      { keyword: 'steam shower installation', cpc: 74, searchVolume: 14800, competitionLevel: 'low' },
      { keyword: 'spa bathroom remodel', cpc: 72, searchVolume: 12100, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Landscaping Services',
    category: 'mid-value',
    averageCpc: 85,
    keywords: [
      { keyword: 'landscape design services', cpc: 165, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'hardscape installation', cpc: 155, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'patio installation', cpc: 145, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'retaining wall installation', cpc: 135, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'outdoor kitchen installation', cpc: 125, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'pool landscaping', cpc: 115, searchVolume: 33100, competitionLevel: 'high' },
      { keyword: 'irrigation system installation', cpc: 105, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'sod installation', cpc: 95, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'artificial turf installation', cpc: 90, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'tree removal service', cpc: 85, searchVolume: 165000, competitionLevel: 'medium' },
      { keyword: 'tree trimming service', cpc: 80, searchVolume: 201000, competitionLevel: 'medium' },
      { keyword: 'landscape lighting installation', cpc: 78, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'drainage solution services', cpc: 76, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'stone pathway installation', cpc: 74, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'garden design services', cpc: 72, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'mulch installation', cpc: 70, searchVolume: 90500, competitionLevel: 'low' },
      { keyword: 'flower bed installation', cpc: 68, searchVolume: 60500, competitionLevel: 'low' },
      { keyword: 'landscape maintenance', cpc: 66, searchVolume: 135000, competitionLevel: 'low' },
      { keyword: 'lawn care service', cpc: 64, searchVolume: 201000, competitionLevel: 'low' },
      { keyword: 'shrub installation', cpc: 62, searchVolume: 49500, competitionLevel: 'low' },
    ],
  },

  // TECHNOLOGY SERVICES
  {
    industry: 'Web Development',
    category: 'mid-value',
    averageCpc: 95,
    keywords: [
      { keyword: 'custom website development', cpc: 175, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'ecommerce website development', cpc: 165, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'wordpress development', cpc: 155, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'web application development', cpc: 145, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'responsive web design', cpc: 135, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'website redesign services', cpc: 125, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'shopify developer', cpc: 115, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'react developer', cpc: 105, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'angular developer', cpc: 95, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'vue.js developer', cpc: 90, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'full stack developer', cpc: 85, searchVolume: 135000, competitionLevel: 'medium' },
      { keyword: 'frontend developer', cpc: 80, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'backend developer', cpc: 78, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'API development', cpc: 76, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'website maintenance', cpc: 74, searchVolume: 110000, competitionLevel: 'medium' },
      { keyword: 'CMS development', cpc: 72, searchVolume: 40500, competitionLevel: 'low' },
      { keyword: 'web portal development', cpc: 70, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'progressive web app development', cpc: 68, searchVolume: 22200, competitionLevel: 'low' },
      { keyword: 'web hosting services', cpc: 66, searchVolume: 201000, competitionLevel: 'low' },
      { keyword: 'website security services', cpc: 64, searchVolume: 49500, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'SEO Services',
    category: 'mid-value',
    averageCpc: 115,
    keywords: [
      { keyword: 'SEO services', cpc: 205, searchVolume: 201000, competitionLevel: 'high' },
      { keyword: 'local SEO services', cpc: 195, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'ecommerce SEO', cpc: 185, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'enterprise SEO services', cpc: 175, searchVolume: 27100, competitionLevel: 'high' },
      { keyword: 'SEO consultant', cpc: 165, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'SEO agency', cpc: 155, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'link building services', cpc: 145, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'technical SEO services', cpc: 135, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'content marketing services', cpc: 125, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'keyword research services', cpc: 115, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'on-page SEO services', cpc: 105, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'off-page SEO services', cpc: 95, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'SEO audit services', cpc: 90, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'SEO copywriting', cpc: 85, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'Google penalty recovery', cpc: 80, searchVolume: 18100, competitionLevel: 'medium' },
      { keyword: 'international SEO', cpc: 78, searchVolume: 22200, competitionLevel: 'medium' },
      { keyword: 'mobile SEO', cpc: 76, searchVolume: 33100, competitionLevel: 'low' },
      { keyword: 'voice search optimization', cpc: 74, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'video SEO', cpc: 72, searchVolume: 40500, competitionLevel: 'low' },
      { keyword: 'SEO training', cpc: 70, searchVolume: 49500, competitionLevel: 'low' },
    ],
  },
  {
    industry: 'Digital Marketing',
    category: 'mid-value',
    averageCpc: 105,
    keywords: [
      { keyword: 'PPC management services', cpc: 195, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'Google Ads management', cpc: 185, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'Facebook Ads management', cpc: 175, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'social media marketing', cpc: 165, searchVolume: 165000, competitionLevel: 'high' },
      { keyword: 'email marketing services', cpc: 155, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'marketing automation', cpc: 145, searchVolume: 60500, competitionLevel: 'high' },
      { keyword: 'conversion rate optimization', cpc: 135, searchVolume: 49500, competitionLevel: 'high' },
      { keyword: 'digital marketing agency', cpc: 125, searchVolume: 201000, competitionLevel: 'high' },
      { keyword: 'influencer marketing', cpc: 115, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'content strategy', cpc: 105, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'brand strategy', cpc: 95, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'online reputation management', cpc: 90, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'marketing analytics', cpc: 85, searchVolume: 74000, competitionLevel: 'medium' },
      { keyword: 'video marketing', cpc: 80, searchVolume: 90500, competitionLevel: 'medium' },
      { keyword: 'affiliate marketing', cpc: 78, searchVolume: 135000, competitionLevel: 'medium' },
      { keyword: 'retargeting ads', cpc: 76, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'LinkedIn advertising', cpc: 74, searchVolume: 40500, competitionLevel: 'low' },
      { keyword: 'Instagram marketing', cpc: 72, searchVolume: 110000, competitionLevel: 'low' },
      { keyword: 'TikTok marketing', cpc: 70, searchVolume: 90500, competitionLevel: 'low' },
      { keyword: 'YouTube marketing', cpc: 68, searchVolume: 74000, competitionLevel: 'low' },
    ],
  },

  // BUSINESS SERVICES
  {
    industry: 'Accounting Services',
    category: 'mid-value',
    averageCpc: 95,
    keywords: [
      { keyword: 'CPA near me', cpc: 175, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'tax preparation services', cpc: 165, searchVolume: 201000, competitionLevel: 'high' },
      { keyword: 'business accounting services', cpc: 155, searchVolume: 90500, competitionLevel: 'high' },
      { keyword: 'bookkeeping services', cpc: 145, searchVolume: 135000, competitionLevel: 'high' },
      { keyword: 'payroll services', cpc: 135, searchVolume: 110000, competitionLevel: 'high' },
      { keyword: 'tax planning services', cpc: 125, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'CFO services', cpc: 115, searchVolume: 40500, competitionLevel: 'high' },
      { keyword: 'QuickBooks consultant', cpc: 105, searchVolume: 74000, competitionLevel: 'high' },
      { keyword: 'financial statement preparation', cpc: 95, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'audit services', cpc: 90, searchVolume: 60500, competitionLevel: 'medium' },
      { keyword: 'forensic accounting', cpc: 85, searchVolume: 27100, competitionLevel: 'medium' },
      { keyword: 'estate tax preparation', cpc: 80, searchVolume: 33100, competitionLevel: 'medium' },
      { keyword: 'corporate tax services', cpc: 78, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'sales tax services', cpc: 76, searchVolume: 40500, competitionLevel: 'medium' },
      { keyword: 'business valuation', cpc: 74, searchVolume: 49500, competitionLevel: 'medium' },
      { keyword: 'IRS representation', cpc: 72, searchVolume: 60500, competitionLevel: 'low' },
      { keyword: 'tax resolution services', cpc: 70, searchVolume: 74000, competitionLevel: 'low' },
      { keyword: 'nonprofit accounting', cpc: 68, searchVolume: 27100, competitionLevel: 'low' },
      { keyword: 'construction accounting', cpc: 66, searchVolume: 18100, competitionLevel: 'low' },
      { keyword: 'remote bookkeeping', cpc: 64, searchVolume: 90500, competitionLevel: 'low' },
    ],
  },
];


/**
 * Calculate exclusive lead price based on average CPC
 * Formula: 1.2x the average CPC
 */
export const calculateExclusiveLeadPrice = (averageCpc: number): number => {
  const calculatedPrice = averageCpc * 1.2;
  // Enforce minimum of $80
  return Math.max(80, calculatedPrice);
};

/**
 * Calculate non-exclusive lead price based on average CPC
 * Default: 20% of average CPC
 */
export const calculateNonExclusiveLeadPrice = (
  averageCpc: number,
  percentage: number = 20
): number => {
  const calculatedPrice = averageCpc * (percentage / 100);
  // Enforce minimum of $20
  return Math.max(20, calculatedPrice);
};

/**
 * Get all available industries
 */
export const getAllCpcIndustries = (): string[] => {
  return GOOGLE_CPC_KEYWORDS.map(industry => industry.industry);
};

/**
 * Get keywords for a specific industry
 */
export const getKeywordsForIndustry = (industryName: string): KeywordData[] => {
  const industry = GOOGLE_CPC_KEYWORDS.find(ind => ind.industry === industryName);
  return industry?.keywords || [];
};

/**
 * Get industry data by name
 */
export const getIndustryData = (industryName: string): IndustryCpcData | undefined => {
  return GOOGLE_CPC_KEYWORDS.find(ind => ind.industry === industryName);
};

/**
 * Calculate pricing for a specific keyword
 */
export const getPricingForKeyword = (
  industryName: string,
  keyword: string
): {
  keyword: string;
  googleCpc: number;
  exclusivePrice: number;
  nonExclusivePrice: number;
  searchVolume: number;
  averageCpc: number;
  highestCpc: number;
} | null => {
  const industry = GOOGLE_CPC_KEYWORDS.find(ind => ind.industry === industryName);
  if (!industry) return null;

  const keywordData = industry.keywords.find(kw => kw.keyword === keyword);
  if (!keywordData) return null;

  const averageCpc = industry.averageCpc;
  const highestCpc = Math.max(...industry.keywords.map(k => k.cpc));

  return {
    keyword: keywordData.keyword,
    googleCpc: keywordData.cpc,
    exclusivePrice: calculateExclusiveLeadPrice(averageCpc),
    nonExclusivePrice: calculateNonExclusiveLeadPrice(averageCpc),
    searchVolume: keywordData.searchVolume,
    averageCpc,
    highestCpc,
  };
};

/**
 * Get the top 20 most expensive CPC keywords across ALL industries
 */
export const getTop20MostExpensiveKeywords = (): Array<{
  keyword: string;
  cpc: number;
  industry: string;
  exclusivePrice: number;
  nonExclusivePrice: number;
  searchVolume: number;
}> => {
  const allKeywords: Array<{
    keyword: string;
    cpc: number;
    industry: string;
    exclusivePrice: number;
    nonExclusivePrice: number;
    searchVolume: number;
  }> = [];

  // Collect all keywords from all industries
  GOOGLE_CPC_KEYWORDS.forEach(industry => {
    industry.keywords.forEach(keyword => {
      allKeywords.push({
        keyword: keyword.keyword,
        cpc: keyword.cpc,
        industry: industry.industry,
        exclusivePrice: calculateExclusiveLeadPrice(keyword.cpc),
        nonExclusivePrice: calculateNonExclusiveLeadPrice(keyword.cpc),
        searchVolume: keyword.searchVolume,
      });
    });
  });

  // Sort by CPC descending and return top 20
  return allKeywords
    .sort((a, b) => b.cpc - a.cpc)
    .slice(0, 20);
};

/**
 * TOP 20 MOST EXPENSIVE KEYWORDS ACROSS ALL INDUSTRIES
 * Updated: 2025
 */
export const TOP_20_MOST_EXPENSIVE_KEYWORDS = [
  { rank: 1, keyword: 'mesothelioma lawyer', cpc: 935, industry: 'Personal Injury Law', searchVolume: 8100 },
  { rank: 2, keyword: 'structured settlement', cpc: 875, industry: 'Personal Injury Law', searchVolume: 4400 },
  { rank: 3, keyword: 'car accident lawyer', cpc: 520, industry: 'Personal Injury Law', searchVolume: 27100 },
  { rank: 4, keyword: 'truck accident lawyer', cpc: 485, industry: 'Personal Injury Law', searchVolume: 18100 },
  { rank: 5, keyword: 'motorcycle accident lawyer', cpc: 465, industry: 'Personal Injury Law', searchVolume: 14800 },
  { rank: 6, keyword: 'personal injury attorney', cpc: 445, industry: 'Personal Injury Law', searchVolume: 33100 },
  { rank: 7, keyword: 'wrongful death lawyer', cpc: 425, industry: 'Personal Injury Law', searchVolume: 9900 },
  { rank: 8, keyword: 'slip and fall lawyer', cpc: 410, industry: 'Personal Injury Law', searchVolume: 12100 },
  { rank: 9, keyword: 'medical malpractice lawyer', cpc: 395, industry: 'Personal Injury Law', searchVolume: 8100 },
  { rank: 10, keyword: 'birth injury lawyer', cpc: 385, industry: 'Personal Injury Law', searchVolume: 5400 },
  { rank: 11, keyword: 'DUI lawyer', cpc: 385, industry: 'Criminal Defense Law', searchVolume: 49500 },
  { rank: 12, keyword: 'health insurance quotes', cpc: 385, industry: 'Health Insurance', searchVolume: 74000 },
  { rank: 13, keyword: 'brain injury lawyer', cpc: 375, industry: 'Personal Injury Law', searchVolume: 4400 },
  { rank: 14, keyword: 'affordable health insurance', cpc: 365, industry: 'Health Insurance', searchVolume: 40500 },
  { rank: 15, keyword: 'DWI attorney', cpc: 365, industry: 'Criminal Defense Law', searchVolume: 22200 },
  { rank: 16, keyword: 'spinal cord injury lawyer', cpc: 365, industry: 'Personal Injury Law', searchVolume: 3600 },
  { rank: 17, keyword: 'work injury lawyer', cpc: 355, industry: 'Personal Injury Law', searchVolume: 8100 },
  { rank: 18, keyword: 'individual health insurance', cpc: 345, industry: 'Health Insurance', searchVolume: 33100 },
  { rank: 19, keyword: 'criminal defense lawyer', cpc: 345, industry: 'Criminal Defense Law', searchVolume: 27100 },
  { rank: 20, keyword: 'construction accident lawyer', cpc: 345, industry: 'Personal Injury Law', searchVolume: 5400 },
] as const;
