import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import NeophyteStatusControls from "@/components/admin/neophyte-status-controls";
import { requireAdmin } from "@/lib/auth";
import { NEOPHYTE_STATUSES, NEOPHYTE_STATUS_LABELS } from "@/lib/member-constants";

export const metadata: Metadata = { title: "Neophyte Status" };
const PAGE_SIZE = 12;
type NeophyteStatus = (typeof NEOPHYTE_STATUSES)[number];
type Neophyte = typeof pgpmembers.$inferSelect;

export default async function AdminNeophytesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; confirmed?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const selectedStatus = NEOPHYTE_STATUSES.includes(params.status as NeophyteStatus) ? (params.status as NeophyteStatus) : "all";
  const requestedPage = Math.max(1, Number(params.page ?? "1") || 1);
  const conditions = [eq(pgpmembers.status, "Neophyte")];
  if (selectedStatus !== "all") conditions.push(eq(pgpmembers.neophyteStatus, selectedStatus));
  if (q) {
    const pattern = `%${q}%`;
    const searchCondition = or(
      ilike(pgpmembers.firstName, pattern),
      ilike(pgpmembers.lastName, pattern),
      ilike(pgpmembers.email, pattern),
      ilike(pgpmembers.memberId, pattern),
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  const where = and(...conditions);

  const [countRows, statusRows] = await Promise.all([
    db.select({ value: count() }).from(pgpmembers).where(where),
    db.select({ status: pgpmembers.neophyteStatus, value: count() }).from(pgpmembers).where(eq(pgpmembers.status, "Neophyte")).groupBy(pgpmembers.neophyteStatus),
  ]);
  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const neophytes = await db
    .select()
    .from(pgpmembers)
    .where(where)
    .orderBy(desc(pgpmembers.neophyteStatusUpdatedAt), desc(pgpmembers.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);
  const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status ?? "orientation", Number(row.value)]));

  const buildHref = (status: string = selectedStatus, page = 1) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status !== "all") query.set("status", status);
    if (page > 1) query.set("page", String(page));
    const value = query.toString();
    return value ? `/admin/neophytes?${value}` : "/admin/neophytes";
  };

  return (
    <>
      <PageHeading title="Neophyte’s Status" description="Guide approved applicants through formation, issue certification, and confirm their transition into the member directory." actions={<Link href="/admin/members" className="a-btn a-btn-secondary">Open member directory →</Link>} />

      {params.confirmed ? <p className="a-card mb-5 border-[#a6f4c5] bg-a-success-soft px-4 py-3 text-sm font-medium text-a-success">The neophyte was confirmed and moved to the member directory.</p> : null}

      <section className="a-card mb-5 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4 sm:divide-x divide-a-border-soft" aria-label="Neophyte formation progress">
        {NEOPHYTE_STATUSES.map((status) => <Link key={status} href={buildHref(status)} className={`p-4 transition hover:bg-[var(--a-bg)] ${selectedStatus === status ? "!bg-a-brand-soft ring-2 ring-inset ring-a-brand" : ""}`}><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-a-muted">{NEOPHYTE_STATUS_LABELS[status]}</p><p className="mt-1 text-2xl font-bold text-a-text">{statusCounts[status] ?? 0}</p><p className="mt-0.5 text-xs text-a-muted">{status === "passed_member" ? "Ready for certification" : "In this stage"}</p></Link>)}
      </section>

      <form action="/admin/neophytes" method="get" className="a-card mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:items-center"><input type="search" name="q" defaultValue={q} placeholder="Search name, email, or member ID…" className="a-input min-w-0 flex-1" /><select name="status" defaultValue={selectedStatus} className="a-select sm:w-48"><option value="all">All formation stages</option>{NEOPHYTE_STATUSES.map((status) => <option key={status} value={status}>{NEOPHYTE_STATUS_LABELS[status]}</option>)}</select><button type="submit" className="a-btn a-btn-primary">Filter</button></form>

      <div className="mb-3 flex items-center justify-between text-sm"><p className="text-a-muted"><span className="font-semibold text-a-text">{total}</span> neophyte{total === 1 ? "" : "s"}</p>{q || selectedStatus !== "all" ? <Link href="/admin/neophytes" className="text-xs font-semibold text-a-brand transition hover:text-a-brand-dark">Clear filters</Link> : null}</div>

      {neophytes.length === 0 ? <div className="a-card px-5 py-14 text-center"><p className="text-sm text-a-muted">No neophytes match your filters.</p><p className="mt-1 text-xs text-a-muted/80">Approved applications will appear here at Orientation.</p></div> : <div className="space-y-3">{neophytes.map((neophyte) => <NeophyteCard key={neophyte.id} neophyte={neophyte} />)}</div>}

      {totalPages > 1 ? <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Neophyte pagination">{currentPage > 1 ? <Link href={buildHref(selectedStatus, currentPage - 1)} className="a-btn a-btn-secondary a-btn-sm">← Previous</Link> : <span />}{<span className="text-a-muted">Page {currentPage} of {totalPages}</span>}{currentPage < totalPages ? <Link href={buildHref(selectedStatus, currentPage + 1)} className="a-btn a-btn-secondary a-btn-sm">Next →</Link> : <span />}</nav> : null}
    </>
  );
}

function NeophyteCard({ neophyte }: { neophyte: Neophyte }) {
  const currentStatus = NEOPHYTE_STATUSES.includes(neophyte.neophyteStatus as NeophyteStatus) ? (neophyte.neophyteStatus as NeophyteStatus) : "orientation";
  return <article className="a-card overflow-hidden"><header className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-a-text">{personName(neophyte)}</h2><span className="a-badge a-badge-amber">{NEOPHYTE_STATUS_LABELS[currentStatus]}</span></div><p className="mt-1 text-xs text-a-muted">{neophyte.memberId} · {neophyte.email} · {neophyte.contactNumber}</p></div><p className="text-xs text-a-muted">Added {formatDate(neophyte.createdAt)}</p></header><details className="group border-t border-a-border-soft"><summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold text-a-brand transition hover:text-a-brand-dark sm:px-6"><span className="mr-2 inline-block transition group-open:rotate-90">›</span> View complete personal details</summary><dl className="grid gap-x-8 gap-y-4 border-t border-a-border-soft bg-[var(--a-bg)] px-5 py-5 sm:grid-cols-2 lg:grid-cols-3 sm:px-6"><Detail label="Age" value={String(neophyte.age)} /><Detail label="Date of birth" value={neophyte.dateOfBirth} /><Detail label="Place of birth" value={neophyte.placeOfBirth} /><Detail label="Address" value={`${neophyte.street}, ${neophyte.barangay}, ${neophyte.municipality}, ${neophyte.province}`} /><Detail label="Guardian" value={`${neophyte.guardianName} (${neophyte.guardianContact})`} /><Detail label="Guardian address" value={neophyte.guardianAddress} /><Detail label="Baptized name" value={neophyte.baptizedName} /><Detail label="Application record" value={`Created ${formatDate(neophyte.createdAt)}`} /><Detail label="Last stage update" value={neophyte.neophyteStatusUpdatedAt ? `${formatDate(neophyte.neophyteStatusUpdatedAt)}${neophyte.neophyteStatusUpdatedBy ? ` by ${neophyte.neophyteStatusUpdatedBy}` : ""}` : "—"} /></dl></details><NeophyteStatusControls neophyteId={neophyte.id} currentStatus={currentStatus} certificationIssuedAt={neophyte.neophyteCertificationIssuedAt?.toISOString() ?? null} /></article>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">{label}</dt><dd className="mt-0.5 text-sm text-a-secondary">{value}</dd></div>; }
function personName(person: { firstName: string; middleInitial: string | null; lastName: string }) { return `${person.firstName}${person.middleInitial ? ` ${person.middleInitial}.` : ""} ${person.lastName}`; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }); }
