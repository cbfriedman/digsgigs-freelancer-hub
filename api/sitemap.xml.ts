import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Top 100 US cities for programmatic SEO pages
const SEO_CITIES = [
  { city: "New York", state: "NY", slug: "new-york" },
  { city: "Los Angeles", state: "CA", slug: "los-angeles" },
  { city: "Chicago", state: "IL", slug: "chicago" },
  { city: "Houston", state: "TX", slug: "houston" },
  { city: "Phoenix", state: "AZ", slug: "phoenix" },
  { city: "Philadelphia", state: "PA", slug: "philadelphia" },
  { city: "San Antonio", state: "TX", slug: "san-antonio" },
  { city: "San Diego", state: "CA", slug: "san-diego" },
  { city: "Dallas", state: "TX", slug: "dallas" },
  { city: "San Jose", state: "CA", slug: "san-jose" },
  { city: "Austin", state: "TX", slug: "austin" },
  { city: "Jacksonville", state: "FL", slug: "jacksonville" },
  { city: "Fort Worth", state: "TX", slug: "fort-worth" },
  { city: "Columbus", state: "OH", slug: "columbus" },
  { city: "Charlotte", state: "NC", slug: "charlotte" },
  { city: "Indianapolis", state: "IN", slug: "indianapolis" },
  { city: "San Francisco", state: "CA", slug: "san-francisco" },
  { city: "Seattle", state: "WA", slug: "seattle" },
  { city: "Denver", state: "CO", slug: "denver" },
  { city: "Washington", state: "DC", slug: "washington-dc" },
  { city: "Nashville", state: "TN", slug: "nashville" },
  { city: "Oklahoma City", state: "OK", slug: "oklahoma-city" },
  { city: "Boston", state: "MA", slug: "boston" },
  { city: "El Paso", state: "TX", slug: "el-paso" },
  { city: "Portland", state: "OR", slug: "portland" },
  { city: "Las Vegas", state: "NV", slug: "las-vegas" },
  { city: "Detroit", state: "MI", slug: "detroit" },
  { city: "Memphis", state: "TN", slug: "memphis" },
  { city: "Louisville", state: "KY", slug: "louisville" },
  { city: "Baltimore", state: "MD", slug: "baltimore" },
  { city: "Milwaukee", state: "WI", slug: "milwaukee" },
  { city: "Albuquerque", state: "NM", slug: "albuquerque" },
  { city: "Tucson", state: "AZ", slug: "tucson" },
  { city: "Fresno", state: "CA", slug: "fresno" },
  { city: "Sacramento", state: "CA", slug: "sacramento" },
  { city: "Kansas City", state: "MO", slug: "kansas-city" },
  { city: "Mesa", state: "AZ", slug: "mesa" },
  { city: "Atlanta", state: "GA", slug: "atlanta" },
  { city: "Omaha", state: "NE", slug: "omaha" },
  { city: "Colorado Springs", state: "CO", slug: "colorado-springs" },
  { city: "Raleigh", state: "NC", slug: "raleigh" },
  { city: "Long Beach", state: "CA", slug: "long-beach" },
  { city: "Virginia Beach", state: "VA", slug: "virginia-beach" },
  { city: "Miami", state: "FL", slug: "miami" },
  { city: "Oakland", state: "CA", slug: "oakland" },
  { city: "Minneapolis", state: "MN", slug: "minneapolis" },
  { city: "Tulsa", state: "OK", slug: "tulsa" },
  { city: "Bakersfield", state: "CA", slug: "bakersfield" },
  { city: "Tampa", state: "FL", slug: "tampa" },
  { city: "Arlington", state: "TX", slug: "arlington" },
  { city: "New Orleans", state: "LA", slug: "new-orleans" },
  { city: "Cleveland", state: "OH", slug: "cleveland" },
  { city: "Honolulu", state: "HI", slug: "honolulu" },
  { city: "Anaheim", state: "CA", slug: "anaheim" },
  { city: "Lexington", state: "KY", slug: "lexington" },
  { city: "Henderson", state: "NV", slug: "henderson" },
  { city: "Orlando", state: "FL", slug: "orlando" },
  { city: "Irvine", state: "CA", slug: "irvine" },
  { city: "Newark", state: "NJ", slug: "newark" },
  { city: "St. Louis", state: "MO", slug: "st-louis" },
  { city: "Pittsburgh", state: "PA", slug: "pittsburgh" },
  { city: "Cincinnati", state: "OH", slug: "cincinnati" },
  { city: "Anchorage", state: "AK", slug: "anchorage" },
  { city: "Greensboro", state: "NC", slug: "greensboro" },
  { city: "Plano", state: "TX", slug: "plano" },
  { city: "Lincoln", state: "NE", slug: "lincoln" },
  { city: "Durham", state: "NC", slug: "durham" },
  { city: "Buffalo", state: "NY", slug: "buffalo" },
  { city: "Jersey City", state: "NJ", slug: "jersey-city" },
  { city: "Chandler", state: "AZ", slug: "chandler" },
  { city: "Chula Vista", state: "CA", slug: "chula-vista" },
  { city: "Gilbert", state: "AZ", slug: "gilbert" },
  { city: "Madison", state: "WI", slug: "madison" },
  { city: "Reno", state: "NV", slug: "reno" },
  { city: "Fort Wayne", state: "IN", slug: "fort-wayne" },
  { city: "North Las Vegas", state: "NV", slug: "north-las-vegas" },
  { city: "St. Petersburg", state: "FL", slug: "st-petersburg" },
  { city: "Lubbock", state: "TX", slug: "lubbock" },
  { city: "Irving", state: "TX", slug: "irving" },
  { city: "Laredo", state: "TX", slug: "laredo" },
  { city: "Winston-Salem", state: "NC", slug: "winston-salem" },
  { city: "Chesapeake", state: "VA", slug: "chesapeake" },
  { city: "Glendale", state: "AZ", slug: "glendale" },
  { city: "Garland", state: "TX", slug: "garland" },
  { city: "Scottsdale", state: "AZ", slug: "scottsdale" },
  { city: "Norfolk", state: "VA", slug: "norfolk" },
  { city: "Boise", state: "ID", slug: "boise" },
  { city: "Fremont", state: "CA", slug: "fremont" },
  { city: "Spokane", state: "WA", slug: "spokane" },
  { city: "Santa Ana", state: "CA", slug: "santa-ana" },
  { city: "San Bernardino", state: "CA", slug: "san-bernardino" },
  { city: "Tacoma", state: "WA", slug: "tacoma" },
  { city: "Fontana", state: "CA", slug: "fontana" },
  { city: "Modesto", state: "CA", slug: "modesto" },
  { city: "Moreno Valley", state: "CA", slug: "moreno-valley" },
  { city: "Fayetteville", state: "NC", slug: "fayetteville" },
  { city: "Yonkers", state: "NY", slug: "yonkers" },
  { city: "Des Moines", state: "IA", slug: "des-moines" },
  { city: "Birmingham", state: "AL", slug: "birmingham" },
  { city: "Rochester", state: "NY", slug: "rochester" },
];

// Industry specialties for programmatic pages
const INDUSTRY_SPECIALTIES: Record<string, string[]> = {
  "Credit Repair": ["Credit Score Improvement", "Credit Dispute Services", "Credit Restoration", "Collection Account Removal"],
  "Tax Relief Services": ["IRS Tax Debt Relief", "Offer in Compromise", "Tax Lien Removal", "Tax Levy Release"],
  "Legal Services": ["Personal Injury", "Family Law", "Criminal Defense", "Estate Planning", "Real Estate Law", "Business Law"],
  "Insurance": ["Life Insurance", "Health Insurance", "Auto Insurance", "Home Insurance", "Business Insurance"],
  "Mortgage & Financing": ["Mortgage Brokers", "Loan Officers", "Refinancing Services", "Home Equity Loans"],
  "Financial Services & Accounting": ["Financial Planning", "Tax Preparation", "Bookkeeping", "CPA Services"],
  "Construction & Home Services": ["General Contracting", "Plumbing", "Electrical", "HVAC", "Roofing", "Landscaping", "Painting", "Flooring", "Handyman Services"],
  "Medical & Healthcare": ["Primary Care", "Dental", "Physical Therapy", "Mental Health", "Chiropractic"],
  "Technology Services": ["Web Development", "IT Support", "SEO Services", "Digital Marketing"],
  "Automotive Services": ["Auto Repair", "Oil Change", "Auto Detailing", "Collision Repair"],
  "Pet Care": ["Dog Walking", "Pet Grooming", "Pet Sitting", "Veterinary Care"],
  "Cleaning & Maintenance": ["House Cleaning", "Carpet Cleaning", "Window Cleaning", "Pool Cleaning"],
  "Moving & Storage": ["Local Moving", "Long Distance Moving", "Junk Removal", "Storage Units"],
  "Beauty & Personal Care": ["Hair Styling", "Nail Services", "Massage", "Spa Services"]
};

// Helper to create service slug
const getServiceSlug = (service: string): string => {
  return service
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const baseUrl = 'https://digsandgigs.net';
    const now = new Date().toISOString();

    // Get Supabase credentials
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       'https://njpjxasfesdapxukvyth.supabase.co';
    const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                       process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Static pages
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily', lastmod: now },
      { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
      { url: '/how-it-works', priority: '0.9', changefreq: 'monthly' },
      { url: '/browse-gigs', priority: '0.9', changefreq: 'daily' },
      { url: '/browse-diggers', priority: '0.9', changefreq: 'daily' },
      { url: '/post-gig', priority: '0.8', changefreq: 'weekly' },
      { url: '/digger-registration', priority: '0.8', changefreq: 'weekly' },
      { url: '/get-free-quote', priority: '0.8', changefreq: 'weekly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/blog', priority: '0.8', changefreq: 'daily' },
      { url: '/faq', priority: '0.8', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
    ];

    // Try to fetch dynamic content from Supabase if credentials are available
    let blogPosts: any[] = [];
    let gigs: any[] = [];
    let diggers: any[] = [];

    if (supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch published blog posts
        const { data: blogData } = await supabase
          .from('blog_posts')
          .select('slug, updated_at')
          .eq('status', 'published')
          .order('updated_at', { ascending: false })
          .limit(5000);
        blogPosts = blogData || [];

        // Fetch active gigs
        const { data: gigsData } = await supabase
          .from('gigs')
          .select('id, updated_at')
          .eq('status', 'open')
          .order('updated_at', { ascending: false })
          .limit(5000);
        gigs = gigsData || [];

        // Fetch digger profiles
        const { data: diggersData } = await supabase
          .from('digger_profiles')
          .select('id, updated_at')
          .order('updated_at', { ascending: false })
          .limit(5000);
        diggers = diggersData || [];
      } catch (dbError) {
        console.error('Error fetching from database:', dbError);
        // Continue with static sitemap if database fetch fails
      }
    }

    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add static pages
    for (const page of staticPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      xml += `    <lastmod>${page.lastmod || now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    }

    // Add city landing pages
    for (const city of SEO_CITIES) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/contractors-in/${city.slug}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Add service pages
    for (const [industry, specialties] of Object.entries(INDUSTRY_SPECIALTIES)) {
      const serviceSlug = getServiceSlug(industry);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/services/${serviceSlug}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';

      // Add service + city combination pages
      for (const city of SEO_CITIES.slice(0, 50)) { // Limit to top 50 cities for service+city pages
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/services/${serviceSlug}/${city.slug}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
      }
    }

    // Add blog posts
    for (const post of blogPosts) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${post.updated_at || now}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    }

    // Add gigs
    for (const gig of gigs) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/gigs/${gig.id}</loc>\n`;
      xml += `    <lastmod>${gig.updated_at || now}</lastmod>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>0.7</priority>\n';
      xml += '  </url>\n';
    }

    // Add digger profiles
    for (const digger of diggers) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/diggers/${digger.id}</loc>\n`;
      xml += `    <lastmod>${digger.updated_at || now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.6</priority>\n';
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    // Return XML with proper headers
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).setHeader('Content-Type', 'application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?><error>Error generating sitemap</error>'
    );
  }
}
