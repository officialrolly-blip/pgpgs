import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import NeophyteStatusControls from "@/components/admin/neophyte-status-controls";
import { requireAdmin } from "@/lib/auth";
import { NEOPHYTE_STATUSES, NEOPHYTE_STATUS_LABELS } from "@/lib/member-constants";

export const metadata: Metadata = { title: "Neophyte Status" };
const PAGE_SIZE = 12;
type NeophyteStatus = (typeof NEOPHYTE_STATUSES)[number];
type Neophyte = typeof pgpmembers.$inferSelect;

const stageTiles: Record<NeophyteStatus, string> = {
  orientation: "bg-a-info-soft text-a-info",
  baptism: "bg-a-warning-soft text-a-warning",
  baptism_confirmed: "bg-a-gold-soft text-[#8a6d10]",
  passed_member: "bg-a-success-soft text-a-success",
};

const stageBars: Record<NeophyteStatus, string> = {
  orientation: "bg-a-info",
  baptism: "bg-a-warning",
  baptism_confirmed: "bg-a-gold",
  passed_member: "bg-a-success",
};

const stageBadges: Record<NeophyteStatus, string> = {
  orientation: "a-badge-blue",
  baptism: "a-badge-amber",
  baptism_confirmed: "a-badge-gold",
  passed_member: "a-badge-green",
};

const stageIcons: Record<NeophyteStatus, string> = {
  orientation: "M4 21V4h12l-2 4 2 4H4",
  baptism: "M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z",
  baptism_confirmed: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 4.5-5",
  passed_member: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11l2 2 4-4",
};

const stageBlurbs: Record<NeophyteStatus, string> = {
  orientation: "Newly approved applicants",
  baptism: "Baptism in progress",
  baptism_confirmed: "Baptism confirmed",
  passed_member: "Ready for certification",
};

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

  const [countRows, statusRows, formationRows] = await Promise.all([
    db.select({ value: count() }).from(pgpmembers).where(where),
    db.select({ status: pgpmembers.neophyteStatus, value: count() }).from(pgpmembers).where(eq(pgpmembers.status, "Neophyte")).groupBy(pgpmembers.neophyteStatus),
    db.execute<{ passed: number; certified: number }>(
      `select
         count(*) filter (where neophyte_status = 'passed_member')::int as passed,
         count(*) filter (where neophyte_status = 'passed_member' and neophyte_certification_issued_at is not null)::int as certified
       from pgpmembers
       where status = 'Neophyte'`,
    ),
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
  const totalInFormation = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);
  const passedCount = Number(formationRows.rows[0]?.passed ?? 0);
  const certifiedCount = Number(formationRows.rows[0]?.certified ?? 0);
  const awaitingCertification = Math.max(0, passedCount - certifiedCount);

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
      {/* Executive banner */}
      <section
        className="relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f3d26_0%,#1b5c38_58%,#14532d_100%)] p-6 text-white shadow-[var(--a-shadow-md)] sm:p-7"
        aria-label="Formation summary"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[rgba(201,162,39,0.16)] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-light)]">Formation tracker</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Neophyte’s Status</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              {totalInFormation} neophyte{totalInFormation === 1 ? "" : "s"} in formation
              {awaitingCertification > 0
                ? ` · ${awaitingCertification} passed and awaiting certification`
                : " · all passed neophytes are certified"}
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Link href={buildHref("passed_member")} className="a-btn a-btn-gold">
              Review passed ({passedCount})
            </Link>
            <Link href="/admin/members" className="a-btn border-white/25 bg-white/10 text-white transition hover:bg-white/20">
              Member directory →
            </Link>
          </div>
        </div>
      </section>

      {params.confirmed ? (
        <div role="status" className="a-card mb-5 flex items-start gap-3 border-a-success/30 bg-a-success-soft px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-a-success text-xs font-bold text-white" aria-hidden="true">✓</span>
          <p className="text-sm font-medium text-a-success">The neophyte was confirmed and moved to the member directory.</p>
        </div>
      ) : null}

      {/* Formation pipeline */}
      <section className="a-card mb-5 overflow-hidden" aria-label="Neophyte formation pipeline">
        <div className="grid gap-px bg-a-border-soft sm:grid-cols-2 lg:grid-cols-4">
          {NEOPHYTE_STATUSES.map((status) => {
            const stageTotal = statusCounts[status] ?? 0;
            const share = totalInFormation > 0 ? Math.round((stageTotal / totalInFormation) * 100) : 0;
            return (
              <Link
                key={status}
                href={buildHref(status)}
                className={`bg-white p-5 transition hover:bg-[var(--a-bg)] ${selectedStatus === status ? "bg-a-brand-soft/60 ring-2 ring-inset ring-a-brand" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`a-icon-tile h-10 w-10 ${stageTiles[status]}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={stageIcons[status]} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-wide text-a-muted">{NEOPHYTE_STATUS_LABELS[status]}</p>
                    <p className="text-xl font-bold leading-7 text-a-text">{stageTotal}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full transition-all ${stageBars[status]}`} style={{ width: `${share}%` }} />
                </div>
                <p className="mt-1.5 truncate text-[11px] text-a-muted">
                  {share}% of batch · {stageBlurbs[status]}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Toolbar */}
      <form action="/admin/neophytes" method="get" className="a-card mb-4 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
        <input type="search" name="q" defaultValue={q} placeholder="Search name, email, or member ID…" aria-label="Search neophytes" className="a-input min-w-0 flex-1" />
        <select name="status" defaultValue={selectedStatus} className="a-select sm:w-56" aria-label="Filter by formation stage">
          <option value="all">All formation stages</option>
          {NEOPHYTE_STATUSES.map((status) => <option key={status} value={status}>{NEOPHYTE_STATUS_LABELS[status]}</option>)}
        </select>
        <button type="submit" className="a-btn a-btn-primary">Apply filters</button>
      </form>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-a-muted">
          Showing <span className="font-semibold text-a-text">{total}</span> neophyte{total === 1 ? "" : "s"}
          {selectedStatus !== "all" ? <> in <span className="font-semibold text-a-text">{NEOPHYTE_STATUS_LABELS[selectedStatus]}</span></> : null}
          {q ? <> matching “<span className="font-semibold text-a-text">{q}</span>”</> : null}
        </p>
        {q || selectedStatus !== "all" ? (
          <Link href="/admin/neophytes" className="a-btn a-btn-ghost a-btn-sm">✕ Clear filters</Link>
        ) : null}
      </div>

      {neophytes.length === 0 ? (
        <div className="a-card px-5 py-14 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-a-brand-soft text-a-brand" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </span>
          <p className="mt-3 text-sm font-medium text-a-text">No neophytes match your filters.</p>
          <p className="mt-1 text-xs text-a-muted">Approved applications will appear here at Orientation.</p>
        </div>
      ) : (
        <div className="space-y-3">{neophytes.map((neophyte) => <NeophyteCard key={neophyte.id} neophyte={neophyte} />)}</div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Neophyte pagination">
          {currentPage > 1 ? <Link href={buildHref(selectedStatus, currentPage - 1)} className="a-btn a-btn-secondary a-btn-sm">← Previous</Link> : <span />}
          <p className="text-xs text-a-muted">Page {currentPage} of {totalPages} · {total} {total === 1 ? "neophyte" : "neophytes"}</p>
          {currentPage < totalPages ? <Link href={buildHref(selectedStatus, currentPage + 1)} className="a-btn a-btn-secondary a-btn-sm">Next →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}

function NeophyteCard({ neophyte }: { neophyte: Neophyte }) {
  const currentStatus = NEOPHYTE_STATUSES.includes(neophyte.neophyteStatus as NeophyteStatus) ? (neophyte.neophyteStatus as NeophyteStatus) : "orientation";
  const currentIndex = NEOPHYTE_STATUSES.indexOf(currentStatus);
  const certified = Boolean(neophyte.neophyteCertificationIssuedAt);
  return <article className="a-card overflow-hidden"><header className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex min-w-0 items-center gap-3"><InitialsAvatar name={personName(neophyte)} tone="gold" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-base font-semibold text-a-text">{personName(neophyte)}</h2><span className={`a-badge ${stageBadges[currentStatus]}`}>{NEOPHYTE_STATUS_LABELS[currentStatus]}</span>{certified ? <span className="a-badge a-badge-green a-badge-plain">Certified</span> : null}</div><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-a-muted"><span className="font-mono">{neophyte.memberId}</span><span className="truncate">{neophyte.email}</span><span>{neophyte.contactNumber}</span></p></div></div><div className="flex shrink-0 items-center gap-4"><div className="hidden items-center gap-1.5" aria-hidden="true">{NEOPHYTE_STATUSES.map((status, index) => <span key={status} className={`h-2 w-6 rounded-full ${index < currentIndex ? "bg-a-brand" : index === currentIndex ? "bg-a-gold" : "bg-gray-200"}`} />)}</div><p className="text-xs text-a-muted">Updated {relativeDays(neophyte.neophyteStatusUpdatedAt ?? neophyte.createdAt)}</p></div></header><details className="group border-t border-a-border-soft"><summary className="cursor-pointer list-none px-5 py-3 text-xs font-semibold text-a-brand transition hover:text-a-brand-dark sm:px-6"><span className="mr-2 inline-block transition group-open:rotate-90">›</span> View complete personal details</summary><dl className="grid gap-x-8 gap-y-4 border-t border-a-border-soft bg-[var(--a-bg)] px-5 py-5 sm:grid-cols-2 lg:grid-cols-3 sm:px-6"><Detail label="Age" value={String(neophyte.age)} /><Detail label="Date of birth" value={neophyte.dateOfBirth} /><Detail label="Place of birth" value={neophyte.placeOfBirth} /><Detail label="Address" value={`${neophyte.street}, ${neophyte.barangay}, ${neophyte.municipality}, ${neophyte.province}`} /><Detail label="Guardian" value={`${neophyte.guardianName} (${neophyte.guardianContact})`} /><Detail label="Guardian address" value={neophyte.guardianAddress} /><Detail label="Baptized name" value={neophyte.baptizedName} /><Detail label="Application record" value={`Created ${formatDate(neophyte.createdAt)}`} /><Detail label="Last stage update" value={neophyte.neophyteStatusUpdatedAt ? `${formatDate(neophyte.neophyteStatusUpdatedAt)}${neophyte.neophyteStatusUpdatedBy ? ` by ${neophyte.neophyteStatusUpdatedBy}` : ""}` : "—"} /></dl></details><NeophyteStatusControls neophyteId={neophyte.id} currentStatus={currentStatus} certificationIssuedAt={neophyte.neophyteCertificationIssuedAt?.toISOString() ?? null} /></article>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">{label}</dt><dd className="mt-0.5 text-sm text-a-secondary">{value}</dd></div>; }
function personName(person: { firstName: string; middleInitial: string | null; lastName: string }) { return `${person.firstName}${person.middleInitial ? ` ${person.middleInitial}.` : ""} ${person.lastName}`; }
function formatDate(value: Date) { return value.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }); }
function relativeDays(value: Date | null) {
  if (!value) return "never";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
function InitialsAvatar({ name, tone = "brand" }: { name: string; tone?: "brand" | "slate" | "gold" }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("");
  const tones: Record<string, string> = {
    brand: "bg-a-brand-soft text-a-brand",
    slate: "bg-gray-100 text-a-secondary",
    gold: "bg-a-gold-soft text-[#8a6d10]",
  };
  return <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tones[tone]}`} aria-hidden="true">{initials || "?"}</span>;
}
