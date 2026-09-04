import { NextResponse } from "next/server";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { chapters, pgpmembers } from "@/db/schema";
import { getPublishedChapterNames } from "@/lib/chapters";

export const runtime = "nodejs";

const MEMBER_STATUSES = [
  "Member",
  "Alumni",
  "PGP-GS Roxas City Chapter Officer",
  "Former Chapter President",
  "Former Chapter Vice President",
  "Former Chapter Master Initiator",
  "Former Chapter Lady Initiator",
  "Former Grand Knight",
  "Elected Grand Knight",
  "Chapter Organizer",
] as const;
const VICE_PRESIDENT_ROLES = ["VP For Internal", "VP For External"] as const;
const MASTER_INITIATOR_ROLES = [
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
] as const;
const LADY_INITIATOR_ROLES = [
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
  "Lady Initiator IV",
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
  memberChapter?: string;
  officerPosition?: string;
  officerDateElected?: string;
  formerPresidentChapter?: string;
  formerPresidentStart?: string;
  formerPresidentEnd?: string;
  formerVicePresidentChapter?: string;
  formerVicePresidentRole?: string;
  formerVicePresidentStart?: string;
  formerVicePresidentEnd?: string;
  formerMasterInitiatorRole?: string;
  formerMasterInitiatorChapter?: string;
  formerMasterInitiatorStart?: string;
  formerMasterInitiatorEnd?: string;
  formerLadyInitiatorRole?: string;
  formerLadyInitiatorChapter?: string;
  formerLadyInitiatorStart?: string;
  formerLadyInitiatorEnd?: string;
  grandKnight?: string;
  grandKnightChapter?: string;
  grandKnightStart?: string;
  grandKnightEnd?: string;
  chapterOrganizerChapter?: string;
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

    // Fetch published chapter names from the database — the single source of
    // truth shared with the registration form's chapter dropdowns.
    const validChapterNames = await getPublishedChapterNames();

    const missingField = requiredFields.find(
      (field) => !isNonEmptyString(body[field]),
    );
    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 },
      );
    }

    const age = Number(body.age);
    if (!Number.isInteger(age) || age < 1 || age > 130) {
      return NextResponse.json(
        { error: "Please enter a valid age." },
        { status: 400 },
      );
    }

    if (!MEMBER_STATUSES.includes(body.status as MemberStatus)) {
      return NextResponse.json(
        { error: "Please select whether you are a Member or an Alumni." },
        { status: 400 },
      );
    }

    const isMemberOrAlumni =
      body.status === "Member" || body.status === "Alumni";
    if (isMemberOrAlumni && !isNonEmptyString(body.memberChapter)) {
      return NextResponse.json(
        { error: "Please select a chapter." },
        { status: 400 },
      );
    }
    if (isMemberOrAlumni && !validChapterNames.has(body.memberChapter!)) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }

    const isOfficer = body.status === "PGP-GS Roxas City Chapter Officer";
    if (
      isOfficer &&
      (!isNonEmptyString(body.officerPosition) ||
        !isNonEmptyString(body.officerDateElected))
    ) {
      return NextResponse.json(
        { error: "Date elected is required for a chapter officer." },
        { status: 400 },
      );
    }

    const isFormerPresident = body.status === "Former Chapter President";
    if (
      isFormerPresident &&
      (!isNonEmptyString(body.formerPresidentChapter) ||
        !isNonEmptyString(body.formerPresidentStart) ||
        !isNonEmptyString(body.formerPresidentEnd))
    ) {
      return NextResponse.json(
        {
          error:
            "Both the date started and date ended are required for a former chapter president.",
        },
        { status: 400 },
      );
    }
    if (
      isFormerPresident &&
      !validChapterNames.has(body.formerPresidentChapter!)
    ) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }

    const isFormerVicePresident =
      body.status === "Former Chapter Vice President";
    if (
      isFormerVicePresident &&
      (!isNonEmptyString(body.formerVicePresidentChapter) ||
        !isNonEmptyString(body.formerVicePresidentRole) ||
        !isNonEmptyString(body.formerVicePresidentStart) ||
        !isNonEmptyString(body.formerVicePresidentEnd))
    ) {
      return NextResponse.json(
        {
          error:
            "Role, chapter, and both the date started and date ended are required for a former chapter vice president.",
        },
        { status: 400 },
      );
    }
    if (
      isFormerVicePresident &&
      (!VICE_PRESIDENT_ROLES.includes(
        body.formerVicePresidentRole as (typeof VICE_PRESIDENT_ROLES)[number],
      ) ||
        !validChapterNames.has(body.formerVicePresidentChapter!))
    ) {
      return NextResponse.json(
        {
          error: "Please select a valid vice president role and PGPGS chapter.",
        },
        { status: 400 },
      );
    }

    const isFormerMasterInitiator =
      body.status === "Former Chapter Master Initiator";
    if (
      isFormerMasterInitiator &&
      (!isNonEmptyString(body.formerMasterInitiatorStart) ||
        !isNonEmptyString(body.formerMasterInitiatorEnd))
    ) {
      return NextResponse.json(
        {
          error:
            "Both the date started and date ended are required for a former chapter Master Initiator.",
        },
        { status: 400 },
      );
    }
    if (
      isFormerMasterInitiator &&
      !MASTER_INITIATOR_ROLES.includes(
        body.formerMasterInitiatorRole as (typeof MASTER_INITIATOR_ROLES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Please select a valid Master Initiator role." },
        { status: 400 },
      );
    }
    if (
      isFormerMasterInitiator &&
      !validChapterNames.has(body.formerMasterInitiatorChapter!)
    ) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }

    const isFormerLadyInitiator =
      body.status === "Former Chapter Lady Initiator";
    if (
      isFormerLadyInitiator &&
      (!isNonEmptyString(body.formerLadyInitiatorStart) ||
        !isNonEmptyString(body.formerLadyInitiatorEnd))
    ) {
      return NextResponse.json(
        {
          error:
            "Both the date started and date ended are required for a former chapter Lady Initiator.",
        },
        { status: 400 },
      );
    }
    if (
      isFormerLadyInitiator &&
      !LADY_INITIATOR_ROLES.includes(
        body.formerLadyInitiatorRole as (typeof LADY_INITIATOR_ROLES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Please select a valid Lady Initiator role." },
        { status: 400 },
      );
    }
    if (
      isFormerLadyInitiator &&
      !validChapterNames.has(body.formerLadyInitiatorChapter!)
    ) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }

    const isFormerGrandKnight = body.status === "Former Grand Knight";
    const isChapterOrganizer = body.status === "Chapter Organizer";
    if (isChapterOrganizer && !isNonEmptyString(body.chapterOrganizerChapter)) {
      return NextResponse.json(
        { error: "Please select the PGPGS chapter you organize." },
        { status: 400 },
      );
    }
    if (
      isChapterOrganizer &&
      !validChapterNames.has(body.chapterOrganizerChapter!)
    ) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }
    if (
      (isFormerGrandKnight || body.status === "Elected Grand Knight") &&
      !isNonEmptyString(body.grandKnightChapter)
    ) {
      return NextResponse.json(
        {
          error: "Please select the PGPGS chapter for your Grand Knight role.",
        },
        { status: 400 },
      );
    }
    if (
      (isFormerGrandKnight || body.status === "Elected Grand Knight") &&
      !validChapterNames.has(body.grandKnightChapter!)
    ) {
      return NextResponse.json(
        { error: "Please select a valid PGPGS chapter." },
        { status: 400 },
      );
    }
    if (
      isFormerGrandKnight &&
      (!isNonEmptyString(body.grandKnightStart) ||
        !isNonEmptyString(body.grandKnightEnd))
    ) {
      return NextResponse.json(
        {
          error:
            "Both the date started and date ended are required for a former Grand Knight.",
        },
        { status: 400 },
      );
    }

    const email = body.email!.trim().toLowerCase();
    const existing = await db
      .select({ id: pgpmembers.id })
      .from(pgpmembers)
      .where(eq(pgpmembers.email, email))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A member with this email address already exists." },
        { status: 409 },
      );
    }

    let memberId = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const [{ memberCount }] = await db
        .select({ memberCount: drizzleSql<number>`count(*)` })
        .from(pgpmembers);
      memberId = buildMemberId(
        body.dateSurvived!,
        Number(memberCount) + 1 + attempt,
      );

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
          memberChapter: isMemberOrAlumni ? body.memberChapter! : null,
          officerPosition: isOfficer ? body.officerPosition! : null,
          officerDateElected: isOfficer ? body.officerDateElected! : null,
          formerPresidentChapter: isFormerPresident
            ? body.formerPresidentChapter!
            : null,
          formerPresidentStart: isFormerPresident
            ? body.formerPresidentStart!
            : null,
          formerPresidentEnd: isFormerPresident
            ? body.formerPresidentEnd!
            : null,
          formerVicePresidentChapter: isFormerVicePresident
            ? body.formerVicePresidentChapter!
            : null,
          formerVicePresidentRole: isFormerVicePresident
            ? body.formerVicePresidentRole!
            : null,
          formerVicePresidentStart: isFormerVicePresident
            ? body.formerVicePresidentStart!
            : null,
          formerVicePresidentEnd: isFormerVicePresident
            ? body.formerVicePresidentEnd!
            : null,
          formerMasterInitiatorRole: isFormerMasterInitiator
            ? body.formerMasterInitiatorRole!
            : null,
          formerMasterInitiatorChapter: isFormerMasterInitiator
            ? body.formerMasterInitiatorChapter!
            : null,
          formerMasterInitiatorStart: isFormerMasterInitiator
            ? body.formerMasterInitiatorStart!
            : null,
          formerMasterInitiatorEnd: isFormerMasterInitiator
            ? body.formerMasterInitiatorEnd!
            : null,
          formerLadyInitiatorRole: isFormerLadyInitiator
            ? body.formerLadyInitiatorRole!
            : null,
          formerLadyInitiatorChapter: isFormerLadyInitiator
            ? body.formerLadyInitiatorChapter!
            : null,
          formerLadyInitiatorStart: isFormerLadyInitiator
            ? body.formerLadyInitiatorStart!
            : null,
          formerLadyInitiatorEnd: isFormerLadyInitiator
            ? body.formerLadyInitiatorEnd!
            : null,
          grandKnight: isNonEmptyString(body.grandKnight)
            ? body.grandKnight
            : null,
          grandKnightChapter:
            isFormerGrandKnight || body.status === "Elected Grand Knight"
              ? body.grandKnightChapter!
              : null,
          grandKnightStart: isFormerGrandKnight ? body.grandKnightStart! : null,
          grandKnightEnd: isFormerGrandKnight ? body.grandKnightEnd! : null,
          chapterOrganizerChapter: isChapterOrganizer
            ? body.chapterOrganizerChapter!
            : null,
          photoUrl: isNonEmptyString(body.photoUrl) ? body.photoUrl : null,
          hasPhoto: Boolean(body.hasPhoto),
        });
        break;
      } catch (error) {
        const isUniqueViolation =
          error instanceof Error &&
          error.message.toLowerCase().includes("unique");
        if (!isUniqueViolation || attempt === 4) throw error;
      }
    }

    return NextResponse.json({ memberId, success: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      return NextResponse.json(
        { error: "A member with this email address already exists." },
        { status: 409 },
      );
    }
    console.error("PGP member submission failed", error);
    return NextResponse.json(
      { error: "Unable to save your membership right now. Please try again." },
      { status: 500 },
    );
  }
}
