import React from "react";
import { Helmet } from "react-helmet-async";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "video.movie" | "video.episode" | "video.tv_show";
  schema?: Record<string, any>;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image = "https://donghuastream.vercel.app/og-image.png",
  url,
  type = "website",
  schema,
}) => {
  const { site_name: siteName } = useSiteSettings();
  const defaultTitle = `${siteName} - Watch Chinese Anime Online`;
  const defaultDescription =
    "Stream thousands of premium Chinese anime (donghua) series in high definition. Access subbed releases with cultivation details, lore, and characters.";

  const siteUrl = url || window.location.href;
  const pageTitle = title ? `${title} | ${siteName}` : defaultTitle;
  const pageDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={siteUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@donghuastream" />

      {/* Schema.org JSON-LD Injections */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
