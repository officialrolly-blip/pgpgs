"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import {
  getScopedNeophyte,
  requireNeophytesAction,
} from "@/lib/officer-access";
import { canDeleteNeophytes, scopeChapterFor } from "@/lib/officer-permissions";
import { getPublishedChapterNames } from "@/lib/chapters";
import { buildMemberId } from "@/lib/member-id";
import {
  NEOPHYTE_FAILED_TO_COMPLY,
  NEOPHYTE_STATUSES,
  NEOPHYTE_STATUS_LABELS,
} from "@/lib/member-constants";

export type NeophyteActionState = { error?: string; success?: string };

function neophyteId(formData: FormData): string {
  return String(formData.get("neophyteId") ?? "").trim();
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * "Missing" and "belongs to another chapter" are reported identically so a
 * chapter officer cannot probe for the existence of other chapters' records.
 */
const OUT_OF_SCOPE = "Neophyte record not found.";

function revalidateNeophytePaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/neophytes");
  revalidatePath("/admin/members");
}

export async function updateNeophyteStatusAction(
  _previousState: NeophyteActionState,
  formData: FormData,
): Promise<NeophyteActionState> {
  // Write rights first, then row scope: a provincial treasurer is rejected by
  // the guard, and a chapter officer can only ever reach their own chapter.
  const admin = await requireNeophytesAction();
  const id = neophyteId(formData);
  const requestedStatus = str(formData, "neophyteStatus");
  if (!id) return { error: "Missing neophyte reference." };

  // "Failed to Comply": permanently remove the neophyte from the database
  // instead of advancing the formation pipeline. member_credentials (and its
  // sessions) cascade-delete automatically.
  if (requestedStatus === NEOPHYTE_FAILED_TO_COMPLY) {
    if (!canDeleteNeophytes(admin)) {
      return { error: "Your account cannot remove neophyte records." };
    }
    const removable = await getScopedNeophyte(admin, id);
    if (!removable || removable.status !== "Neophyte") {
      return { error: OUT_OF_SCOPE };
    }

    await db.delete(pgpmembers).where(eq(pgpmembers.id, id));
    revalidateNeophytePaths();
    revalidatePath("/admin/officials");
    redirect("/admin/neophytes?removed=1");
  }

  if (!NEOPHYTE_STATUSES.includes(requestedStatus as (typeof NEOPHYTE_STATUSES)[number])) {
    return { error: "Please select a valid neophyte status." };
  }

  // The submitted id is never trusted on its own: a crafted POST cannot advance
  // another chapter's neophyte.
  const neophyte = await getScopedNeophyte(admin, id);
  if (!neophyte || neophyte.status !== "Neophyte") return { error: OUT_OF_SCOPE };

  const currentIndex = NEOPHYTE_STATUSES.indexOf(
    (neophyte.neophyteStatus ?? "orientation") as (typeof NEOPHYTE_STATUSES)[number],
  );
  const nextIndex = NEOPHYTE_STATUSES.indexOf(requestedStatus as (typeof NEOPHYTE_STATUSES)[number]);
  if (currentIndex === -1) return { error: "This record has an invalid workflow status." };
  if (nextIndex > currentIndex + 1) {
    return { error: "Complete the previous formation step before advancing." };
  }

  await db
    .update(pgpmembers)
    .set({
      neophyteStatus: requestedStatus,
      neophyteStatusUpdatedAt: new Date(),
      neophyteStatusUpdatedBy: admin.email,
    })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  return { success: `Status updated to ${NEOPHYTE_STATUS_LABELS[requestedStatus as (typeof NEOPHYTE_STATUSES)[number]]}.` };
}

export async function issueNeophyteCertificationAction(
  _previousState: NeophyteActionState,
  formData: FormData,
): Promise<NeophyteActionState> {
  const admin = await requireNeophytesAction();
  const id = neophyteId(formData);
  if (!id) return { error: "Missing neophyte reference." };

  const neophyte = await getScopedNeophyte(admin, id);
  if (!neophyte || neophyte.status !== "Neophyte") return { error: OUT_OF_SCOPE };
  if (neophyte.neophyteStatus !== "passed_member") {
    return { error: "The neophyte must reach ‘Passed as a Member’ before certification." };
  }

  await db
    .update(pgpmembers)
    .set({ neophyteCertificationIssuedAt: new Date(), neophyteCertificationIssuedBy: admin.email })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  return { success: "Certification issued. It is ready to print and confirm." };
}

export async function confirmNeophyteMemberAction(formData: FormData): Promise<void> {
  const admin = await requireNeophytesAction();
  const id = neophyteId(formData);
  if (!id) return;

  // Chapter pin before any promotion to the member directory.
  const scoped = await getScopedNeophyte(admin, id);
  if (!scoped || scoped.status !== "Neophyte") {
    throw new Error(OUT_OF_SCOPE);
  }

  // The certification timestamp is not part of the scoped projection, so it is
  // read separately and only after the chapter check has passed.
  const [row] = await db
    .select({
      neophyteStatus: pgpmembers.neophyteStatus,
      certificationIssuedAt: pgpmembers.neophyteCertificationIssuedAt,
    })
    .from(pgpmembers)
    .where(eq(pgpmembers.id, id))
    .limit(1);
  if (!row || row.neophyteStatus !== "passed_member" || !row.certificationIssuedAt) return;

  const now = new Date();
  await db
    .update(pgpmembers)
    .set({
      status: "Member",
      dateSurvived: now.toISOString().slice(0, 10),
      neophyteStatus: "confirmed_member",
      neophyteStatusUpdatedAt: now,
      neophyteStatusUpdatedBy: admin.email,
    })
    .where(eq(pgpmembers.id, id));
  revalidateNeophytePaths();
  redirect("/admin/neophytes?confirmed=1");
}

const NEOPHYTE_REQUIRED_FIELDS = [
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
] as const;

/**
 * Create — adds a neophyte straight into the formation pipeline.
 *
 * The record always lands inside the creator's own chapter: a chapter-scoped
 * officer's `memberChapter` is forced to their assignment rather than read from
 * the form, while province-wide accounts must pick a published chapter. Status
 * and starting stage are set server-side and never accepted from the client.
 */
export async function createNeophyteAction(
  _previousState: NeophyteActionState,
  formData: FormData,
): Promise<NeophyteActionState> {
  const admin = await requireNeophytesAction();

  const missingField = NEOPHYTE_REQUIRED_FIELDS.find((field) => !str(formData, field));
  if (missingField) return { error: "Please complete every required field." };

  const age = Number(str(formData, "age"));
  if (!Number.isInteger(age) || age < 1 || age > 120) {
    return { error: "Please enter a valid age." };
  }

  const email = str(formData, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const scope = scopeChapterFor(admin);
  let chapter = scope;
  if (!chapter) {
    const requested = str(formData, "memberChapter");
    const validChapterNames = await getPublishedChapterNames();
    if (!requested || !validChapterNames.has(requested)) {
      return { error: "Please select a valid PGPGS chapter." };
    }
    chapter = requested;
  }

  const [existing] = await db
    .select({ id: pgpmembers.id })
    .from(pgpmembers)
    .where(eq(pgpmembers.email, email))
    .limit(1);
  if (existing) {
    return { error: "A member with this email address already exists." };
  }

  const now = new Date();
  const dateSurvived = str(formData, "dateSurvived") || now.toISOString().slice(0, 10);
  const firstName = str(formData, "firstName");
  const values = {
    firstName,
    lastName: str(formData, "lastName"),
    middleInitial: str(formData, "middleInitial") || null,
    age,
    dateOfBirth: str(formData, "dateOfBirth"),
    placeOfBirth: str(formData, "placeOfBirth"),
    street: str(formData, "street"),
    barangay: str(formData, "barangay"),
    municipality: str(formData, "municipality"),
    province: str(formData, "province"),
    email,
    contactNumber: str(formData, "contactNumber"),
    guardianName: str(formData, "guardianName"),
    guardianAddress: str(formData, "guardianAddress"),
    guardianContact: str(formData, "guardianContact"),
    baptizedName: str(formData, "baptizedName") || firstName,
    dateSurvived,
    status: "Neophyte",
    memberChapter: chapter,
    neophyteStatus: "orientation",
    neophyteStatusUpdatedAt: now,
    neophyteStatusUpdatedBy: admin.email,
  };

  let memberId = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [{ memberCount }] = await db
      .select({ memberCount: drizzleSql<number>`count(*)` })
      .from(pgpmembers);
    memberId = buildMemberId(dateSurvived, Number(memberCount) + 1 + attempt);

    try {
      await db.insert(pgpmembers).values({ ...values, memberId });
      break;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error && error.message.toLowerCase().includes("unique");
      if (!isUniqueViolation || attempt === 4) throw error;
    }
  }

  revalidateNeophytePaths();
  redirect(`/admin/neophytes?created=${encodeURIComponent(memberId)}`);
}

