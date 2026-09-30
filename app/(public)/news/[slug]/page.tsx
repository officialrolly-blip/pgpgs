import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import PageShell from "@/components/page-shell";
import JsonLd from "@/components/json-ld";
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Cache each article for five minutes so Googlebot always receives fully
// server-rendered HTML (title, H1, body, images, structured data) instead of a
// JavaScript "Loading…" state. Publishing invalidates this via revalidatePath.
export const revalidate = 300;

// Wrapped in React `cache` so generateMetadata and the page share one query.
const getPost = cache(async (slug: string) => {
  const [post] = await db
    .select({
      title: newsPosts.title,
      category: newsPosts.category,
      summary: newsPosts.summary,
      body: newsPosts.body,
      coverImageUrl: newsPosts.coverImageUrl,
      authorName: newsPosts.authorName,
      publishedAt: newsPosts.publishedAt,
      createdAt: newsPosts.createdAt,
      published: newsPosts.published,
    })
    .from(newsPosts)
    .where(eq(newsPosts.slug, slug))
    .limit(1);

  return post ?? null;
});

function metaDescription(post: { summary: string; body: string }): string {
  const base = post.summary?.trim() || post.body;
  const collapsed = base.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 155) return collapsed;
  return `${collapsed.slice(0, 152).replace(/\s+\S*$/, "")}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) {
    return {
      title: "Article not found",
      robots: { index: false, follow: true },
    };
  }

  const publishedIso = (post.publishedAt ?? post.createdAt).toISOString();

  return pageMetadata({
    title: post.title,
    description: metaDescription(post),
    path: `/news/${slug}`,
    type: "article",
    image: post.coverImageUrl ?? undefined,
    publishedTime: publishedIso,
    modifiedTime: post.createdAt.toISOString(),
    authors: post.authorName ? [post.authorName] : undefined,
  });
}


function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) notFound();

  const paragraphs = post.body
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean);
  const dateLabel = formatLongDate(post.publishedAt ?? post.createdAt);

  return (
    <PageShell title={post.title}>
      <JsonLd
        data={[
          articleJsonLd({
            title: post.title,
            description: post.summary,
            path: `/news/${slug}`,
            image: post.coverImageUrl ?? undefined,
            publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
            modifiedTime: post.createdAt.toISOString(),
            authorName: post.authorName ?? undefined,
          }),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "News & Events", path: "/news" },
            { name: post.title, path: `/news/${slug}` },
          ]),
        ]}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em] text-black/45">
        <span className="text-[var(--green)]">{post.category}</span>
        <span aria-hidden="true" className="text-black/20">
          •
        </span>
        <time dateTime={(post.publishedAt ?? post.createdAt).toISOString()}>{dateLabel}</time>
        {post.authorName ? (
          <>
            <span aria-hidden="true" className="text-black/20">
              •
            </span>
            <span>By {post.authorName}</span>
          </>
        ) : null}
      </div>

      {post.coverImageUrl ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden border border-black/10 bg-black/5">
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 896px) 100vw, 896px"
            className="object-cover"
          />
        </div>
      ) : null}

      <p className="mt-6 max-w-2xl text-lg leading-8 font-medium text-[var(--green-dark)] text-justify">
        {post.summary}
      </p>

      <div className="mt-6 space-y-5">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="max-w-2xl text-base leading-8 text-black/70 text-justify">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-10 border-t border-black/10 pt-6">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--green)] transition hover:text-[var(--green-dark)]"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ←
          </span>
          Back to News &amp; Events
        </Link>
      </div>
    </PageShell>
  );
}