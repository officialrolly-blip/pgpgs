"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  contributionSettings,
  monthlyContributions,
  pgpmembers,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import {
  CONTRIBUTION_PAYMENT_METHODS,
  DEFAULT_DUES_DUE_DAY,
  DEFAULT_MONTHLY_DUES_CENTS,
  billingMonthLabel,
  currentBillingMonth,
} from "@/lib/contributions";

export type ContributionActionState = { error?: string; success?: string };

const BILLING_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function pesosToCents(formData: FormData, key: string): number {
  const raw = text(formData, key).replace(/,/g, "");
  const pesos = Number(raw);
  if (!Number.isFinite(pesos) || pesos < 0) return Number.NaN;
  return Math.round(pesos * 100);
}

function revalidateContributionPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/contributions");
  revalidatePath("/admin/members");
  revalidatePath("/member-id");
}

function resolveRecordedStatus(
  amountDueCents: number,
  amountPaidCents: number,
): "unpaid" | "partial" | "paid" {
  if (amountPaidCents <= 0) return "unpaid";
  if (amountPaidCents >= amountDueCents) return "paid";
  return "partial";
}

/** Admin: changes the chapter-wide monthly dues amount and due day. */
export async function updateContributionSettingsAction(
  _previousState: ContributionActionState,
  formData: FormData,
): Promise<ContributionActionState> {
  const admin = await requireAdmin();
  const amountCents = pesosToCents(formData, "monthlyAmount");
  const dueDay = Number(text(formData, "dueDay"));

  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 10000000) {
    return { error: "Enter a valid monthly amount between ₱0 and ₱100,000." };
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Due day must be between 1 and 28." };
  }

  await db
    .insert(contributionSettings)
    .values({ id: 1, monthlyAmountCents: amountCents, dueDay, updatedBy: admin.email })
    .onConflictDoUpdate({
      target: contributionSettings.id,
      set: { monthlyAmountCents: amountCents, dueDay, updatedAt: new Date(), updatedBy: admin.email },
    });

  revalidateContributionPaths();
  return { success: `Monthly dues updated to ₱${(amountCents / 100).toFixed(2)}, due every ${dueDay}${dueDaySuffix(dueDay)} of the month.` };
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
  await requireAdmin();
  const requested = text(formData, "billingMonth") || currentBillingMonth();
  if (!BILLING_MONTH_PATTERN.test(requested)) {
    return { error: "Pick a valid billing month." };
  }
  const [settings] = await db.select().from(contributionSettings).limit(1);
  const amountDueCents = settings?.monthlyAmountCents ?? DEFAULT_MONTHLY_DUES_CENTS;
  const generated = await db.execute<{ created: number }>(
    `insert into monthly_contributions (member_pk, billing_month, amount_due_cents)
     select id, '${requested}'::text, ${amountDueCents}::int
     from pgpmembers where status <> 'Neophyte'
     on conflict (member_pk, billing_month) do nothing returning 1`,
  );
  const createdCount = generated.rows.length;
  revalidateContributionPaths();
  if (createdCount === 0) {
    return { success: `${billingMonthLabel(requested)} bills are already complete — nothing new to generate.` };
  }
  return { success: `Generated ${createdCount} ${createdCount === 1 ? "bill" : "bills"} for ${billingMonthLabel(requested)}.` };
}

function dueDaySuffix(day: number): string {
  if (day === 1 || day === 21) return "st";
  if (day === 2 || day === 22) return "nd";
  if (day === 3 || day === 23) return "rd";
  return "th";
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
  const memberPk = text(formData, "memberPk");
  const billingMonth = text(formData, "billingMonth") || currentBillingMonth();
  const amountCents = pesosToCents(formData, "amountPaid");
  const paymentMethod = text(formData, "paymentMethod");
  const referenceNumber = text(formData, "referenceNumber");
  const note = text(formData, "note");
  const markWaived = formData.get("waived") === "on";

  if (!UUID_PATTERN.test(memberPk)) return { error: "Select a valid member." };
  if (!BILLING_MONTH_PATTERN.test(billingMonth)) return { error: "Pick a valid billing month." };
  if (!markWaived && (!Number.isFinite(amountCents) || amountCents < 0)) {
    return { error: "Enter a valid payment amount." };
  }
  if (paymentMethod && !CONTRIBUTION_PAYMENT_METHODS.includes(paymentMethod as (typeof CONTRIBUTION_PAYMENT_METHODS)[number])) {
    return { error: "Select a valid payment method." };
  }
  if (referenceNumber.length > 80) return { error: "Reference number must be 80 characters or fewer." };
  if (note.length > 500) return { error: "Note must be 500 characters or fewer." };

  const [member] = await db.select({ id: pgpmembers.id }).from(pgpmembers).where(eq(pgpmembers.id, memberPk)).limit(1);
  if (!member) return { error: "Member not found." };
  const [settings] = await db.select().from(contributionSettings).limit(1);
  const fallbackDue = settings?.monthlyAmountCents ?? DEFAULT_MONTHLY_DUES_CENTS;
  const [existing] = await db
    .select()
    .from(monthlyContributions)
    .where(and(eq(monthlyContributions.memberPk, memberPk), eq(monthlyContributions.billingMonth, billingMonth)))
    .limit(1);

  if (markWaived) {
    const payload = {
      memberPk, billingMonth,
      amountDueCents: existing?.amountDueCents ?? fallbackDue,
      amountPaidCents: 0, status: "waived" as const,
      paymentMethod: null, referenceNumber: referenceNumber || null,
      note: note || "Waived by treasurer", paidAt: null,
      recordedBy: admin.email, updatedAt: new Date(),
    };
    if (existing) await db.update(monthlyContributions).set(payload).where(eq(monthlyContributions.id, existing.id));
    else await db.insert(monthlyContributions).values(payload);
    revalidateContributionPaths();
    return { success: `Bill for ${billingMonthLabel(billingMonth)} waived.` };
  }

  const dueCents = existing?.amountDueCents ?? fallbackDue;
  const status = resolveRecordedStatus(dueCents, amountCents);
  const payload = {
    memberPk, billingMonth, amountDueCents: dueCents, amountPaidCents: amountCents, status,
    paymentMethod: paymentMethod || null, referenceNumber: referenceNumber || null, note: note || null,
    paidAt: status === "paid" ? new Date() : (existing?.paidAt ?? null),
    recordedBy: admin.email, updatedAt: new Date(),
  };
  if (existing) await db.update(monthlyContributions).set(payload).where(eq(monthlyContributions.id, existing.id));
  else await db.insert(monthlyContributions).values(payload);
  revalidateContributionPaths();
  if (status === "paid") return { success: `Payment of ₱${(amountCents / 100).toFixed(2)} recorded for ${billingMonthLabel(billingMonth)} — fully paid.` };
  if (status === "partial") {
    const balance = dueCents - amountCents;
    return { success: `Partial payment of ₱${(amountCents / 100).toFixed(2)} recorded — ₱${(balance / 100).toFixed(2)} balance remaining.` };
  }
  return { success: `Bill for ${billingMonthLabel(billingMonth)} updated.` };
}

/** Admin: removes a single contribution record (corrections only). */
export async function deleteContributionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = text(formData, "contributionId");
  if (!UUID_PATTERN.test(id)) return;
  await db.delete(monthlyContributions).where(eq(monthlyContributions.id, id));
  revalidateContributionPaths();
}

export { DEFAULT_DUES_DUE_DAY, DEFAULT_MONTHLY_DUES_CENTS };

