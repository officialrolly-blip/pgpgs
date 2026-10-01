// Shared business logic for the monthly-dues ledger — one source of truth for
// the admin dashboard (server actions + pages) and the REST API v1 routes.
//
// Mutations call revalidateContributionPaths() themselves so every caller
// (server action or route handler) gets the same cache invalidation.
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { contributionSettings, monthlyContributions, pgpmembers } from "@/db/schema";
import {
  CONTRIBUTION_PAYMENT_METHODS,
  DEFAULT_DUES_DUE_DAY,
  DEFAULT_MONTHLY_DUES_CENTS,
  billingMonthLabel,
  currentBillingMonth,
} from "@/lib/contributions";

export const BILLING_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ContributionFilter = "all" | "unpaid" | "partial" | "paid" | "waived";

/** Result shared by mutations; `status` is an HTTP hint for API callers. */
export type ContributionResult = {
  error?: string;
  status?: number;
  success?: string;
  created?: number;
  bill?: {
    memberPk: string;
    billingMonth: string;
    amountDueCents: number;
    amountPaidCents: number;
    status: string;
  };
};

function revalidateContributionPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/contributions");
  revalidatePath("/admin/members");
  revalidatePath("/member-id");
}

/** Parses a pesos amount (number or "1,200.50" string) into integer centavos. */
export function pesosToCents(value: unknown): number {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  const pesos = Number(raw);
  if (!Number.isFinite(pesos) || pesos < 0) return Number.NaN;
  return Math.round(pesos * 100);
}

function dueDaySuffix(day: number): string {
  if (day === 1 || day === 21) return "st";
  if (day === 2 || day === 22) return "nd";
  if (day === 3 || day === 23) return "rd";
  return "th";
}

function resolveRecordedStatus(
  amountDueCents: number,
  amountPaidCents: number,
): "unpaid" | "partial" | "paid" {
  if (amountPaidCents <= 0) return "unpaid";
  if (amountPaidCents >= amountDueCents) return "paid";
  return "partial";
}

// --- Reads ------------------------------------------------------------------

/** Current dues settings plus whether the 0018 migration has been applied. */
export async function getContributionSettings(): Promise<{
  amountCents: number;
  dueDay: number;
  ready: boolean;
}> {
  let amountCents = DEFAULT_MONTHLY_DUES_CENTS;
  let dueDay = DEFAULT_DUES_DUE_DAY;
  let ready = true;
  try {
    const [s] = await db.select().from(contributionSettings).limit(1);
    if (s) { amountCents = s.monthlyAmountCents; dueDay = s.dueDay; }
    // Probe: fails until the 0018 migration has been applied.
    await db.execute(`select 1 from monthly_contributions limit 1`);
  } catch { ready = false; }
  return { amountCents, dueDay, ready };
}

export type LedgerRow = {
  id: string;
  memberPk: string;
  billingMonth: string;
  amountDueCents: number;
  amountPaidCents: number;
  status: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  note: string | null;
  paidAt: Date | null;
  recordedBy: string | null;
  memberId: string;
  firstName: string;
  middleInitial: string | null;
  lastName: string;
};

/** One page of the dues ledger for a billing month (search + status filter). */
export async function listContributions(p: {
  month: string;
  q?: string;
  status?: ContributionFilter;
  page?: number;
  perPage?: number;
}): Promise<{
  rows: LedgerRow[];
  total: number;
  page: number;
  pages: number;
  perPage: number;
  ready: boolean;
}> {
  const perPage = Math.min(Math.max(Math.trunc(p.perPage ?? 20) || 20, 1), 100);
  try {
    const conds = [eq(monthlyContributions.billingMonth, p.month)];
    if (p.status && p.status !== "all") conds.push(eq(monthlyContributions.status, p.status));
    const q = p.q?.trim();
    if (q) {
      const pat = `%${q}%`;
      const m = or(
        ilike(pgpmembers.firstName, pat),
        ilike(pgpmembers.lastName, pat),
        ilike(pgpmembers.memberId, pat),
      );
      if (m) conds.push(m);
    }
    const where = and(...conds);
    const [c] = await db.select({ value: count() }).from(monthlyContributions)
      .innerJoin(pgpmembers, eq(monthlyContributions.memberPk, pgpmembers.id)).where(where);
    const total = Number(c?.value ?? 0);
    const pages = Math.max(1, Math.ceil(total / perPage));
    const page = Math.min(Math.max(Math.trunc(p.page ?? 1) || 1, 1), pages);
    const rows = await db.select({
      id: monthlyContributions.id,
      memberPk: monthlyContributions.memberPk,
      billingMonth: monthlyContributions.billingMonth,
      amountDueCents: monthlyContributions.amountDueCents,
      amountPaidCents: monthlyContributions.amountPaidCents,
      status: monthlyContributions.status,
      paymentMethod: monthlyContributions.paymentMethod,
      referenceNumber: monthlyContributions.referenceNumber,
      note: monthlyContributions.note,
      paidAt: monthlyContributions.paidAt,
      recordedBy: monthlyContributions.recordedBy,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
    }).from(monthlyContributions)
      .innerJoin(pgpmembers, eq(monthlyContributions.memberPk, pgpmembers.id))
      .where(where).orderBy(desc(monthlyContributions.updatedAt))
      .limit(perPage).offset((page - 1) * perPage);
    return { rows, total, page, pages, perPage, ready: true };
  } catch {
    return { rows: [], total: 0, page: 1, pages: 1, perPage, ready: false };
  }
}

export type MonthSummary = {
  billed: number;
  paid: number;
  partial: number;
  unpaid: number;
  waived: number;
  collectedCents: number;
  expectedCents: number;
  ready: boolean;
};

/** Collection overview for one billing month (zeros when unavailable). */
export async function getMonthSummary(month: string): Promise<MonthSummary> {
  try {
    const r = await db.execute<{ a: number; b: number; c: number; d: number; e: number; f: number; g: number }>(
      `select count(*)::int as a, count(*) filter (where status='paid')::int as b, count(*) filter (where status='partial')::int as c, count(*) filter (where status='unpaid')::int as d, count(*) filter (where status='waived')::int as e, coalesce(sum(amount_paid_cents),0)::int as f, coalesce(sum(amount_due_cents),0)::int as g from monthly_contributions where billing_month='${month}'`,
    );
    const row = r.rows[0];
    if (!row) {
      return { billed: 0, paid: 0, partial: 0, unpaid: 0, waived: 0, collectedCents: 0, expectedCents: 0, ready: true };
    }
    return {
      billed: row.a, paid: row.b, partial: row.c, unpaid: row.d, waived: row.e,
      collectedCents: row.f, expectedCents: row.g, ready: true,
    };
  } catch {
    return { billed: 0, paid: 0, partial: 0, unpaid: 0, waived: 0, collectedCents: 0, expectedCents: 0, ready: false };
  }
}

export type StatementBill = {
  billingMonth: string;
  amountDueCents: number;
  amountPaidCents: number;
  status: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  paidAt: Date | null;
  recordedBy: string | null;
};

export type MemberStatement =
  | { migrationNeeded: true }
  | { migrationNeeded: false; member: null }
  | {
      migrationNeeded: false;
      member: {
        id: string;
        memberId: string;
        name: string;
        chapter: string | null;
      };
      bills: StatementBill[];
      bill: StatementBill | null;
      arrears: StatementBill[];
      owedCents: number;
      lifetimeCents: number;
    };

/** Receipt + arrears snapshot for one member through a billing month. */
export async function getMemberStatement(
  memberParam: string,
  month: string,
): Promise<MemberStatement> {
  if (!UUID_PATTERN.test(memberParam)) {
    return { migrationNeeded: false, member: null };
  }
  try {
    const [m] = await db.select({
      id: pgpmembers.id, memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName, middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName, chapter: pgpmembers.memberChapter,
    }).from(pgpmembers).where(eq(pgpmembers.id, memberParam)).limit(1);
    if (!m) return { migrationNeeded: false, member: null };

    const bills = await db.select({
      billingMonth: monthlyContributions.billingMonth,
      amountDueCents: monthlyContributions.amountDueCents,
      amountPaidCents: monthlyContributions.amountPaidCents,
      status: monthlyContributions.status,
      paymentMethod: monthlyContributions.paymentMethod,
      referenceNumber: monthlyContributions.referenceNumber,
      paidAt: monthlyContributions.paidAt,
      recordedBy: monthlyContributions.recordedBy,
    }).from(monthlyContributions).where(eq(monthlyContributions.memberPk, m.id));

    const name = `${m.firstName}${m.middleInitial ? ` ${m.middleInitial}.` : ""} ${m.lastName}`;
    const bill = bills.find((b) => b.billingMonth === month) ?? null;
    const arrears = bills.filter(
      (b) => (b.status === "unpaid" || b.status === "partial") && b.billingMonth <= month,
    );
    const owedCents = arrears.reduce((s, b) => s + Math.max(0, b.amountDueCents - b.amountPaidCents), 0);
    const lifetimeCents = bills.filter((b) => b.status === "paid").reduce((s, b) => s + b.amountPaidCents, 0);
    return {
      migrationNeeded: false,
      member: { id: m.id, memberId: m.memberId, name, chapter: m.chapter },
      bills, bill, arrears, owedCents, lifetimeCents,
    };
  } catch {
    return { migrationNeeded: true };
  }
}

/** A member's own dues bills, newest first (empty list when unavailable). */
export async function getMemberOwnBills(
  memberPk: string,
  limit = 12,
): Promise<{ bills: StatementBill[] }> {
  try {
    const bills = await db.select({
      billingMonth: monthlyContributions.billingMonth,
      amountDueCents: monthlyContributions.amountDueCents,
      amountPaidCents: monthlyContributions.amountPaidCents,
      status: monthlyContributions.status,
      paymentMethod: monthlyContributions.paymentMethod,
      referenceNumber: monthlyContributions.referenceNumber,
      paidAt: monthlyContributions.paidAt,
      recordedBy: monthlyContributions.recordedBy,
    }).from(monthlyContributions)
      .where(eq(monthlyContributions.memberPk, memberPk))
      .orderBy(desc(monthlyContributions.billingMonth))
      .limit(Math.min(Math.max(Math.trunc(limit) || 12, 1), 24));
    return { bills };
  } catch {
    return { bills: [] };
  }
}

export type ContributionRecord = {
  id: string;
  memberPk: string;
  billingMonth: string;
  amountDueCents: number;
  amountPaidCents: number;
  status: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  note: string | null;
  paidAt: Date | null;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  member: {
    memberId: string;
    firstName: string;
    middleInitial: string | null;
    lastName: string;
  };
};

/** One contribution record (with member identity) by id. */
export async function getContributionById(id: string): Promise<
  { migrationNeeded: true } | { migrationNeeded: false; record: ContributionRecord | null }
> {
  if (!UUID_PATTERN.test(id)) {
    return { migrationNeeded: false, record: null };
  }
  try {
    const [row] = await db.select({
      id: monthlyContributions.id,
      memberPk: monthlyContributions.memberPk,
      billingMonth: monthlyContributions.billingMonth,
      amountDueCents: monthlyContributions.amountDueCents,
      amountPaidCents: monthlyContributions.amountPaidCents,
      status: monthlyContributions.status,
      paymentMethod: monthlyContributions.paymentMethod,
      referenceNumber: monthlyContributions.referenceNumber,
      note: monthlyContributions.note,
      paidAt: monthlyContributions.paidAt,
      recordedBy: monthlyContributions.recordedBy,
      createdAt: monthlyContributions.createdAt,
      updatedAt: monthlyContributions.updatedAt,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
    }).from(monthlyContributions)
      .innerJoin(pgpmembers, eq(monthlyContributions.memberPk, pgpmembers.id))
      .where(eq(monthlyContributions.id, id))
      .limit(1);
    if (!row) return { migrationNeeded: false, record: null };
    const { memberId, firstName, middleInitial, lastName, ...record } = row;
    return {
      migrationNeeded: false,
      record: { ...record, member: { memberId, firstName, middleInitial, lastName } },
    };
  } catch {
    return { migrationNeeded: true };
  }
}

// --- Mutations --------------------------------------------------------------

/** Changes the chapter-wide monthly dues amount and due day. */
export async function updateContributionSettings(
  input: { monthlyAmountCents: number; dueDay: number },
  updatedBy: string,
): Promise<ContributionResult> {
  const { monthlyAmountCents: amountCents, dueDay } = input;

  if (!Number.isFinite(amountCents) || amountCents < 0 || amountCents > 10000000) {
    return { error: "Enter a valid monthly amount between ₱0 and ₱100,000.", status: 400 };
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
    return { error: "Due day must be between 1 and 28.", status: 400 };
  }

  await db
    .insert(contributionSettings)
    .values({ id: 1, monthlyAmountCents: amountCents, dueDay, updatedBy })
    .onConflictDoUpdate({
      target: contributionSettings.id,
      set: { monthlyAmountCents: amountCents, dueDay, updatedAt: new Date(), updatedBy },
    });

  revalidateContributionPaths();
  return { success: `Monthly dues updated to ₱${(amountCents / 100).toFixed(2)}, due every ${dueDay}${dueDaySuffix(dueDay)} of the month.` };
}

/**
 * Generates one bill per active directory member for a billing month.
 * Existing bills are never overwritten — reruns only fill in members that are
 * still missing a row.
 */
export async function generateMonthlyBills(billingMonth: string): Promise<ContributionResult> {
  const requested = billingMonth || currentBillingMonth();
  if (!BILLING_MONTH_PATTERN.test(requested)) {
    return { error: "Pick a valid billing month.", status: 400 };
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
    return { success: `${billingMonthLabel(requested)} bills are already complete — nothing new to generate.`, created: 0 };
  }
  return { success: `Generated ${createdCount} ${createdCount === 1 ? "bill" : "bills"} for ${billingMonthLabel(requested)}.`, created: createdCount };
}


/**
 * Records (or edits) a payment against a member's monthly bill. Supports full
 * payments, partial payments, waivers, and arrears catch-up for any past month.
 */
export async function recordContributionPayment(
  input: {
    memberPk: string;
    billingMonth: string;
    amountPaidCents: number;
    paymentMethod: string;
    referenceNumber: string;
    note: string;
    waived: boolean;
  },
  recordedBy: string,
): Promise<ContributionResult> {
  const { memberPk, amountPaidCents, paymentMethod, referenceNumber, note, waived } = input;
  const billingMonth = input.billingMonth || currentBillingMonth();

  if (!UUID_PATTERN.test(memberPk)) return { error: "Select a valid member.", status: 400 };
  if (!BILLING_MONTH_PATTERN.test(billingMonth)) return { error: "Pick a valid billing month.", status: 400 };
  if (!waived && (!Number.isFinite(amountPaidCents) || amountPaidCents < 0)) {
    return { error: "Enter a valid payment amount.", status: 400 };
  }
  if (paymentMethod && !CONTRIBUTION_PAYMENT_METHODS.includes(paymentMethod as (typeof CONTRIBUTION_PAYMENT_METHODS)[number])) {
    return { error: "Select a valid payment method.", status: 400 };
  }
  if (referenceNumber.length > 80) return { error: "Reference number must be 80 characters or fewer.", status: 400 };
  if (note.length > 500) return { error: "Note must be 500 characters or fewer.", status: 400 };

  const [member] = await db.select({ id: pgpmembers.id }).from(pgpmembers).where(eq(pgpmembers.id, memberPk)).limit(1);
  if (!member) return { error: "Member not found.", status: 404 };
  const [settings] = await db.select().from(contributionSettings).limit(1);
  const fallbackDue = settings?.monthlyAmountCents ?? DEFAULT_MONTHLY_DUES_CENTS;
  const [existing] = await db
    .select()
    .from(monthlyContributions)
    .where(and(eq(monthlyContributions.memberPk, memberPk), eq(monthlyContributions.billingMonth, billingMonth)))
    .limit(1);

  if (waived) {
    const payload = {
      memberPk, billingMonth,
      amountDueCents: existing?.amountDueCents ?? fallbackDue,
      amountPaidCents: 0, status: "waived" as const,
      paymentMethod: null, referenceNumber: referenceNumber || null,
      note: note || "Waived by treasurer", paidAt: null,
      recordedBy, updatedAt: new Date(),
    };
    if (existing) await db.update(monthlyContributions).set(payload).where(eq(monthlyContributions.id, existing.id));
    else await db.insert(monthlyContributions).values(payload);
    revalidateContributionPaths();
    return {
      success: `Bill for ${billingMonthLabel(billingMonth)} waived.`,
      bill: { memberPk, billingMonth, amountDueCents: payload.amountDueCents, amountPaidCents: 0, status: "waived" },
    };
  }

  const dueCents = existing?.amountDueCents ?? fallbackDue;
  const status = resolveRecordedStatus(dueCents, amountPaidCents);
  const payload = {
    memberPk, billingMonth, amountDueCents: dueCents, amountPaidCents, status,
    paymentMethod: paymentMethod || null, referenceNumber: referenceNumber || null, note: note || null,
    paidAt: status === "paid" ? new Date() : (existing?.paidAt ?? null),
    recordedBy, updatedAt: new Date(),
  };
  if (existing) await db.update(monthlyContributions).set(payload).where(eq(monthlyContributions.id, existing.id));
  else await db.insert(monthlyContributions).values(payload);
  revalidateContributionPaths();
  const bill = { memberPk, billingMonth, amountDueCents: dueCents, amountPaidCents, status };
  if (status === "paid") return { success: `Payment of ₱${(amountPaidCents / 100).toFixed(2)} recorded for ${billingMonthLabel(billingMonth)} — fully paid.`, bill };
  if (status === "partial") {
    const balance = dueCents - amountPaidCents;
    return { success: `Partial payment of ₱${(amountPaidCents / 100).toFixed(2)} recorded — ₱${(balance / 100).toFixed(2)} balance remaining.`, bill };
  }
  return { success: `Bill for ${billingMonthLabel(billingMonth)} updated.`, bill };
}

/** Removes a single contribution record (corrections only). */
export async function deleteContributionRecord(id: string): Promise<ContributionResult> {
  if (!UUID_PATTERN.test(id)) return { error: "Invalid contribution id.", status: 400 };
  try {
    const deleted = await db
      .delete(monthlyContributions)
      .where(eq(monthlyContributions.id, id))
      .returning({ id: monthlyContributions.id });
    revalidateContributionPaths();
    if (deleted.length === 0) {
      return { error: "Contribution record not found.", status: 404 };
    }
    return { success: "Contribution record deleted." };
  } catch {
    return { error: "Unable to delete that record right now.", status: 500 };
  }
}

