import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { registrations } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import RegistrationReview from "@/components/admin/registration-review";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { deleteRegistrationAction } from "@/lib/actions/registration-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Membership Applications" };

const STATUSES = ["pending", "approved", "rejected", "all"] as const;
const PAGE_SIZE = 20;
type Status = (typeof STATUSES)[number];
type Application = typeof registrations.$inferSelect;

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status: Status = STATUSES.includes(params.status as Status)
    ? (params.status as Status)
    : "pending";
  const requestedPage = Math.max(1, Number(params.page ?? "1") || 1);

  const conditions = [];
  if (status !== "all") conditions.push(eq(registrations.applicationStatus, status));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(registrations.firstName, pattern),
        ilike(registrations.lastName, pattern),
        ilike(registrations.email, pattern),
        ilike(registrations.memberId, pattern),
      ),
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRows, statusRows] = await Promise.all([
    db.select({ value: count() }).from(registrations).where(where),
    db.select({ status: registrations.applicationStatus, value: count() }).from(registrations).groupBy(registrations.applicationStatus),
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const applications = await db
    .select()
    .from(registrations)
    .where(where)
    .orderBy(desc(registrations.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const statusCounts = Object.fromEntries(statusRows.map((row) => [row.status, Number(row.value)]));
  const buildHref = (nextStatus = status, nextPage = 1) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextStatus !== "pending") query.set("status", nextStatus);
    if (nextPage > 1) query.set("page", String(nextPage));
    const queryString = query.toString();
    return queryString ? `/admin/registrations?${queryString}` : "/admin/registrations";
  };

  return (
    <>
      <PageHeading
        title="Membership Applications"
        description="Review, approve, and track join requests from the public website. Approved applicants are added to the member directory."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label="Application overview">
        {(["pending", "approved", "rejected"] as const).map((value) => (
          <Link key={value} href={buildHref(value)} className={`a-card a-card-hover p-4 ${status === value ? "border-a-brand ring-2 ring-a-brand/15" : ""}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-a-muted">{value}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-a-text">{statusCounts[value] ?? 0}</p>
            <p className="mt-1 text-xs text-a-muted">{value === "pending" ? "Awaiting a decision" : `${value[0].toUpperCase()}${value.slice(1)} applications`}</p>
          </Link>
        ))}
      </section>

      <form action="/admin/registrations" method="get" className="a-card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <input type="search" name="q" defaultValue={q} placeholder="Search applicant, email, or member ID…" className="a-input min-w-0 flex-1" />
        <select name="status" defaultValue={status} className="a-select sm:w-44">
          {STATUSES.map((value) => <option key={value} value={value}>{value === "all" ? "All statuses" : `${value[0].toUpperCase()}${value.slice(1)}`}</option>)}
        </select>
        <button type="submit" className="a-btn a-btn-primary">Filter</button>
      </form>

      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <p className="text-a-muted"><span className="font-semibold text-a-text">{total}</span> application{total === 1 ? "" : "s"} found{status !== "all" ? ` · ${status}` : ""}</p>
        {q || status !== "pending" ? <Link href="/admin/registrations" className="text-xs font-semibold text-a-brand transition hover:text-a-brand-dark">Clear filters</Link> : null}
      </div>

      <ApplicationsTable applications={applications} />

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Applications pagination">
          {currentPage > 1 ? <Link href={buildHref(status, currentPage - 1)} className="a-btn a-btn-secondary a-btn-sm">← Previous</Link> : <span />}
          <span className="text-a-muted">Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages ? <Link href={buildHref(status, currentPage + 1)} className="a-btn a-btn-secondary a-btn-sm">Next →</Link> : <span />}
        </nav>
      ) : null}
    </>
  );
}

function ApplicationsTable({ applications }: { applications: Application[] }) {
  return (
    <div className="a-card overflow-x-auto">
      <table className="a-table min-w-[980px]">
        <thead><tr><th className="a-th">Applicant</th><th className="a-th">Member ID</th><th className="a-th">Contact</th><th className="a-th">Submitted</th><th className="a-th">Status</th><th className="a-th text-right">Review</th></tr></thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {applications.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-a-muted">No applications match your filters.</td></tr> : applications.map((application) => (
            <Fragment key={application.id}>
              <tr className="a-tr align-top">
                <td className="a-td"><p className="font-semibold text-a-text">{fullName(application)}</p><p className="mt-0.5 text-xs text-a-muted">{application.email}</p></td>
                <td className="a-td font-mono text-xs text-a-muted">{application.memberId}</td>
                <td className="a-td">{application.contactNumber}</td>
                <td className="a-td text-a-muted"><time dateTime={application.createdAt.toISOString()}>{formatDate(application.createdAt)}</time></td>
                <td className="a-td"><StatusBadge application={application} /></td>
                <td className="a-td text-right">{application.applicationStatus === "pending" ? <RegistrationReview registrationId={application.id} compact /> : <form action={deleteRegistrationAction} className="inline-block"><input type="hidden" name="registrationId" value={application.id} /><ConfirmSubmitButton message={`Permanently delete the application of ${fullName(application)}?`} className="a-btn a-btn-danger a-btn-sm">Delete</ConfirmSubmitButton></form>}</td>
              </tr>
              <tr className="bg-[var(--a-bg)]"><td colSpan={6} className="a-td !border-b-0 px-5 py-0"><details className="group border-t border-transparent open:border-a-border-soft"><summary className="cursor-pointer list-none py-3 text-xs font-semibold text-a-brand marker:content-none transition hover:text-a-brand-dark"><span className="mr-2 inline-block transition group-open:rotate-90">›</span> View complete application</summary><dl className="grid gap-x-8 gap-y-4 border-t border-a-border-soft pb-5 pt-4 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Age / gender" value={`${application.age} · ${application.gender}`} /><Detail label="Date of birth" value={application.dateOfBirth} /><Detail label="Place of birth" value={application.placeOfBirth} /><Detail label="Address" value={`${application.street}, ${application.barangay}, ${application.municipality}, ${application.province}`} /><Detail label="Guardian" value={`${application.guardianName} (${application.guardianRelationship})`} /><Detail label="Guardian contact" value={application.guardianContact} /><Detail label="Guardian address" value={application.guardianAddress} /><Detail label="Studying" value={application.studying} /><Detail label="School / education" value={application.studying === "Yes" ? `${application.schoolName}${application.schoolAddress ? ` — ${application.schoolAddress}` : ""}${application.schoolYear ? ` (${application.schoolYear})` : ""}` : application.educationalAttainment ?? "—"} />{application.reviewedAt ? <Detail label="Reviewed" value={`${formatDate(application.reviewedAt)}${application.reviewedBy ? ` by ${application.reviewedBy}` : ""}`} /> : null}</dl></details></td></tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ application }: { application: Application }) {
  const classes = application.applicationStatus === "pending" ? "a-badge-amber" : application.applicationStatus === "approved" ? "a-badge-green" : "a-badge-red";
  return <span className={`a-badge ${classes}`}>{application.applicationStatus}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">{label}</dt><dd className="mt-0.5 text-sm text-a-secondary">{value}</dd></div>;
}

function fullName(application: Application) {
  return `${application.firstName}${application.middleInitial ? ` ${application.middleInitial}.` : ""} ${application.lastName}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}
