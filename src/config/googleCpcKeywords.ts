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
];

/**
 * Calculate exclusive lead price based on Google CPC
 * Default: 90% of Google CPC (10% discount)
 */
export const calculateExclusiveLeadPrice = (
  googleCpc: number,
  discountPercentage: number = 10
): number => {
  const multiplier = (100 - discountPercentage) / 100;
  const calculatedPrice = googleCpc * multiplier;
  // Enforce minimum of $80
  return Math.max(80, calculatedPrice);
};

/**
 * Calculate non-exclusive lead price based on Google CPC
 * Default: 20% of Google CPC
 */
export const calculateNonExclusiveLeadPrice = (
  googleCpc: number,
  percentage: number = 20
): number => {
  const calculatedPrice = googleCpc * (percentage / 100);
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
} | null => {
  const industry = GOOGLE_CPC_KEYWORDS.find(ind => ind.industry === industryName);
  if (!industry) return null;

  const keywordData = industry.keywords.find(kw => kw.keyword === keyword);
  if (!keywordData) return null;

  return {
    keyword: keywordData.keyword,
    googleCpc: keywordData.cpc,
    exclusivePrice: calculateExclusiveLeadPrice(keywordData.cpc),
    nonExclusivePrice: calculateNonExclusiveLeadPrice(keywordData.cpc),
    searchVolume: keywordData.searchVolume,
  };
};
