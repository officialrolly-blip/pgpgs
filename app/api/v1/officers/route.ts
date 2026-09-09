import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — current Roxas City chapter officers. Public (no auth).
// Uses the same filter as the Knyte chatbot's officer answers
// (status = "PGP-GS Roxas City Chapter Officer").
export async function GET() {
  try {
    const rows = await db
      .select({
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        middleInitial: pgpmembers.middleInitial,
        lastName: pgpmembers.lastName,
        position: pgpmembers.officerPosition,
        chapter: pgpmembers.memberChapter,
        photoUrl: pgpmembers.photoUrl,
        hasPhoto: pgpmembers.hasPhoto,
        officerDateElected: pgpmembers.officerDateElected,
      })
      .from(pgpmembers)
      .where(eq(pgpmembers.status, "PGP-GS Roxas City Chapter Officer"))
      .orderBy(asc(pgpmembers.createdAt))
      .limit(20);

    const officers = rows.map((row) => ({
      memberId: row.memberId,
      fullName: [row.firstName, row.middleInitial, row.lastName]
        .filter(Boolean)
        .join(" "),
      position: row.position ?? "Officer",
      chapter: row.chapter,
      photoUrl: row.photoUrl,
      hasPhoto: row.hasPhoto,
      officerDateElected: row.officerDateElected,
    }));

    return NextResponse.json({ officers });
  } catch (error) {
    console.error("API v1 officers list failed", error);
    return NextResponse.json(
      { error: "Unable to load officers right now." },
      { status: 500 },
    );
  }
}