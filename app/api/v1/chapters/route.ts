import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — published chapters. Public (no auth). Same data the website's
// /api/chapters endpoint serves, frozen as the stable v1 contract.
export async function GET() {
  try {
    const rows = await db
      .select({
        id: chapters.id,
        name: chapters.chapterName,
        address: chapters.chapterAddress,
        organizer: chapters.chapterOrganizer,
        logoUrl: chapters.logoUrl,
      })
      .from(chapters)
      .where(eq(chapters.status, "published"))
      .orderBy(asc(chapters.chapterName));

    return NextResponse.json({ chapters: rows });
  } catch (error) {
    console.error("API v1 chapter list failed", error);
    return NextResponse.json(
      { error: "Unable to load chapters right now." },
      { status: 500 },
    );
  }
}