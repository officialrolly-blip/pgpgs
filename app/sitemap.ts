import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const routes = [
    "/",
    "/about/history",
    "/about/founding",
    "/about/founding-fathers",
    "/alumni",
    "/join",
    "/message-of-chapter-president",
    "/community/blood-letting",
    "/community/clean-up-drives",
    "/community/feeding-program",
    "/community/tree-planting",
    "/officials/capiz-provincial-council",
    "/officials/former-chapter-president",
    "/officials/former-grand-knights",
    "/officials/former-master-initiator",
    "/officials/roxas-city-chapter-officers",
  ];

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}