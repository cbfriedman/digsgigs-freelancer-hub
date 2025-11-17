import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting sitemap generation...');
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL from request or use default
    const url = new URL(req.url);
    const baseUrl = `${url.protocol}//${url.host}`;

    console.log('Fetching data from database...');

    // Static pages with priority and change frequency
    const staticPages = [
      { url: '', priority: '1.0', changefreq: 'daily', lastmod: new Date().toISOString() },
      { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
      { url: '/how-it-works', priority: '0.9', changefreq: 'monthly' },
      { url: '/browse-gigs', priority: '0.9', changefreq: 'daily' },
      { url: '/browse-diggers', priority: '0.9', changefreq: 'daily' },
      { url: '/post-gig', priority: '0.8', changefreq: 'weekly' },
      { url: '/digger-registration', priority: '0.8', changefreq: 'weekly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/blog', priority: '0.8', changefreq: 'daily' },
      { url: '/faq', priority: '0.6', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
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

    // Fetch digger profiles (active subscriptions or recent activity)
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

    // Add gigs
    if (gigs && gigs.length > 0) {
      gigs.forEach(gig => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/gig/${gig.id}</loc>\n`;
        xml += `    <lastmod>${new Date(gig.updated_at).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
      });
    }

    // Add digger profiles
    if (diggers && diggers.length > 0) {
      diggers.forEach(digger => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/digger/${digger.id}</loc>\n`;
        xml += `    <lastmod>${new Date(digger.updated_at).toISOString()}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.6</priority>\n';
        xml += '  </url>\n';
      });
    }

    xml += '</urlset>';

    console.log('Sitemap generated successfully');

    // Return XML with proper content type
    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
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
