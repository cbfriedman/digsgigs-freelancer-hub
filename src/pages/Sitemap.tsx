import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Sitemap = () => {
  const [, setSitemapGenerated] = useState(false);

  useEffect(() => {
    const generateSitemap = async () => {
      try {
        const baseUrl = window.location.origin;
        
        // Static pages with priority and change frequency
        const staticPages = [
          { url: '', priority: '1.0', changefreq: 'daily' }, // homepage
          { url: '/pricing', priority: '0.9', changefreq: 'weekly' },
          { url: '/how-it-works', priority: '0.9', changefreq: 'monthly' },
          { url: '/browse-gigs', priority: '0.9', changefreq: 'daily' },
          { url: '/browse-diggers', priority: '0.9', changefreq: 'daily' },
          { url: '/post-gig', priority: '0.8', changefreq: 'weekly' },
          { url: '/digger-registration', priority: '0.8', changefreq: 'weekly' },
          { url: '/contact', priority: '0.7', changefreq: 'monthly' },
          { url: '/blog', priority: '0.8', changefreq: 'daily' },
          { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
          { url: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
        ];

        // Fetch published blog posts
        const { data: blogPosts } = await supabase
          .from('blog_posts')
          .select('slug, updated_at')
          .eq('status', 'published')
          .order('updated_at', { ascending: false });

        // Fetch active gigs
        const { data: gigs } = await supabase
          .from('gigs')
          .select('id, updated_at')
          .eq('status', 'open')
          .order('updated_at', { ascending: false })
          .limit(1000);

        // Fetch digger profiles
        const { data: diggers } = await supabase
          .from('digger_profiles')
          .select('id, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1000);

        // Build XML sitemap
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // Add static pages
        staticPages.forEach(page => {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
          xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
          xml += `    <priority>${page.priority}</priority>\n`;
          xml += '  </url>\n';
        });

        // Add blog posts
        blogPosts?.forEach(post => {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
          xml += `    <lastmod>${new Date(post.updated_at).toISOString()}</lastmod>\n`;
          xml += '    <changefreq>weekly</changefreq>\n';
          xml += '    <priority>0.7</priority>\n';
          xml += '  </url>\n';
        });

        // Add gigs
        gigs?.forEach(gig => {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}/gig/${gig.id}</loc>\n`;
          xml += `    <lastmod>${new Date(gig.updated_at).toISOString()}</lastmod>\n`;
          xml += '    <changefreq>weekly</changefreq>\n';
          xml += '    <priority>0.6</priority>\n';
          xml += '  </url>\n';
        });

        // Add digger profiles
        diggers?.forEach(digger => {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}/digger/${digger.id}</loc>\n`;
          xml += `    <lastmod>${new Date(digger.updated_at).toISOString()}</lastmod>\n`;
          xml += '    <changefreq>weekly</changefreq>\n';
          xml += '    <priority>0.6</priority>\n';
          xml += '  </url>\n';
        });

        xml += '</urlset>';

        // Set response headers and content
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        // Download the sitemap
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSitemapGenerated(true);
      } catch (error) {
        console.error('Error generating sitemap:', error);
      }
    };

    generateSitemap();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Generating Sitemap...</h1>
        <p className="text-muted-foreground">
          Your sitemap.xml file will download automatically.
        </p>
      </div>
    </div>
  );
};

export default Sitemap;
