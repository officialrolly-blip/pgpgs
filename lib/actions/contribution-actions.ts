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
 *
 * A chapter treasurer's run is pinned to their own chapter.
 */
export async function generateMonthlyBillsAction(
  _previousState: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const admin = await requireAdmin();
  const { canRecordContributions, scopeChapterFor } = await import("@/lib/officer-permissions");
  if (!canRecordContributions(admin)) {
    return { error: "Your account cannot generate bills." };
  }
  return generateMonthlyBills(text(formData, "billingMonth"), scopeChapterFor(admin));
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
  // A chapter treasurer may only write against their own chapter's members.
  // `getScopedMember` returns null for both "no such member" and "another
  // chapter", so this cannot be used to probe other chapters' rosters.
  const { getScopedMember } = await import("@/lib/officer-access");
  const memberPk = text(formData, "memberPk");
  const target = await getScopedMember(admin, memberPk);
  if (!target) {
    return { error: "That member is not available to your account." };
  }
  return recordContributionPayment(
    {
      memberPk,
      billingMonth: text(formData, "billingMonth"),
      amountPaidCents: pesosToCents(formData.get("amountPaid")),
      paymentMethod: text(formData, "paymentMethod"),
      referenceNumber: text(formData, "referenceNumber"),
      note: text(formData, "note"),
      waived: formData.get("waived") === "on",
    },
    admin.email,
    scopeChapterFor(admin),
  );
}

/** Admin: removes a single contribution record (corrections only). */
export async function deleteContributionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const { canDeleteContributions } = await import("@/lib/officer-permissions");
  if (!canDeleteContributions(admin)) throw new Error("Only administrators can delete records.");
  await deleteContributionRecord(text(formData, "contributionId"));
}
