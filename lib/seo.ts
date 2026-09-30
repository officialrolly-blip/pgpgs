import type { Metadata } from "next";

/**
 * Central SEO configuration and helpers for the PGPGS Roxas City Capiz
 * Chapter website. Everything search engines read (titles, descriptions,
 * canonical URLs, Open Graph, Twitter cards, and JSON-LD structured data) is
 * derived from here so every page can expose its own unique metadata.
 */

export const SITE_NAME = "Pi Gamma Phi Gamma Sigma";
export const SITE_SHORT_NAME = "PGPGS Roxas City";
export const SITE_LOCALE = "en_PH";

export const DEFAULT_TITLE =
  "Pi Gamma Phi Gamma Sigma | Roxas City Capiz Chapter";

export const DEFAULT_DESCRIPTION =
  "Official website of Pi Gamma Phi Gamma Sigma, Roxas City Capiz Chapter: a brotherhood and sisterhood founded on unity, service, leadership, and moral excellence. Discover our history, elected officers, community service, alumni, and membership.";

export const DEFAULT_KEYWORDS = [
  "Pi Gamma Phi Gamma Sigma",
  "Pi Gamma Phi Roxas City Capiz",
  "PGPGS Roxas City",
  "PGPGS Capiz",
  "Pi Gamma Phi Capiz",
  "PGPGS Roxas City Chapter",
  "Pi Gamma Phi Gamma Sigma history",
  "PGPGS officers",
  "PGPGS alumni",
  "PGPGS membership",
  "PGPGS community service",
  "brotherhood and sorority Roxas City",
];

/** Resolves the canonical public URL of the deployment (no trailing slash). */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;
  return "https://pgpgs-capiz.vercel.app";
}

export const OG_IMAGE_PATH = "/og-image.png";

export const DEFAULT_OG_IMAGE = {
  url: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter",
} as const;

type OpenGraphImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

export type PageMetadataOptions = {
  /** Unique, descriptive page title. The root template renders `%s | PGPGS Roxas City`. */
  title?: string;
  description?: string;
  /** Relative path used for the canonical URL and og:url, e.g. "/news". */
  path?: string;
  keywords?: string[];
  /** Absolute or site-relative image for social cards. */
  image?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /** Set to true for thin/placeholder pages that should stay out of the index. */
  noindex?: boolean;
};

function resolveImage(
  image: string | undefined,
  title: string | undefined,
): OpenGraphImage {
  if (!image) return DEFAULT_OG_IMAGE;
  return { url: image, alt: title ?? SITE_NAME };
}

/**
 * Builds a complete, self-contained Metadata object for a public page with a
 * unique title, description, canonical URL, Open Graph and Twitter card data.
 */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  image,
  type = "website",
  publishedTime,
  modifiedTime,
  authors,
  noindex,
}: PageMetadataOptions = {}): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = path ?? "/";
  const url = `${siteUrl}${canonical === "/" ? "" : canonical}`;
  const finalTitle = title ?? DEFAULT_TITLE;
  const finalDescription = description ?? DEFAULT_DESCRIPTION;
  const ogImage = resolveImage(image, title);

  return {
    // Only set `title` when provided; otherwise the root layout's default title
    // is inherited (returning `title: undefined` would suppress it entirely).
    ...(title ? { title } : {}),
    description: finalDescription,
    keywords,
    alternates: { canonical },
    openGraph: {
      type,
      locale: SITE_LOCALE,
      siteName: SITE_SHORT_NAME,
      title: finalTitle,
      description: finalDescription,
      url,
      images: [ogImage],
      ...(type === "article" ? { publishedTime, modifiedTime, authors } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [ogImage.url],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/*  JSON-LD structured data builders                                          */
/* -------------------------------------------------------------------------- */

const ORGANIZATION_NAME = "Pi Gamma Phi Gamma Sigma – Roxas City Capiz Chapter";

export function organizationJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORGANIZATION_NAME,
    alternateName: ["PGPGS Roxas City", "Pi Gamma Phi 1975 Gamma Sigma"],
    url: siteUrl,
    logo: `${siteUrl}/logo2.png`,
    description: DEFAULT_DESCRIPTION,
    foundingDate: "1975",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Roxas City",
      addressRegion: "Capiz",
      addressCountry: "PH",
    },
  };
}

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PGPGS Roxas City Capiz Chapter",
    alternateName: "Pi Gamma Phi Gamma Sigma",
    url: siteUrl,
  };
}

export function articleJsonLd({
  title,
  description,
  path,
  image,
  publishedTime,
  modifiedTime,
  authorName,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
}) {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}${path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: image
      ? [image.startsWith("http") ? image : `${siteUrl}${image}`]
      : undefined,
    datePublished: publishedTime,
    dateModified: modifiedTime ?? publishedTime,
    author: { "@type": "Organization", name: authorName ?? ORGANIZATION_NAME },
    publisher: {
      "@type": "Organization",
      name: ORGANIZATION_NAME,
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo2.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path === "/" ? "" : item.path}`,
    })),
  };
}
