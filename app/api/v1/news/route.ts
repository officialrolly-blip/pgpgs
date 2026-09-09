import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsPosts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// REST API v1 — published news posts, newest first. Public (no auth).
// Query params: ?limit=1..50 (default 10), ?offset=0.. for paging.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
      : DEFAULT_LIMIT;

    const parsedOffset = Number.parseInt(url.searchParams.get("offset") ?? "", 10);
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    const posts = await db
      .select({
        id: newsPosts.id,
        title: newsPosts.title,
        slug: newsPosts.slug,
        category: newsPosts.category,
        summary: newsPosts.summary,
        coverImageUrl: newsPosts.coverImageUrl,
        authorName: newsPosts.authorName,
        publishedAt: newsPosts.publishedAt,
      })
      .from(newsPosts)
      .where(eq(newsPosts.published, true))
      .orderBy(desc(newsPosts.publishedAt), desc(newsPosts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ posts, limit, offset });
  } catch (error) {
    console.error("API v1 news list failed", error);
    return NextResponse.json(
      { error: "Unable to load news right now." },
      { status: 500 },
    );
  }
}