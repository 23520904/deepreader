import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://deepreader.nniisworking1606.id.vn";

export const siteName = "DeepReader";
export const defaultSeoKeywords = [
  "DeepReader",
  "AI document reader",
  "PDF summarizer",
  "AI flashcards",
  "study assistant",
  "AI reading assistant",
  "document summarizer",
  "student productivity",
];

const defaultDescription =
  "DeepReader is an AI document reader, PDF summarizer, AI flashcards generator, and study assistant for learning from long documents faster.";

export function createPageMetadata({
  title,
  description = defaultDescription,
  path = "/",
  keywords = [],
}: {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
}): Metadata {
  const canonical = `${siteUrl}${path}`;
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const mergedKeywords = Array.from(new Set([...defaultSeoKeywords, ...keywords]));

  return {
    title: fullTitle,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName,
      type: "website",
      images: [
        {
          url: "/assets/images/brand/deepreader-favicon.png",
          width: 512,
          height: 512,
          alt: "DeepReader AI document reader",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/assets/images/brand/deepreader-favicon.png"],
    },
  };
}

export const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: defaultDescription,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/help-center?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
    logo: `${siteUrl}/assets/images/brand/deepreader-favicon.png`,
    sameAs: [siteUrl],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description: defaultDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "AI document reader",
      "PDF summarizer",
      "AI flashcards",
      "Study assistant",
      "Source-based document question answering",
    ],
  },
];
