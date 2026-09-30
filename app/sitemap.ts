import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import { getSiteUrl } from "@/lib/seo";

export const revalidate = 3600;

type StaticRoute = {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
};

// Every indexable public page. Member/private flows (/join/status, /member-id,
// /members/*, /verify/*, /admin/*) are intentionally excluded. Placeholder
// pages that still render "coming soon" copy are also excluded, because they
// carry a noindex robots tag until real content is published.
const STATIC_ROUTES: StaticRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/news", changeFrequency: "daily", priority: 0.9 },
  { path: "/join", changeFrequency: "monthly", priority: 0.9 },
  { path: "/alumni", changeFrequency: "monthly", priority: 0.8 },
  { path: "/message-of-chapter-president", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about/history", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about/our-members", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about/pgpgs-across-capiz", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about/pgpgs-across-capiz/register", changeFrequency: "monthly", priority: 0.6 },
  { path: "/officials/capiz-provincial-council", changeFrequency: "monthly", priority: 0.7 },
  { path: "/officials/roxas-city-chapter-officers", changeFrequency: "weekly", priority: 0.8 },
  { path: "/officials/former-chapter-president", changeFrequency: "monthly", priority: 0.6 },
  { path: "/officials/former-chapter-vice-president", changeFrequency: "monthly", priority: 0.6 },
  { path: "/officials/former-grand-knights", changeFrequency: "monthly", priority: 0.6 },
  { path: "/officials/former-master-initiator", changeFrequency: "monthly", priority: 0.6 },
  { path: "/knyte", changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Dynamic news posts — only published ones. If the DB is unreachable at
  // build time, fall back to static routes so /sitemap.xml never 500s.
  try {
    const posts = await db
      .select({
        slug: newsPosts.slug,
        publishedAt: newsPosts.publishedAt,
        createdAt: newsPosts.createdAt,
      })
      .from(newsPosts)
      .where(eq(newsPosts.published, true));

    for (const post of posts) {
      entries.push({
        url: `${siteUrl}/news/${post.slug}`,
        lastModified: post.publishedAt ?? post.createdAt ?? now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("sitemap: failed to load news posts, using static routes only", error);
  }

  return entries;
}
