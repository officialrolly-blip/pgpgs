import { NextResponse } from "next/server";
import { ilike } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";

// Verifies a member ID exists in the database for chat access.
// This is a simpler check than full login - just confirms the member is registered.
export async function POST(request: Request) {
  try {
    const { memberId } = (await request.json()) as {
      memberId?: string;
    };

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required." },
        { status: 400 },
      );
    }

    const normalizedId = memberId.trim().toUpperCase();

    // Look up the member by their display memberId
    const [member] = await db
      .select({
        id: pgpmembers.id,
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        lastName: pgpmembers.lastName,
        status: pgpmembers.status,
        memberChapter: pgpmembers.memberChapter,
        photoUrl: pgpmembers.photoUrl,
        hasPhoto: pgpmembers.hasPhoto,
      })
      .from(pgpmembers)
      .where(ilike(pgpmembers.memberId, normalizedId))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member ID not found. Please check your PGPGS Member ID and try again." },
        { status: 404 },
      );
    }

    // All members can log in regardless of status
    return NextResponse.json({
      ok: true,
      member: {
        id: member.id,
        memberId: member.memberId,
        firstName: member.firstName,
        lastName: member.lastName,
        chapter: member.memberChapter,
        photoUrl: member.photoUrl,
        hasPhoto: member.hasPhoto,
      },
    });
  } catch (error) {
    console.error("Member verification for chat failed", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
