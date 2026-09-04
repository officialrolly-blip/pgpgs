import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = { title: "News & Events" };
export const dynamic = "force-dynamic";

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function NewsIndexPage() {
  const posts = await db
    .select({
      title: newsPosts.title,
      slug: newsPosts.slug,
      category: newsPosts.category,
      summary: newsPosts.summary,
      coverImageUrl: newsPosts.coverImageUrl,
      authorName: newsPosts.authorName,
      publishedAt: newsPosts.publishedAt,
      createdAt: newsPosts.createdAt,
    })
    .from(newsPosts)
    .where(eq(newsPosts.published, true))
    .orderBy(desc(newsPosts.publishedAt));

  return (
    <PageShell title="News & Events">
      <p className="mb-10 max-w-2xl text-base leading-7 text-justify">
        Keep up with the stories, service, and fellowship shaping the Pi Gamma Phi
        Gamma Sigma Roxas City Capiz Chapter.
      </p>

      {posts.length === 0 ? (
        <p className="border border-black/10 bg-white px-6 py-8 text-sm text-black/60">
          No news has been published yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/news/${post.slug}`}
              className="group flex flex-col overflow-hidden border border-black/10 bg-white transition hover:border-[var(--green)]/40 hover:shadow-[0_10px_30px_rgba(15,61,38,0.08)]"
            >
              {post.coverImageUrl ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-black/5">
                  <Image
                    src={post.coverImageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 42vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] w-full items-center justify-center bg-[var(--green-soft)]">
                  <span className="font-serif text-3xl font-semibold text-[var(--green)]/25">
                    PGPGS
                  </span>
                </div>
              )}
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.16em]">
                  <span className="text-[var(--green)]">{post.category}</span>
                  <span className="text-black/40">
                    {formatShortDate(post.publishedAt ?? post.createdAt)}
                  </span>
                </div>
                <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug text-[var(--green-dark)] transition group-hover:text-[var(--green)]">
                  {post.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-black/60 text-justify">{post.summary}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[var(--green)]">
                  Read the story
                  <span aria-hidden="true" className="text-lg leading-none transition group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}