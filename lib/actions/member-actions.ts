"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { buildMemberId } from "@/lib/member-id";
import {
  LADY_INITIATOR_ROLES,
  MASTER_INITIATOR_ROLES,
  MEMBER_STATUSES,
  OFFICER_POSITIONS,
  PGPGS_CHAPTERS,
  VICE_PRESIDENT_ROLES,
} from "@/lib/member-constants";

export type MemberFormState = {
  error?: string;
  success?: string;
};

const REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
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

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

/** Builds an insert/update payload from form data, mirroring the public API validation. */
function parseMemberForm(formData: FormData): { values?: Record<string, unknown>; error?: string } {
  const values: Record<string, unknown> = {
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    middleInitial: optionalStr(formData, "middleInitial"),
    dateOfBirth: str(formData, "dateOfBirth"),
    placeOfBirth: str(formData, "placeOfBirth"),
    street: str(formData, "street"),
    barangay: str(formData, "barangay"),
    municipality: str(formData, "municipality"),
    province: str(formData, "province"),
    email: str(formData, "email").toLowerCase(),
    contactNumber: str(formData, "contactNumber"),
    guardianName: str(formData, "guardianName"),
    guardianAddress: str(formData, "guardianAddress"),
    guardianContact: str(formData, "guardianContact"),
    baptizedName: str(formData, "baptizedName"),
    dateSurvived: str(formData, "dateSurvived"),
    status: str(formData, "status"),
    officerPosition: null,
    officerDateElected: null,
    formerPresidentChapter: null,
    formerPresidentStart: null,
    formerPresidentEnd: null,
    formerVicePresidentChapter: null,
    formerVicePresidentRole: null,
    formerVicePresidentStart: null,
    formerVicePresidentEnd: null,
    formerMasterInitiatorRole: null,
    formerMasterInitiatorChapter: null,
    formerMasterInitiatorStart: null,
    formerMasterInitiatorEnd: null,
    formerLadyInitiatorRole: null,
    formerLadyInitiatorChapter: null,
    formerLadyInitiatorStart: null,
    formerLadyInitiatorEnd: null,
    grandKnight: optionalStr(formData, "grandKnight"),
    photoUrl: optionalStr(formData, "photoUrl"),
    hasPhoto: formData.get("hasPhoto") === "on" || formData.get("hasPhoto") === "true",
  };

  const missingField = REQUIRED_FIELDS.find(
    (field) => typeof values[field] !== "string" || (values[field] as string).length === 0,
  );
  if (missingField) {
    return { error: `Missing required field: ${missingField}` };
  }

  const age = Number(str(formData, "age"));
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: "Please enter a valid age." };
  }
  values.age = age;

  const status = values.status as string;
  if (!MEMBER_STATUSES.includes(status as (typeof MEMBER_STATUSES)[number])) {
    return { error: "Please select a valid membership status." };
  }

  const email = values.email as string;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  return validateStatusFields(formData, values, status);
}

function validateStatusFields(
  formData: FormData,
  values: Record<string, unknown>,
  status: string,
): { values?: Record<string, unknown>; error?: string } {
  const isOfficer = status === "PGP-GS Roxas City Chapter Officer";
  const isFormerPresident = status === "Former Chapter President";
  const isFormerVicePresident = status === "Former Chapter Vice President";
  const isFormerMasterInitiator = status === "Former Chapter Master Initiator";
  const isFormerLadyInitiator = status === "Former Chapter Lady Initiator";

  if (isOfficer) {
    const position = str(formData, "officerPosition");
    const dateElected = str(formData, "officerDateElected");
    if (!OFFICER_POSITIONS.includes(position as (typeof OFFICER_POSITIONS)[number])) {
      return { error: "Please select a valid officer position." };
    }
    if (!dateElected) return { error: "Officer date elected is required." };
    values.officerPosition = position;
    values.officerDateElected = dateElected;
  }

  if (isFormerPresident) {
    const chapter = str(formData, "formerPresidentChapter");
    const start = str(formData, "formerPresidentStart");
    const end = str(formData, "formerPresidentEnd");
    if (!PGPGS_CHAPTERS.includes(chapter as (typeof PGPGS_CHAPTERS)[number])) {
      return { error: "Please select a valid chapter." };
    }
    if (!start || !end) return { error: "Term start and end are required." };
    values.formerPresidentChapter = chapter;
    values.formerPresidentStart = start;
    values.formerPresidentEnd = end;
  }

  if (isFormerVicePresident) {
    const chapter = str(formData, "formerVicePresidentChapter");
    const role = str(formData, "formerVicePresidentRole");
    const start = str(formData, "formerVicePresidentStart");
    const end = str(formData, "formerVicePresidentEnd");
    if (!PGPGS_CHAPTERS.includes(chapter as (typeof PGPGS_CHAPTERS)[number])) {
      return { error: "Please select a valid chapter." };
    }
    if (!VICE_PRESIDENT_ROLES.includes(role as (typeof VICE_PRESIDENT_ROLES)[number])) {
      return { error: "Please select a valid vice president role." };
    }
    if (!start || !end) return { error: "Term start and end are required." };
    values.formerVicePresidentChapter = chapter;
    values.formerVicePresidentRole = role;
    values.formerVicePresidentStart = start;
    values.formerVicePresidentEnd = end;
  }

  if (isFormerMasterInitiator) {
    const role = str(formData, "formerMasterInitiatorRole");
    const chapter = str(formData, "formerMasterInitiatorChapter");
    const start = str(formData, "formerMasterInitiatorStart");
    const end = str(formData, "formerMasterInitiatorEnd");
    if (!MASTER_INITIATOR_ROLES.includes(role as (typeof MASTER_INITIATOR_ROLES)[number])) {
      return { error: "Please select a valid master initiator role." };
    }
    if (!PGPGS_CHAPTERS.includes(chapter as (typeof PGPGS_CHAPTERS)[number])) {
      return { error: "Please select a valid chapter." };
    }
    if (!start || !end) return { error: "Term start and end are required." };
    values.formerMasterInitiatorRole = role;
    values.formerMasterInitiatorChapter = chapter;
    values.formerMasterInitiatorStart = start;
    values.formerMasterInitiatorEnd = end;
  }

  if (isFormerLadyInitiator) {
    const role = str(formData, "formerLadyInitiatorRole");
    const chapter = str(formData, "formerLadyInitiatorChapter");
    const start = str(formData, "formerLadyInitiatorStart");
    const end = str(formData, "formerLadyInitiatorEnd");
    if (!LADY_INITIATOR_ROLES.includes(role as (typeof LADY_INITIATOR_ROLES)[number])) {
      return { error: "Please select a valid lady initiator role." };
    }
    if (!PGPGS_CHAPTERS.includes(chapter as (typeof PGPGS_CHAPTERS)[number])) {
      return { error: "Please select a valid chapter." };
    }
    if (!start || !end) return { error: "Term start and end are required." };
    values.formerLadyInitiatorRole = role;
    values.formerLadyInitiatorChapter = chapter;
    values.formerLadyInitiatorStart = start;
    values.formerLadyInitiatorEnd = end;
  }

  return { values };
}

function revalidateMemberPaths(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  revalidatePath("/admin/officials");
  // Public pages read members directly on each request (force-dynamic),
  // but revalidating keeps any cached copies fresh.
  revalidatePath("/officials/roxas-city-chapter-officers");
  revalidatePath("/alumni");
}

export async function createMemberAction(
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const parsed = parseMemberForm(formData);
  if (parsed.error || !parsed.values) {
    return { error: parsed.error ?? "Please review the form and try again." };
  }
  const values = parsed.values;

  const [existing] = await db
    .select({ id: pgpmembers.id })
    .from(pgpmembers)
    .where(eq(pgpmembers.email, values.email as string))
    .limit(1);
  if (existing) {
    return { error: "A member with this email address already exists." };
  }

  let memberId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [{ memberCount }] = await db
      .select({ memberCount: drizzleSql<number>`count(*)` })
      .from(pgpmembers);
    memberId = buildMemberId(values.dateSurvived as string, Number(memberCount) + 1 + attempt);

    try {
      await db.insert(pgpmembers).values({ ...values, memberId } as typeof pgpmembers.$inferInsert);
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error && error.message.toLowerCase().includes("unique");
      if (!isUniqueViolation || attempt === 4) throw error;
    }
  }

  revalidateMemberPaths();
  redirect(`/admin/members?created=${encodeURIComponent(memberId)}`);
}

export async function updateMemberAction(
  _prevState: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();

  const memberId = String(formData.get("id") ?? "");
  if (!memberId) return { error: "Missing member reference." };

  const parsed = parseMemberForm(formData);
  if (parsed.error || !parsed.values) {
    return { error: parsed.error ?? "Please review the form and try again." };
  }

  const [emailConflict] = await db
    .select({ id: pgpmembers.id })
    .from(pgpmembers)
    .where(eq(pgpmembers.email, parsed.values.email as string))
    .limit(1);
  if (emailConflict && emailConflict.id !== memberId) {
    return { error: "Another member already uses this email address." };
  }

  await db
    .update(pgpmembers)
    .set(parsed.values as Partial<typeof pgpmembers.$inferInsert>)
    .where(eq(pgpmembers.id, memberId));

  revalidateMemberPaths();
  return { success: "Member updated successfully." };
}

export async function deleteMemberAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const memberId = String(formData.get("id") ?? "");
  if (!memberId) return;

  await db.delete(pgpmembers).where(eq(pgpmembers.id, memberId));
  revalidateMemberPaths();
  redirect("/admin/members?deleted=1");
}

export async function setOfficerPositionAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const memberId = String(formData.get("memberId") ?? "");
  const position = String(formData.get("officerPosition") ?? "");
  const dateElected = String(formData.get("officerDateElected") ?? "");
  if (!memberId) return;

  if (!position) {
    // Clearing the officer position also moves the member out of the
    // officer status so public listings stay consistent.
    const [member] = await db
      .select({ status: pgpmembers.status })
      .from(pgpmembers)
      .where(eq(pgpmembers.id, memberId))
      .limit(1);

    await db
      .update(pgpmembers)
      .set({
        officerPosition: null,
        officerDateElected: null,
        status:
          member?.status === "PGP-GS Roxas City Chapter Officer" ? "Member" : member?.status ?? "Member",
      })
      .where(eq(pgpmembers.id, memberId));
  } else {
    if (!OFFICER_POSITIONS.includes(position as (typeof OFFICER_POSITIONS)[number])) return;
    if (!dateElected) return;

    await db
      .update(pgpmembers)
      .set({
        officerPosition: position,
        officerDateElected: dateElected,
        status: "PGP-GS Roxas City Chapter Officer",
      })
      .where(eq(pgpmembers.id, memberId));
  }

  revalidateMemberPaths();
}

