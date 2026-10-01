import type { Metadata } from "next";
import Link from "next/link";
import PageHeading from "@/components/admin/page-heading";
import { requireAdmin } from "@/lib/auth";
import { getMemberStatement } from "@/lib/contribution-service";
import { billingMonthLabel, currentBillingMonth, formatCentavos } from "@/lib/contributions";

export const metadata: Metadata = { title: "Receipts & Arrears" };

export default async function ContributionReceiptsPage(p: {
  searchParams: Promise<{ member?: string; month?: string }>;
}) {
  await requireAdmin();
  const sp = await p.searchParams;
  const memberParam = (sp.member ?? "").trim();
  const rawMonth = (sp.month ?? "").trim();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentBillingMonth();
  return (
    <>
      <PageHeading
        title="Receipts & Arrears"
        description="Look up a member to print a receipt or review arrears."
        actions={<Link href="/admin/contributions" className="a-btn a-btn-secondary">Back</Link>}
      />
      <LookupForm memberParam={memberParam} month={month} />
      {memberParam ? <MemberStatement memberParam={memberParam} month={month} /> : null}
    </>
  );
}

function LookupForm(p: { memberParam: string; month: string }) {
  return (
    <section className="a-card p-5 sm:p-6" aria-labelledby="lookup-heading">
      <h2 id="lookup-heading" className="a-card-title">Find a receipt</h2>
      <form action="/admin/contributions/receipts" method="get" className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <input type="search" name="member" defaultValue={p.memberParam} placeholder="Paste member record ID from the ledger…" className="a-input font-mono text-xs" aria-label="Member record ID" autoComplete="off" />
        <input type="month" name="month" defaultValue={p.month} className="a-input" aria-label="Billing month" />
        <button type="submit" className="a-btn a-btn-primary">Open</button>
      </form>
      <p className="mt-3 text-xs leading-5 text-a-muted">Tip: open any row in the dues ledger and click Receipt — the link fills in the member automatically.</p>
    </section>
  );
}

async function MemberStatement(p: { memberParam: string; month: string }) {
  const statement = await getMemberStatement(p.memberParam, p.month);
  if (statement.migrationNeeded) {
    return (
      <section className="a-card mt-5 border-a-warning/40 bg-a-warning-soft/50 p-5" role="alert">
        <p className="text-sm text-a-secondary">Run <code className="font-mono text-xs">npm run db:migrate-contributions</code> once, then reload.</p>
      </section>
    );
  }
  if (!statement.member) {
    return (
      <section className="a-card mt-5 p-5" role="status">
        <p className="text-sm text-a-muted">No member found for that reference. Copy the Receipt link from the ledger row instead.</p>
      </section>
    );
  }
  const { member, bill, arrears, owedCents: owed, lifetimeCents: lifetime } = statement;
  const name = member.name;
  return (
    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="a-card overflow-hidden" aria-labelledby="receipt-heading">
        <header className="border-b border-a-border bg-[var(--a-bg)] px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-a-muted">Official dues receipt</p>
          <h2 id="receipt-heading" className="a-card-title mt-1">{billingMonthLabel(p.month)} · {name}</h2>
        </header>
        <div className="px-5 py-5 sm:px-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <F label="Member" value={`${name} · ${member.memberId}`} />
            <F label="Chapter" value={member.chapter || "—"} />
            <F label="Amount due" value={bill ? formatCentavos(bill.amountDueCents) : "No bill generated"} />
            <F label="Amount paid" value={bill ? formatCentavos(bill.amountPaidCents) : "—"} />
            <F label="Status" value={bill ? bill.status.toUpperCase() : "NO BILL"} />
            <F label="Receipt date" value={bill?.paidAt ? bill.paidAt.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
          </dl>
          <div className="mt-6 flex items-center justify-between border-t border-dashed border-a-border pt-5">
            <p className="text-xs text-a-muted">PGPGS Roxas City Chapter</p>
            <p className="font-mono text-xs text-a-muted">{member.memberId}-{p.month}</p>
          </div>
        </div>
      </section>
      <section className="a-card border border-a-warning/30 bg-a-warning-soft/40 p-5" aria-labelledby="arrears-heading">
        <h2 id="arrears-heading" className="text-sm font-bold text-a-warning">Arrears through {billingMonthLabel(p.month)}</h2>
        <p className="mt-1 text-2xl font-bold text-a-text">{formatCentavos(owed)}</p>
        <p className="mt-0.5 text-xs text-a-muted">{arrears.length} unpaid months · {formatCentavos(lifetime)} paid lifetime</p>
      </section>
    </div>
  );
}

function F(p: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">{p.label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-a-text">{p.value}</dd>
    </div>
  );
}