import { NextResponse } from "next/server";
import { and, asc, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { chapterMatches } from "@/lib/chapters";
import { asOfficer } from "@/lib/officer-access";
import { scopeChapterFor } from "@/lib/officer-permissions";

export const runtime = "nodejs";

// Member type-ahead used by admin forms that need to link an account to a real
// member record (e.g. creating an officer account, which needs the member's
// chapter). Requires an active admin session — unlike the public
// /api/pgpmembers/search endpoint — because the chapter and contact email are
// admin-only directory data.
//
// Chapter scoping: chapter_secretary / chapter_treasurer are pinned to their
// assigned chapter, so the suggestions (and the chapter + email fields they
// carry) never include members from other chapters.
export async function GET(request: Request) {
  const admin = await getSessionUser();
  if (!admin) {
    return NextResponse.json(
      { error: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ members: [] });
    }

    const pattern = `%${query}%`;
    const search = or(
      ilike(pgpmembers.firstName, pattern),
      ilike(pgpmembers.lastName, pattern),
      ilike(pgpmembers.memberId, pattern),
    );
    const conditions: SQL[] = search ? [search] : [];
    const chapterCondition = chapterMatches(
      pgpmembers.memberChapter,
      scopeChapterFor(asOfficer(admin)),
    );
    if (chapterCondition) conditions.push(chapterCondition);

    const members = await db
      .select({
        id: pgpmembers.id,
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        lastName: pgpmembers.lastName,
        middleInitial: pgpmembers.middleInitial,
        status: pgpmembers.status,
        // Aliased to `chapter` so the payload matches `MemberOption` in
        // components/admin/member-combobox.tsx.
        chapter: pgpmembers.memberChapter,
        email: pgpmembers.email,
      })
      .from(pgpmembers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(pgpmembers.lastName), asc(pgpmembers.firstName))
      .limit(8);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Admin member search failed", error);
    return NextResponse.json(
      { error: "Member search is unavailable right now." },
      { status: 500 },
    );
  }
}