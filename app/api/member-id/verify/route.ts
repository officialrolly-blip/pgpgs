import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { memberCredentials, pgpmembers } from "@/db/schema";
import { hashPassword } from "@/lib/member-auth";

export const runtime = "nodejs";

// Normalizes a free-form date string to YYYY-MM-DD.
// Accepts: "YYYY-MM-DD", "MM/DD/YYYY", "Month Day, Year", "Month Day Year",
// ISO timestamps, and other formats the JS Date parser understands.
// Returns null when the value cannot be parsed into a real date.
function normalizeDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  // Already ISO-like (YYYY-MM-DD) — validate it directly.
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Fallback: let the Date parser interpret the string, then validate.
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
}

// Verifies a member's date of survive and, on success, creates their
// digital-ID login credentials (username = memberId, password = memberId).
export async function POST(request: Request) {
  try {
    const { memberId, dateSurvived } = (await request.json()) as {
      memberId?: string;
      dateSurvived?: string;
    };

    if (!memberId || !dateSurvived) {
      return NextResponse.json(
        { error: "Member ID and Date of Survive are required." },
        { status: 400 },
      );
    }

    // Look up the member by their primary key (id), not the display memberId.
    const [member] = await db
      .select()
      .from(pgpmembers)
      .where(eq(pgpmembers.id, memberId.trim()))
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Member not found." },
        { status: 404 },
      );
    }

    // Compare dates after normalizing both sides to YYYY-MM-DD.
    const stored = normalizeDate(member.dateSurvived);
    const provided = normalizeDate(dateSurvived);

    if (!stored || !provided || stored !== provided) {
      return NextResponse.json(
        { error: "Date of Survive does not match our records." },
        { status: 401 },
      );
    }

    // Check if credentials already exist — if so, just return them.
    const [existing] = await db
      .select({ id: memberCredentials.id })
      .from(memberCredentials)
      .where(eq(memberCredentials.memberPk, member.id))
      .limit(1);

    const normalizedMemberId = member.memberId.trim().toUpperCase();

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        memberId: normalizedMemberId,
        message: "Account already exists. Use your Member ID as both username and password to log in.",
      });
    }

    // Create credentials: username = memberId, password = memberId (both uppercase for case-insensitive login).
    const passwordHash = await hashPassword(normalizedMemberId);
    await db.insert(memberCredentials).values({
      memberPk: member.id,
      memberId: normalizedMemberId,
      passwordHash,
    });

    return NextResponse.json({
      ok: true,
      alreadyExists: false,
      memberId: normalizedMemberId,
      message: "Your digital-ID account has been created! Use your PGPGS Member ID as both username and password to log in.",
    });
  } catch (error) {
    console.error("Member verify failed", error);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 },
    );
  }
}
