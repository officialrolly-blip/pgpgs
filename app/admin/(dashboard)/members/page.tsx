import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { and, count, desc, eq, ilike, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
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

  const [{ value: totalCount }] = await db
    .select({ value: count() })
    .from(pgpmembers)
    .where(where);

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

  return (
    <>
      <PageHeading
        title="Member Directory"
        description={`${totalCount} member${Number(totalCount) === 1 ? "" : "s"} in the chapter records.`}
        actions={
          <Link
            href="/admin/members/new"
            className="a-btn a-btn-primary"
          >
            + Add member
          </Link>
        }
      />

      {params.created ? (
        <p className="mb-4 rounded-xl border border-[#a6f4c5] bg-a-success-soft px-4 py-3 text-sm font-medium text-a-success">
          Member {params.created} was added to the directory.
        </p>
      ) : null}
      {params.deleted ? (
        <p className="mb-4 rounded-xl border border-[#fecdca] bg-a-danger-soft px-4 py-3 text-sm font-medium text-a-danger">
          The member was deleted.
        </p>
      ) : null}

      <MemberDirectorySearch
        initialQuery={q}
        initialStatus={status}
        statuses={MEMBER_STATUSES}
        displayedCount={members.length}
        totalCount={Number(totalCount)}
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
        <table className="a-table min-w-[760px]">
          <thead>
            <tr>
              <th className="a-th">Member profile</th>
              <th className="a-th">Member ID</th>
              <th className="a-th">Status</th>
              <th className="a-th">Position</th>
              <th className="a-th text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-sm text-a-muted">
                  No members match your filters.
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
                    <span className={`a-badge ${member.status === "Alumni" ? "a-badge-gray" : member.status.includes("Officer") ? "a-badge-gold" : "a-badge-green"}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="a-td">{member.officerPosition ?? "—"}</td>
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
          <span className="text-a-muted">
            Page {currentPage} of {totalPages}
          </span>
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
