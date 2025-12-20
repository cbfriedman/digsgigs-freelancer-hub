import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Top 50 US cities for SEO
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
  { city: "Austin", state: "TX", slug: "austin" },
  { city: "Jacksonville", state: "FL", slug: "jacksonville" },
  { city: "San Francisco", state: "CA", slug: "san-francisco" },
  { city: "Seattle", state: "WA", slug: "seattle" },
  { city: "Denver", state: "CO", slug: "denver" },
  { city: "Boston", state: "MA", slug: "boston" },
  { city: "Las Vegas", state: "NV", slug: "las-vegas" },
  { city: "Atlanta", state: "GA", slug: "atlanta" },
  { city: "Miami", state: "FL", slug: "miami" },
  { city: "Minneapolis", state: "MN", slug: "minneapolis" },
  { city: "Tampa", state: "FL", slug: "tampa" },
  { city: "Orlando", state: "FL", slug: "orlando" },
  { city: "Portland", state: "OR", slug: "portland" },
  { city: "Detroit", state: "MI", slug: "detroit" },
  { city: "Nashville", state: "TN", slug: "nashville" },
  { city: "Charlotte", state: "NC", slug: "charlotte" },
  { city: "San Jose", state: "CA", slug: "san-jose" },
  { city: "Indianapolis", state: "IN", slug: "indianapolis" },
  { city: "Columbus", state: "OH", slug: "columbus" },
  { city: "Fort Worth", state: "TX", slug: "fort-worth" },
  { city: "Oklahoma City", state: "OK", slug: "oklahoma-city" },
  { city: "Baltimore", state: "MD", slug: "baltimore" },
  { city: "Milwaukee", state: "WI", slug: "milwaukee" },
  { city: "Sacramento", state: "CA", slug: "sacramento" },
  { city: "Kansas City", state: "MO", slug: "kansas-city" },
  { city: "Raleigh", state: "NC", slug: "raleigh" },
  { city: "Cleveland", state: "OH", slug: "cleveland" },
  { city: "Pittsburgh", state: "PA", slug: "pittsburgh" },
  { city: "Cincinnati", state: "OH", slug: "cincinnati" },
  { city: "St. Louis", state: "MO", slug: "st-louis" },
  { city: "New Orleans", state: "LA", slug: "new-orleans" },
  { city: "Salt Lake City", state: "UT", slug: "salt-lake-city" },
  { city: "Birmingham", state: "AL", slug: "birmingham" },
  { city: "Richmond", state: "VA", slug: "richmond" },
  { city: "Memphis", state: "TN", slug: "memphis" },
  { city: "Louisville", state: "KY", slug: "louisville" },
  { city: "Tucson", state: "AZ", slug: "tucson" },
  { city: "Albuquerque", state: "NM", slug: "albuquerque" },
  { city: "Fresno", state: "CA", slug: "fresno" },
  { city: "Mesa", state: "AZ", slug: "mesa" },
  { city: "Omaha", state: "NE", slug: "omaha" }
];

// Helper to create service slug
const getServiceSlug = (service: string): string => {
  return service
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting enhanced sitemap generation...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const baseUrl = 'https://digsandgigs.com';
    const now = new Date().toISOString();

    console.log('Fetching data from database...');

    // Static pages with priority and change frequency
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
      { url: '/faq/plumbing', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/electrical', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/roofing', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/hvac', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/landscaping', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/painting', priority: '0.7', changefreq: 'monthly' },
      { url: '/faq/general', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare', priority: '0.8', changefreq: 'weekly' },
      { url: '/compare/bark', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare/thumbtack', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare/angi', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare/homeadvisor', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare/houzz', priority: '0.7', changefreq: 'monthly' },
      { url: '/compare/yelp', priority: '0.7', changefreq: 'monthly' },
      { url: '/privacy', priority: '0.5', changefreq: 'yearly' },
      { url: '/terms', priority: '0.5', changefreq: 'yearly' },
    ];

    // Fetch published blog posts
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (blogError) {
      console.error('Error fetching blog posts:', blogError);
    } else {
      console.log(`Fetched ${blogPosts?.length || 0} blog posts`);
    }

    // Fetch active gigs
    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, updated_at')
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (gigsError) {
      console.error('Error fetching gigs:', gigsError);
    } else {
      console.log(`Fetched ${gigs?.length || 0} gigs`);
    }

    // Fetch digger profiles
    const { data: diggers, error: diggersError } = await supabase
      .from('digger_profiles')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5000);

    if (diggersError) {
      console.error('Error fetching diggers:', diggersError);
    } else {
      console.log(`Fetched ${diggers?.length || 0} diggers`);
    }

    console.log('Building XML sitemap...');

    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ';
    xml += 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ';
    xml += 'xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';

    // Add static pages
    staticPages.forEach(page => {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
      if (page.lastmod) {
        xml += `    <lastmod>${page.lastmod}</lastmod>\n`;
      }
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    // Add programmatic service index pages
    const allServices: string[] = [];
    for (const [industry, specialties] of Object.entries(INDUSTRY_SPECIALTIES)) {
      for (const specialty of specialties) {
        allServices.push(specialty);
      }
    }

    // Service index pages (e.g., /services/plumbing)
    for (const service of allServices) {
      const serviceSlug = getServiceSlug(service);
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/services/${serviceSlug}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }

    // Service + City pages (e.g., /services/plumbing/chicago)
    for (const service of allServices) {
      const serviceSlug = getServiceSlug(service);
      for (const city of SEO_CITIES) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/services/${serviceSlug}/${city.slug}</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      }
    }

    // Add blog posts
    if (blogPosts && blogPosts.length > 0) {
      blogPosts.forEach(post => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
        xml += `    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';
      });
    }

    // Add gigs (limited to prevent huge sitemaps)
    if (gigs && gigs.length > 0) {
      gigs.slice(0, 1000).forEach(gig => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/gig/${gig.id}</loc>\n`;
        xml += `    <lastmod>${new Date(gig.updated_at).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>daily</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
      });
    }

    // Add digger profiles (limited to prevent huge sitemaps)
    if (diggers && diggers.length > 0) {
      diggers.slice(0, 1000).forEach(digger => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/digger/${digger.id}</loc>\n`;
        xml += `    <lastmod>${new Date(digger.updated_at).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
      });
    }

    xml += '</urlset>';

    // Calculate stats
    const servicePageCount = allServices.length;
    const locationPageCount = allServices.length * SEO_CITIES.length;
    const totalUrls = staticPages.length + servicePageCount + locationPageCount + 
      (blogPosts?.length || 0) + Math.min(gigs?.length || 0, 1000) + Math.min(diggers?.length || 0, 1000);

    console.log(`Sitemap generated with ${totalUrls} URLs`);
    console.log(`- Static pages: ${staticPages.length}`);
    console.log(`- Service index pages: ${servicePageCount}`);
    console.log(`- Service+Location pages: ${locationPageCount}`);
    console.log(`- Blog posts: ${blogPosts?.length || 0}`);
    console.log(`- Gigs: ${Math.min(gigs?.length || 0, 1000)}`);
    console.log(`- Digger profiles: ${Math.min(diggers?.length || 0, 1000)}`);

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
