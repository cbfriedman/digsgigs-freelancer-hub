import { useEffect, useState } from "react";

/**
 * Dynamic XML Sitemap
 * Fetches XML from edge function and displays it as plain text
 * Access at: /sitemap.xml
 */
const SitemapXML = () => {
  const [xmlContent, setXmlContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`;
        const response = await fetch(sitemapUrl);
        
        if (response.ok) {
          const xml = await response.text();
          setXmlContent(xml);
          
          // Set content type via meta tag (for browsers)
          const meta = document.createElement('meta');
          meta.httpEquiv = 'Content-Type';
          meta.content = 'application/xml; charset=utf-8';
          document.head.appendChild(meta);
        } else {
          console.error('Failed to fetch sitemap:', response.status);
          setXmlContent('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
        }
      } catch (error) {
        console.error('Error fetching sitemap:', error);
        setXmlContent('<?xml version="1.0" encoding="UTF-8"?><error>Error generating sitemap</error>');
      } finally {
        setLoading(false);
      }
    };

    fetchSitemap();
  }, []);

  // Return XML as plain text (not HTML)
  if (loading) {
    return (
      <pre style={{ padding: '20px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        {`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>Loading sitemap...</loc>
  </url>
</urlset>`}
      </pre>
    );
  }

  return (
    <pre style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      whiteSpace: 'pre-wrap',
      margin: 0,
      fontSize: '12px'
    }}>
      {xmlContent}
    </pre>
  );
};

export default SitemapXML;
