import type { Metadata } from "next";
import Link from "next/link";
import PageHeading from "@/components/admin/page-heading";
import NewsForm from "@/components/admin/news-form";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "New Post" };

export default async function NewNewsPostPage() {
  await requireAdmin();

  return (
    <>
      <PageHeading
        title="New post"
        description="Create a news story, announcement, or event update for the public site."
      />
      <NewsForm post={null} />
      <p className="mt-4 text-sm text-a-muted">
        <Link href="/admin/news" className="font-semibold text-a-brand hover:text-a-brand-dark">
          ← Back to News &amp; Events
        </Link>
      </p>
    </>
  );
}