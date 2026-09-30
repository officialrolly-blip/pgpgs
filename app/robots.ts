import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (vercelUrl) return `https://${vercelUrl}`;
  return "https://pgpgsroxascity.com";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/api/", "/join/status", "/member-id", "/members/", "/verify/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}