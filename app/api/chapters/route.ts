import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";

export const runtime = "nodejs";

const INITIATOR_ROLES = ["I", "II", "III", "IV"] as const;
type InitiatorRole = (typeof INITIATOR_ROLES)[number];
const VICE_PRESIDENT_ROLES = [
  "Vice President for Internal",
  "Vice President for External",
] as const;
type VicePresidentRole = (typeof VICE_PRESIDENT_ROLES)[number];

// Public chapter list used by forms that let members pick their chapter.
// Only reviewed chapters that the council has published are returned.
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
    console.error("Chapter list failed", error);
    return NextResponse.json(
      { error: "Unable to load chapters right now." },
      { status: 500 },
    );
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ChapterBody {
  chapterName?: string;
  chapterAddress?: string;
  chapterOrganizer?: string;
  logoUrl?: string;
  presidentId?: string;
  vicePresidentId?: string;
  vicePresidentRole?: string;
  secretaryId?: string;
  treasurerId?: string;
  masterInitiatorId?: string;
  masterInitiatorRole?: string;
  ladyInitiatorId?: string;
  ladyInitiatorRole?: string;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function resolveInitiatorRole(
  memberId: unknown,
  role: unknown,
): { value: string | null; error?: string } {
  if (memberId === undefined || memberId === null || memberId === "") {
    if (isNonEmptyString(role)) {
      return { value: null, error: "A role was selected without choosing a member." };
    }
    return { value: null };
  }
  if (!isNonEmptyString(role)) {
    return { value: null, error: "Please choose the initiator role (I, II, III, or IV)." };
  }
  if (!INITIATOR_ROLES.includes(role as InitiatorRole)) {
    return { value: null, error: "Initiator role must be I, II, III, or IV." };
  }
  return { value: role };
}

function resolveVicePresidentRole(
  memberId: unknown,
  role: unknown,
): { value: string | null; error?: string } {
  if (memberId === undefined || memberId === null || memberId === "") {
    if (isNonEmptyString(role)) {
      return { value: null, error: "A role was selected without choosing a member." };
    }
    return { value: null };
  }
  if (!isNonEmptyString(role)) {
    return { value: null, error: "Please choose the Vice President role (Internal or External)." };
  }
  if (!VICE_PRESIDENT_ROLES.includes(role as VicePresidentRole)) {
    return { value: null, error: "Vice President role must be Internal or External." };
  }
  return { value: role };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChapterBody;

    const missingField = (
      ["chapterName", "chapterAddress", "chapterOrganizer"] as const
    ).find((field) => !isNonEmptyString(body[field]));
    if (missingField) {
      return NextResponse.json(
        { error: `Missing required field: ${missingField}` },
        { status: 400 },
      );
    }

    const officialFields = [
      "presidentId",
      "vicePresidentId",
      "secretaryId",
      "treasurerId",
      "masterInitiatorId",
      "ladyInitiatorId",
    ] as const;
    for (const field of officialFields) {
      const value = body[field];
      if (value !== undefined && value !== null && value !== "" && !isValidUuid(value)) {
        return NextResponse.json(
          { error: "One of the selected officials is invalid. Please search again." },
          { status: 400 },
        );
      }
    }

    const masterRole = resolveInitiatorRole(body.masterInitiatorId, body.masterInitiatorRole);
    if (masterRole.error) {
      return NextResponse.json({ error: masterRole.error }, { status: 400 });
    }
    const viceRole = resolveVicePresidentRole(body.vicePresidentId, body.vicePresidentRole);
    if (viceRole.error) {
      return NextResponse.json({ error: viceRole.error }, { status: 400 });
    }
    const ladyRole = resolveInitiatorRole(body.ladyInitiatorId, body.ladyInitiatorRole);
    if (ladyRole.error) {
      return NextResponse.json({ error: ladyRole.error }, { status: 400 });
    }

    await db.insert(chapters).values({
      chapterName: body.chapterName!.trim(),
      chapterAddress: body.chapterAddress!.trim(),
      chapterOrganizer: body.chapterOrganizer!.trim(),
      status: "pending", // Reviewed and published by the council in the admin dashboard.
      logoUrl: isNonEmptyString(body.logoUrl) ? body.logoUrl : null,
      presidentId: isValidUuid(body.presidentId) ? body.presidentId : null,
      vicePresidentId: isValidUuid(body.vicePresidentId) ? body.vicePresidentId : null,
      vicePresidentRole: viceRole.value,
      secretaryId: isValidUuid(body.secretaryId) ? body.secretaryId : null,
      treasurerId: isValidUuid(body.treasurerId) ? body.treasurerId : null,
      masterInitiatorId: isValidUuid(body.masterInitiatorId) ? body.masterInitiatorId : null,
      masterInitiatorRole: masterRole.value,
      ladyInitiatorId: isValidUuid(body.ladyInitiatorId) ? body.ladyInitiatorId : null,
      ladyInitiatorRole: ladyRole.value,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // Drizzle wraps driver errors, so the PostgreSQL error lives on `cause`.
    const cause = (error as { cause?: { code?: string; message?: string } })?.cause;
    const pgCode = cause?.code ?? (error as { code?: string })?.code ?? "";
    const combined = `${error instanceof Error ? error.message : ""} ${cause?.message ?? ""}`.toLowerCase();

    if (pgCode === "23505" || combined.includes("unique") || combined.includes("duplicate")) {
      return NextResponse.json(
        { error: "A chapter with this name has already been registered." },
        { status: 409 },
      );
    }
    if (pgCode === "23503" || combined.includes("foreign key")) {
      return NextResponse.json(
        { error: "One of the selected officials could not be found. Please search again." },
        { status: 400 },
      );
    }
    console.error("Chapter submission failed", error);
    return NextResponse.json(
      { error: "Unable to save the chapter right now. Please try again." },
      { status: 500 },
    );
  }
}