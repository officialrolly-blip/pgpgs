import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { contributionSettings } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ContributionSettingsForms from "@/components/admin/contribution-settings-forms";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_DUES_DUE_DAY,
  DEFAULT_MONTHLY_DUES_CENTS,
  billingMonthLabel,
  currentBillingMonth,
  formatCentavos,
} from "@/lib/contributions";
import ContributionLedgerSection from "./ledger-section";

export const metadata: Metadata = { title: "Monthly Contributions" };


const FILTERS = ["all", "unpaid", "partial", "paid", "waived"] as const;
export type ContributionFilter = (typeof FILTERS)[number];

export default async function AdminContributionsPage(props: {
  searchParams: Promise<{ q?: string; month?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await props.searchParams;
  const q = params.q?.trim() ?? "";
  const rawMonth = params.month ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentBillingMonth();
  const rawStatus = params.status ?? "all";
  const status: ContributionFilter = FILTERS.includes(rawStatus as ContributionFilter)
    ? (rawStatus as ContributionFilter) : "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  let amount = DEFAULT_MONTHLY_DUES_CENTS;
  let dueDay = DEFAULT_DUES_DUE_DAY;
  let ready = true;
  try {
    const [s] = await db.select().from(contributionSettings).limit(1);
    if (s) { amount = s.monthlyAmountCents; dueDay = s.dueDay; }
    // Probe: fails until the 0018 migration has been applied.
    await db.execute(`select 1 from monthly_contributions limit 1`);
  } catch { ready = false; }
  return (
    <>
      <PageHeading
        title="Monthly Contributions"
        description={`Chapter dues ledger — ${formatCentavos(amount)} per member, due every ${dueDay}${sfx(dueDay)} of the month. Showing ${billingMonthLabel(month)}.`}
        actions={
          <>
            <Link href="/admin/contributions/receipts" className="a-btn a-btn-secondary">Receipts &amp; arrears →</Link>
            {ready ? (
              <Link
                href={`/admin/contributions/record-payment?month=${encodeURIComponent(month)}`}
                className="a-btn a-btn-gold"
              >
                + Record a payment
              </Link>
            ) : null}
          </>
        }
      />
      {!ready ? <MigrationNotice /> : null}
      <SummaryRow month={month} ready={ready} />
      <div className="mt-5 space-y-5">
        <ContributionLedgerSection month={month} q={q} status={status} page={page} ready={ready} />
        {ready ? <ContributionSettingsForms monthlyAmountCents={amount} dueDay={dueDay} currentMonth={month} /> : null}
      </div>
    </>
  );
}

function MigrationNotice() {
  return (
    <section className="a-card border-a-warning/40 bg-a-warning-soft/50 p-5" role="alert">
      <h2 className="text-sm font-bold text-a-warning">Database migration needed</h2>
      <p className="mt-1 text-sm text-a-secondary">
        Run <code className="font-mono text-xs">npm run db:migrate-contributions</code> once, then reload.
      </p>
    </section>
  );
}

async function SummaryRow({ month, ready }: { month: string; ready: boolean }) {
  let billed = 0, paid = 0, partial = 0, unpaid = 0, waived = 0;
  let collected = 0, expected = 0;
  if (ready) {
    try {
      const r = await db.execute<{ a: number; b: number; c: number; d: number; e: number; f: number; g: number }>(
        `select count(*)::int as a, count(*) filter (where status='paid')::int as b, count(*) filter (where status='partial')::int as c, count(*) filter (where status='unpaid')::int as d, count(*) filter (where status='waived')::int as e, coalesce(sum(amount_paid_cents),0)::int as f, coalesce(sum(amount_due_cents),0)::int as g from monthly_contributions where billing_month='${month}'`,
      );
      const row = r.rows[0];
      if (row) { billed = row.a; paid = row.b; partial = row.c; unpaid = row.d; waived = row.e; collected = row.f; expected = row.g; }
    } catch { /* show zeros */ }
  }
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  return (
    <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Collection overview">
      <Sum label="Collected" value={formatCentavos(collected)} detail={`${rate}% of ${formatCentavos(expected)} expected`} hot={false} />
      <Sum label="Fully paid" value={String(paid)} detail={`${billed} bills generated`} hot={false} />
      <Sum label="Partial / unpaid" value={String(partial + unpaid)} detail={`${partial} partial · ${unpaid} unpaid`} hot={partial + unpaid > 0} />
      <Sum label="Waived" value={String(waived)} detail="Excused for this month" hot={false} />
    </section>
  );
}

function Sum(p: { label: string; value: string; detail: string; hot: boolean }) {
  return (
    <div className={`a-card border p-5 ${p.hot ? "border-a-warning/30 bg-a-warning-soft/60" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-a-muted">{p.label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-a-text">{p.value}</p>
      <p className="mt-0.5 text-xs text-a-muted">{p.detail}</p>
    </div>
  );
}

function sfx(day: number): string {
  if (day === 1 || day === 21) return "st";
  if (day === 2 || day === 22) return "nd";
  if (day === 3 || day === 23) return "rd";
  return "th";
}
