import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — a single published news post by slug. Public (no auth).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [post] = await db
      .select({
        id: newsPosts.id,
        title: newsPosts.title,
        slug: newsPosts.slug,
        category: newsPosts.category,
        summary: newsPosts.summary,
        body: newsPosts.body,
        coverImageUrl: newsPosts.coverImageUrl,
        authorName: newsPosts.authorName,
        publishedAt: newsPosts.publishedAt,
      })
      .from(newsPosts)
      .where(and(eq(newsPosts.slug, slug), eq(newsPosts.published, true)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "News post not found." }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("API v1 news post failed", error);
    return NextResponse.json(
      { error: "Unable to load the news post right now." },
      { status: 500 },
    );
  }
}