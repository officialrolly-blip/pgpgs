import { NextResponse } from "next/server";
import { asc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";

// Member type-ahead search used by public forms (e.g. chapter registration).
// Returns only identification fields — never contact details.
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
        status: pgpmembers.status,
      })
      .from(pgpmembers)
      .where(
        or(
          ilike(pgpmembers.firstName, pattern),
          ilike(pgpmembers.lastName, pattern),
          ilike(pgpmembers.memberId, pattern),
        ),
      )
      .orderBy(asc(pgpmembers.lastName), asc(pgpmembers.firstName))
      .limit(8);

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Member search failed", error);
    return NextResponse.json(
      { error: "Member search is unavailable right now." },
      { status: 500 },
    );
  }
}