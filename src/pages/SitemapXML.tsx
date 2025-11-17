import { useEffect } from "react";

/**
 * Dynamic XML Sitemap
 * Redirects to the edge function that generates the sitemap
 * Access at: /sitemap.xml
 */
const SitemapXML = () => {
  useEffect(() => {
    // Redirect to the edge function
    const sitemapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-sitemap`;
    window.location.href = sitemapUrl;
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <p>Generating sitemap...</p>
    </div>
  );
};

export default SitemapXML;
