import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import {
  deleteNewsPostAction,
  publishNewsPostAction,
  unpublishNewsPostAction,
} from "@/lib/actions/news-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "News & Events" };

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AdminNewsPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      category: newsPosts.category,
      published: newsPosts.published,
      publishedAt: newsPosts.publishedAt,
      createdAt: newsPosts.createdAt,
      updatedAt: newsPosts.updatedAt,
    })
    .from(newsPosts)
    .orderBy(desc(newsPosts.createdAt));

  const publishedCount = rows.filter((row) => row.published).length;

  return (
    <>
      <PageHeading
        title="News & Events"
        description={`${rows.length} post${rows.length === 1 ? "" : "s"} · ${publishedCount} published on the public site.`}
        actions={
          <Link href="/admin/news/new" className="a-btn a-btn-primary">
            + New post
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="a-card flex flex-col items-start gap-4 p-8">
          <p className="text-sm leading-6 text-a-muted">
            No posts yet. Create your first story, announcement, or event update — it will
            appear in the &quot;News &amp; events&quot; section of the homepage once published.
          </p>
          <Link href="/admin/news/new" className="a-btn a-btn-primary">
            + Create the first post
          </Link>
        </div>
      ) : (
        <div className="a-card overflow-x-auto">
          <table className="a-table w-full min-w-[640px]">
            <thead>
              <tr>
                <th className="a-th">Post</th>
                <th className="a-th">Category</th>
                <th className="a-th">Created</th>
                <th className="a-th">Status</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="a-td">
                    <Link href={`/admin/news/${row.id}`} className="block max-w-xs truncate font-semibold text-a-text transition hover:text-a-brand">
                      {row.title}
                    </Link>
                    <span className="block truncate text-xs text-a-muted">/{row.slug}</span>
                  </td>
                  <td className="a-td text-a-muted">{row.category}</td>
                  <td className="a-td text-a-muted">
                    <time dateTime={row.createdAt.toISOString()}>{formatDate(row.createdAt)}</time>
                  </td>
                  <td className="a-td">
                    <span className={`a-badge ${row.published ? "a-badge-green" : "a-badge-amber"}`}>
                      {row.published ? "Published" : "Draft"}
                    </span>
                    {row.published && row.publishedAt ? (
                      <p className="mt-1 text-[11px] text-a-muted">on {formatDate(row.publishedAt)}</p>
                    ) : null}
                  </td>
                  <td className="a-td">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {row.published ? (
                        <form action={unpublishNewsPostAction}>
                          <input type="hidden" name="postId" value={row.id} />
                          <button type="submit" className="a-btn a-btn-secondary a-btn-sm">
                            Unpublish
                          </button>
                        </form>
                      ) : (
                        <form action={publishNewsPostAction}>
                          <input type="hidden" name="postId" value={row.id} />
                          <button type="submit" className="a-btn a-btn-primary a-btn-sm">
                            Publish
                          </button>
                        </form>
                      )}
                      <Link href={`/admin/news/${row.id}`} className="a-btn a-btn-secondary a-btn-sm">
                        Edit
                      </Link>
                      <Link href={`/news/${row.slug}`} target="_blank" rel="noreferrer" className="a-btn a-btn-secondary a-btn-sm">
                        View ↗
                      </Link>
                      <form action={deleteNewsPostAction}>
                        <input type="hidden" name="postId" value={row.id} />
                        <ConfirmSubmitButton
                          message={`Delete "${row.title}"? This cannot be undone.`}
                          className="a-btn a-btn-danger a-btn-sm"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}