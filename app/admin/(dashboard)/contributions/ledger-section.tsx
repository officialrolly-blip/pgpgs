import Link from "next/link";
import { billingMonthLabel, formatCentavos } from "@/lib/contributions";
import { listContributions, type LedgerRow } from "@/lib/contribution-service";

import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { deleteContributionAction } from "@/lib/actions/contribution-actions";
import type { ContributionFilter } from "./page";

type Props = { month: string; q: string; status: ContributionFilter; page: number; ready: boolean; chapterScope?: string | null; canDelete?: boolean };

type Row = LedgerRow;

const FILTERS: ContributionFilter[] = ["all", "unpaid", "partial", "paid", "waived"];

function badge(status: string): string {
  if (status === "paid") return "a-badge-green";
  if (status === "partial") return "a-badge-amber";
  if (status === "waived") return "a-badge-gray";
  return "a-badge-gold";
}

export default async function ContributionLedgerSection(p: Props) {
  const href = (s: ContributionFilter, pg: number) => {
    const query = new URLSearchParams();
    if (p.q) query.set("q", p.q);
    if (s !== "all") query.set("status", s);
    if (pg > 1) query.set("page", String(pg));
    const qs = query.toString();
    return qs ? `/admin/contributions?${qs}` : "/admin/contributions";
  };
  let rows: Row[] = [];
  let total = 0;
  let cur = 1;
  let pages = 1;
  if (p.ready) {
    const result = await listContributions({
      month: p.month,
      q: p.q,
      status: p.status,
      page: p.page,
      chapterScope: p.chapterScope ?? null,
    });
    rows = result.rows;
    total = result.total;
    cur = result.page;
    pages = result.pages;
  }
  return <LedgerView rows={rows} total={total} cur={cur} pages={pages} p={p} href={href} />;
}

function LedgerView(p2: {
  rows: Row[]; total: number; cur: number; pages: number; p: Props;
  href: (s: ContributionFilter, pg: number) => string;
}) {
  const { rows, total, cur, pages, p, href } = p2;
  return (
    <section className="a-card overflow-hidden" aria-labelledby="ledger-heading">
      <header className="flex flex-col gap-4 border-b border-a-border px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-a-muted">Dues ledger</p>
          <h2 id="ledger-heading" className="a-card-title mt-1">{billingMonthLabel(p.month)}</h2>
        </div>
        <form action="/admin/contributions" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="month" name="month" defaultValue={p.month} className="a-input sm:w-44" aria-label="Billing month" />
          <input type="search" name="q" defaultValue={p.q} placeholder="Search member or ID…" className="a-input sm:w-52" aria-label="Search member" autoComplete="off" />
          {p.status !== "all" ? <input type="hidden" name="status" value={p.status} /> : null}
          <button type="submit" className="a-btn a-btn-secondary a-btn-sm">Filter</button>
        </form>
      </header>
      <div className="flex flex-wrap gap-2 border-b border-a-border-soft px-5 py-3 sm:px-6" role="group" aria-label="Filter by payment status">
        {FILTERS.map((value) => (
          <Link key={value} href={href(value, 1)} className={`a-badge capitalize ${p.status === value ? "a-badge-green" : "a-badge-gray a-badge-plain"}`}>
            {value}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="text-sm text-a-muted">No bills found for this filter.</p>
          <p className="mt-1 text-xs text-a-muted/80">Generate bills for {billingMonthLabel(p.month)} to start collecting.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="a-table min-w-[760px]">
            <thead>
              <tr>
                <th className="a-th">Member</th>
                <th className="a-th">Due</th>
                <th className="a-th">Paid</th>
                <th className="a-th">Status</th>
                <th className="a-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="a-td">
                    <Link href={`/admin/members/${row.memberPk}`} className="group block min-w-0">
                      <span className="block truncate font-semibold text-a-text transition group-hover:text-a-brand">
                        {row.firstName}{row.middleInitial ? ` ${row.middleInitial}.` : ""} {row.lastName}
                      </span>
                      <span className="block truncate font-mono text-xs text-a-muted">{row.memberId}</span>
                    </Link>
                  </td>
                  <td className="a-td font-semibold tabular-nums text-a-text">{formatCentavos(row.amountDueCents)}</td>
                  <td className="a-td tabular-nums text-a-secondary">{formatCentavos(row.amountPaidCents)}</td>
                  <td className="a-td"><span className={`a-badge ${badge(row.status)}`}>{row.status}</span></td>
                  <td className="a-td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/contributions/receipts?member=${row.memberPk}`} className="a-btn a-btn-secondary a-btn-sm">Receipt</Link>
                      {p.canDelete === false ? null : (
                        <form action={deleteContributionAction}>
                          <input type="hidden" name="contributionId" value={row.id} />
                          <ConfirmSubmitButton message="Delete this dues record?" className="a-btn a-btn-danger a-btn-sm">Delete</ConfirmSubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav className="flex items-center justify-between px-5 py-4 text-sm sm:px-6" aria-label="Contributions pagination">
          {cur > 1 ? <Link href={href(p.status, cur - 1)} className="a-btn a-btn-secondary a-btn-sm">← Previous</Link> : <span />}
          <span className="text-xs text-a-muted">Page {cur} of {pages} · {total} bills</span>
          {cur < pages ? <Link href={href(p.status, cur + 1)} className="a-btn a-btn-secondary a-btn-sm">Next →</Link> : <span />}
        </nav>
      ) : null}
    </section>
  );
}


