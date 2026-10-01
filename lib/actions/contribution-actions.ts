"use server";

import { requireAdmin } from "@/lib/auth";
import {
  deleteContributionRecord,
  generateMonthlyBills,
  pesosToCents,
  recordContributionPayment,
  updateContributionSettings,
} from "@/lib/contribution-service";

// Thin server-action wrappers: auth + FormData parsing only. All business
// logic (validation, writes, cache revalidation) lives in
// lib/contribution-service.ts so the REST API shares one implementation.

export type ContributionActionState = { error?: string; success?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Admin: changes the chapter-wide monthly dues amount and due day. */
export async function updateContributionSettingsAction(
  _previousState: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const admin = await requireAdmin();
  const { canManageContributionSettings } = await import("@/lib/officer-permissions");
  if (!canManageContributionSettings(admin)) {
    return { error: "Only administrators can change contribution settings." };
  }
  return updateContributionSettings(
    {
      monthlyAmountCents: pesosToCents(formData.get("monthlyAmount")),
      dueDay: Number(text(formData, "dueDay")),
    },
    admin.email,
  );
}

/**
 * Admin/treasurer: generates one bill per active directory member for a
 * billing month. Existing bills are never overwritten — reruns only fill in
 * members that are still missing a row.
 */
export async function generateMonthlyBillsAction(
  _previousState: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const admin = await requireAdmin();
  const { canRecordContributions } = await import("@/lib/officer-permissions");
  if (!canRecordContributions(admin)) {
    return { error: "Your account cannot generate bills." };
  }
  return generateMonthlyBills(text(formData, "billingMonth"));
}

/**
 * Admin/treasurer: records (or edits) a payment against a member's monthly
 * bill. Supports full payments, partial payments, waivers, and arrears
 * catch-up for any past month.
 */
export async function recordContributionPaymentAction(
  _previousState: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const admin = await requireAdmin();
  const { canRecordContributions, scopeChapterFor } = await import("@/lib/officer-permissions");
  if (!canRecordContributions(admin)) {
    return { error: "Your account cannot record contributions." };
  }
  const scope = scopeChapterFor(admin);
  if (scope) {
    const { db } = await import("@/db");
    const { pgpmembers } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [m] = await db
      .select({ chapter: pgpmembers.memberChapter })
      .from(pgpmembers)
      .where(eq(pgpmembers.id, text(formData, "memberPk")))
      .limit(1);
    if (m && (m.chapter ?? "").toLowerCase() !== scope.toLowerCase()) {
      return { error: "This member belongs to another chapter." };
    }
  }
  return recordContributionPayment(
    {
      memberPk: text(formData, "memberPk"),
      billingMonth: text(formData, "billingMonth"),
      amountPaidCents: pesosToCents(formData.get("amountPaid")),
      paymentMethod: text(formData, "paymentMethod"),
      referenceNumber: text(formData, "referenceNumber"),
      note: text(formData, "note"),
      waived: formData.get("waived") === "on",
    },
    admin.email,
  );
}

/** Admin: removes a single contribution record (corrections only). */
export async function deleteContributionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const { canDeleteContributions } = await import("@/lib/officer-permissions");
  if (!canDeleteContributions(admin)) throw new Error("Only administrators can delete records.");
  await deleteContributionRecord(text(formData, "contributionId"));
}
