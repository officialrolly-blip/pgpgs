import { NextResponse } from "next/server";
import { and, asc, ilike, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";

// Public name search for the member digital-ID portal.
// Returns only identification fields. Excludes Neophytes.
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ members: [] });
    }

    const pattern = `%${query}%`;
    const members = await db
      .select({
        id: pgpmembers.id,
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        lastName: pgpmembers.lastName,
        middleInitial: pgpmembers.middleInitial,
      })
      .from(pgpmembers)
      .where(
        and(
          or(
            ilike(pgpmembers.firstName, pattern),
            ilike(pgpmembers.lastName, pattern),
            ilike(pgpmembers.memberId, pattern),
          ),
          ne(pgpmembers.status, "Neophyte"),
        ),
      )
      .orderBy(asc(pgpmembers.lastName), asc(pgpmembers.firstName))
      .limit(10);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Member digital-ID search failed", error);
    return NextResponse.json(
      { error: "Search is unavailable right now." },
      { status: 500 },
    );
  }
}
