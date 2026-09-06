import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import MemberDirectorySearch from "@/components/admin/member-directory-search";
import { deleteMemberAction } from "@/lib/actions/member-actions";
import { requireAdmin } from "@/lib/auth";
import { MEMBER_STATUSES } from "@/lib/member-constants";

export const metadata: Metadata = {
  title: "Members",
};

const PAGE_SIZE = 20;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; created?: string; deleted?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const status = params.status?.trim() ?? "";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const conditions = [ne(pgpmembers.status, "Neophyte")];
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
  if (status) conditions.push(eq(pgpmembers.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [filteredCountRows, bannerStatsRows] = await Promise.all([
    db.select({ value: count() }).from(pgpmembers).where(where),
    db.execute<{ total: number; members: number; officers: number; alumni: number }>(
      `select
         count(*)::int as total,
         count(*) filter (where status = 'Member')::int as members,
         count(*) filter (where status = 'PGP-GS Roxas City Chapter Officer')::int as officers,
         count(*) filter (where status = 'Alumni')::int as alumni
       from pgpmembers
       where status <> 'Neophyte'`,
    ),
  ]);
  const totalCount = Number(filteredCountRows[0]?.value ?? 0);
  const bannerStats = bannerStatsRows.rows[0];

  const totalPages = Math.max(1, Math.ceil(Number(totalCount) / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const members = await db
    .select({
      id: pgpmembers.id,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      email: pgpmembers.email,
      status: pgpmembers.status,
      officerPosition: pgpmembers.officerPosition,
      photoUrl: pgpmembers.photoUrl,
      createdAt: pgpmembers.createdAt,
    })
    .from(pgpmembers)
    .where(where)
    .orderBy(desc(pgpmembers.createdAt))
    .limit(PAGE_SIZE)
    .offset((currentPage - 1) * PAGE_SIZE);

  const buildPageHref = (targetPage: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status) query.set("status", status);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return queryString ? `/admin/members?${queryString}` : "/admin/members";
  };

  const buildFilterHref = (nextStatus: string) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (nextStatus) query.set("status", nextStatus);
    const queryString = query.toString();
    return queryString ? `/admin/members?${queryString}` : "/admin/members";
  };

  const quickFilters = [
    { label: "All records", value: "" },
    { label: "Members", value: "Member" },
    { label: "Officers", value: "PGP-GS Roxas City Chapter Officer" },
    { label: "Alumni", value: "Alumni" },
  ];

  return (
    <>
      {/* Executive banner */}
      <section
        className="relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f3d26_0%,#1b5c38_58%,#14532d_100%)] p-6 text-white shadow-[var(--a-shadow-md)] sm:p-7"
        aria-label="Directory summary"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[rgba(201,162,39,0.16)] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-light)]">Chapter records</p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">Member Directory</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              {bannerStats?.total ?? 0} records · {bannerStats?.members ?? 0} members · {bannerStats?.officers ?? 0}{" "}
              {bannerStats?.officers === 1 ? "officer" : "officers"} · {bannerStats?.alumni ?? 0}{" "}
              {bannerStats?.alumni === 1 ? "alumnus" : "alumni"}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <Link href="/admin/members/new" className="a-btn a-btn-gold">
              + Add member
            </Link>
            <Link href="/admin/neophytes" className="a-btn border-white/25 bg-white/10 text-white transition hover:bg-white/20">
              Neophyte portal →
            </Link>
          </div>
        </div>
      </section>

      {params.created ? (
        <div role="status" className="a-card mb-5 flex items-start gap-3 border-a-success/30 bg-a-success-soft px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-a-success text-xs font-bold text-white" aria-hidden="true">✓</span>
          <p className="text-sm font-medium text-a-success">Member {params.created} was added to the directory.</p>
        </div>
      ) : null}
      {params.deleted ? (
        <div role="status" className="a-card mb-5 flex items-start gap-3 border-a-danger/30 bg-a-danger-soft px-4 py-3.5">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-a-danger text-xs font-bold text-white" aria-hidden="true">!</span>
          <p className="text-sm font-medium text-a-danger">The member was deleted.</p>
        </div>
      ) : null}

      {/* Status quick filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Quick status filters">
        {quickFilters.map((chip) => (
          <Link
            key={chip.value}
            href={buildFilterHref(chip.value)}
            className={`a-btn a-btn-sm rounded-full ${status === chip.value ? "a-btn-primary" : "a-btn-secondary"}`}
            aria-current={status === chip.value ? "true" : undefined}
          >
            {chip.label}
          </Link>
        ))}
      </div>

      <MemberDirectorySearch
        initialQuery={q}
        initialStatus={status}
        statuses={MEMBER_STATUSES}
        displayedCount={members.length}
        totalCount={totalCount}
      />

      <MembersTable members={members} buildPageHref={buildPageHref} currentPage={currentPage} totalPages={totalPages} />
    </>
  );
}

function MembersTable({
  members,
  buildPageHref,
  currentPage,
  totalPages,
}: {
  members: {
    id: string;
    memberId: string;
    firstName: string;
    middleInitial: string | null;
    lastName: string;
    email: string;
    status: string;
    officerPosition: string | null;
    photoUrl: string | null;
    createdAt: Date;
  }[];
  buildPageHref: (page: number) => string;
  currentPage: number;
  totalPages: number;
}) {
  return (
    <>
      <div className="a-card overflow-x-auto">
        <table className="a-table min-w-[860px]">
          <thead>
            <tr>
              <th className="a-th">Member profile</th>
              <th className="a-th">Member ID</th>
              <th className="a-th">Status</th>
              <th className="a-th">Position</th>
              <th className="a-th">Joined</th>
              <th className="a-th text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-a-brand-soft text-a-brand" aria-hidden="true">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-medium text-a-text">No members match your filters.</p>
                  <p className="mt-1 text-xs text-a-muted">Try a different search, or add a new member to the directory.</p>
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id} className="a-tr group">
                  <td className="a-td">
                    <Link href={`/admin/members/${member.id}`} className="flex items-center gap-3">
                      {member.photoUrl ? (
                        <Image src={member.photoUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-a-gold-soft text-xs font-bold text-[#8a6d10]">
                          {member.firstName.slice(0, 1)}{member.lastName.slice(0, 1)}
                        </span>
                      )}
                      <span className="min-w-0"><span className="block font-semibold text-a-text transition group-hover:text-a-brand">{member.firstName} {member.middleInitial ? `${member.middleInitial}. ` : ""}{member.lastName}</span><span className="block truncate text-xs text-a-muted">{member.email}</span></span>
                    </Link>
                  </td>
                  <td className="a-td font-mono text-xs text-a-muted">{member.memberId}</td>
                  <td className="a-td">
                    <span className={`a-badge ${statusBadgeClass(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="a-td">{member.officerPosition ?? <span className="text-a-muted">—</span>}</td>
                  <td className="a-td text-a-muted">
                    <time dateTime={member.createdAt.toISOString()}>{formatDate(member.createdAt)}</time>
                  </td>
                  <td className="a-td text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="a-btn a-btn-secondary a-btn-sm"
                      >
                        Edit
                      </Link>
                      <form action={deleteMemberAction}>
                        <input type="hidden" name="id" value={member.id} />
                        <ConfirmSubmitButton
                          message={`Delete ${member.firstName} ${member.lastName} (${member.memberId})? This cannot be undone.`}
                          className="a-btn a-btn-danger a-btn-sm"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination">
          {currentPage > 1 ? (
            <Link href={buildPageHref(currentPage - 1)} className="a-btn a-btn-secondary a-btn-sm">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-a-muted">Page {currentPage} of {totalPages}</span>
          {currentPage < totalPages ? (
            <Link href={buildPageHref(currentPage + 1)} className="a-btn a-btn-secondary a-btn-sm">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function statusBadgeClass(status: string) {
  if (status === "Alumni") return "a-badge-gray";
  if (status.includes("Officer")) return "a-badge-gold";
  if (status === "Member") return "a-badge-green";
  return "a-badge-blue";
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}
