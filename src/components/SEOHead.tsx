import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  keywords?: string;
  noindex?: boolean;
  structuredData?: object;
}

export default function SEOHead({
  title,
  description,
  canonical,
  ogImage = "/og-image.jpg",
  ogType = "website",
  keywords,
  noindex = false,
  structuredData,
}: SEOHeadProps) {
  const fullTitle = `${title} | digsandgigs`;
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://digsandgigs.com";
  const fullCanonical = canonical || (typeof window !== "undefined" ? window.location.href : siteUrl);
  const fullOgImage = ogImage.startsWith("http") ? ogImage : `${siteUrl}${ogImage}`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonical} />
      
      {/* Robots */}
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullCanonical} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullOgImage} />
      <meta property="og:site_name" content="digsandgigs" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullCanonical} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullOgImage} />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
