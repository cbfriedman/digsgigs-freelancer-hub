import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Get Supabase URL from environment variable (Vercel uses VITE_ prefix)
    // Fallback to the known Supabase URL if env var is not set
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 
                       process.env.NEXT_PUBLIC_SUPABASE_URL ||
                       'https://njpjxasfesdapxukvyth.supabase.co';

    // Fetch sitemap from Supabase edge function
    const sitemapUrl = `${supabaseUrl}/functions/v1/generate-sitemap`;
    const response = await fetch(sitemapUrl, {
      headers: {
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      return res.status(response.status).setHeader('Content-Type', 'application/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><error>Failed to fetch sitemap: ${response.status}</error>`
      );
    }

    const xml = await response.text();

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
