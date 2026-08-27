import { NextResponse } from "next/server";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const runtime = "nodejs";

const MEMBER_STATUSES = [
  "Member",
  "Alumni",
  "PGP-GS Roxas City Chapter Officer",
  "Former Chapter President",
  "Grand Knights",
] as const;
type MemberStatus = (typeof MEMBER_STATUSES)[number];

interface PgpMemberBody {
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  age?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  email?: string;
  contactNumber?: string;
  guardianName?: string;
  guardianAddress?: string;
  guardianContact?: string;
  baptizedName?: string;
  dateSurvived?: string;
  status?: string;
  officerPosition?: string;
  officerDateElected?: string;
  formerPresidentStart?: string;
  formerPresidentEnd?: string;
  grandKnight?: string;
  photoUrl?: string;
  hasPhoto?: boolean;
}

const requiredFields = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "age",
  "placeOfBirth",
  "street",
  "barangay",
  "municipality",
  "province",
  "email",
  "contactNumber",
  "guardianName",
  "guardianAddress",
  "guardianContact",
  "baptizedName",
  "dateSurvived",
  "status",
] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Membership id: pgpgs-<year from dateSurvived>-<sequence> e.g. pgpgs-2024-0001
function buildMemberId(dateSurvived: string, sequence: number): string {
  const yearMatch = dateSurvived.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : String(new Date().getFullYear());
  return `pgpgs-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PgpMemberBody;

    const missingField = requiredFields.find((field) => !isNonEmptyString(body[field]));
    if (missingField) {
      return NextResponse.json({ error: `Missing required field: ${missingField}` }, { status: 400 });
    }

    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 1 || age > 130) {
      return NextResponse.json({ error: "Please enter a valid age." }, { status: 400 });
    }

    if (!MEMBER_STATUSES.includes(body.status as MemberStatus)) {
      return NextResponse.json(
        { error: "Please select whether you are a Member or an Alumni." },
        { status: 400 },
      );
    }

    const isOfficer = body.status === "PGP-GS Roxas City Chapter Officer";
    if (isOfficer && (!isNonEmptyString(body.officerPosition) || !isNonEmptyString(body.officerDateElected))) {
      return NextResponse.json({ error: "Date elected is required for a chapter officer." }, { status: 400 });
    }

    const isFormerPresident = body.status === "Former Chapter President";
    if (
      isFormerPresident &&
      (!isNonEmptyString(body.formerPresidentStart) || !isNonEmptyString(body.formerPresidentEnd))
    ) {
      return NextResponse.json(
        { error: "Both the date started and date ended are required for a former chapter president." },
        { status: 400 },
      );
    }

    const email = body.email!.trim().toLowerCase();
    const existing = await db.select({ id: pgpmembers.id }).from(pgpmembers).where(eq(pgpmembers.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "A member with this email address already exists." }, { status: 409 });
    }

    let memberId = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [{ memberCount }] = await db.select({ memberCount: drizzleSql<number>`count(*)` }).from(pgpmembers);
      memberId = buildMemberId(body.dateSurvived!, Number(memberCount) + 1 + attempt);

      try {
        await db.insert(pgpmembers).values({
          memberId,
          firstName: body.firstName!,
          lastName: body.lastName!,
          middleInitial: body.middleInitial || null,
          age,
          dateOfBirth: body.dateOfBirth!,
          placeOfBirth: body.placeOfBirth!,
          street: body.street!,
          barangay: body.barangay!,
          municipality: body.municipality!,
          province: body.province!,
          email,
          contactNumber: body.contactNumber!,
          guardianName: body.guardianName!,
          guardianAddress: body.guardianAddress!,
          guardianContact: body.guardianContact!,
          baptizedName: body.baptizedName!,
          dateSurvived: body.dateSurvived!,
          status: body.status as MemberStatus,
          officerPosition: isOfficer ? body.officerPosition! : null,
          officerDateElected: isOfficer ? body.officerDateElected! : null,
          formerPresidentStart: isFormerPresident ? body.formerPresidentStart! : null,
          formerPresidentEnd: isFormerPresident ? body.formerPresidentEnd! : null,
          grandKnight: isNonEmptyString(body.grandKnight) ? body.grandKnight : null,
          photoUrl: isNonEmptyString(body.photoUrl) ? body.photoUrl : null,
          hasPhoto: Boolean(body.hasPhoto),
        });
        break;
      } catch (error) {
        const isUniqueViolation =
          error instanceof Error && error.message.toLowerCase().includes("unique");
        if (!isUniqueViolation || attempt === 4) throw error;
      }
    }

    return NextResponse.json({ memberId, success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "A member with this email address already exists." }, { status: 409 });
    }
    console.error("PGP member submission failed", error);
    return NextResponse.json({ error: "Unable to save your membership right now. Please try again." }, { status: 500 });
  }
}