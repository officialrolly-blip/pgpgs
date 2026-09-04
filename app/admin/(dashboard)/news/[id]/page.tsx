import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import NewsForm, { type NewsFormPost } from "@/components/admin/news-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Edit Post" };

export default async function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [row] = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      category: newsPosts.category,
      summary: newsPosts.summary,
      body: newsPosts.body,
      coverImageUrl: newsPosts.coverImageUrl,
      authorName: newsPosts.authorName,
      published: newsPosts.published,
    })
    .from(newsPosts)
    .where(eq(newsPosts.id, id))
    .limit(1);

  if (!row) notFound();

  const post: NewsFormPost = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    summary: row.summary,
    body: row.body,
    coverImageUrl: row.coverImageUrl,
    authorName: row.authorName,
    published: row.published,
  };

  return (
    <>
      <PageHeading
        title="Edit post"
        description={row.title}
        actions={
          <span className={`a-badge ${row.published ? "a-badge-green" : "a-badge-amber"}`}>
            {row.published ? "Published" : "Draft"}
          </span>
        }
      />
      <NewsForm post={post} />
      <p className="mt-4 text-sm text-a-muted">
        <Link href="/admin/news" className="font-semibold text-a-brand hover:text-a-brand-dark">
          ← Back to News &amp; Events
        </Link>
      </p>
    </>
  );
}