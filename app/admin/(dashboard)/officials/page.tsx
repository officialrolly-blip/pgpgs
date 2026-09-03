import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import { setOfficerPositionAction } from "@/lib/actions/member-actions";
import { requireAdmin } from "@/lib/auth";
import { OFFICER_POSITIONS } from "@/lib/member-constants";

export const metadata: Metadata = { title: "Officers" };

const inputClass = "a-input";

export default async function AdminOfficialsPage() {
  await requireAdmin();

  const [officers, allMembers] = await Promise.all([
    db
      .select({
        id: pgpmembers.id,
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        middleInitial: pgpmembers.middleInitial,
        lastName: pgpmembers.lastName,
        officerPosition: pgpmembers.officerPosition,
        officerDateElected: pgpmembers.officerDateElected,
      })
      .from(pgpmembers)
      .where(eq(pgpmembers.status, "PGP-GS Roxas City Chapter Officer"))
      .orderBy(asc(pgpmembers.officerPosition)),
    db
      .select({ id: pgpmembers.id, memberId: pgpmembers.memberId, firstName: pgpmembers.firstName, lastName: pgpmembers.lastName })
      .from(pgpmembers)
      .orderBy(asc(pgpmembers.lastName)),
  ]);

  const assignedPositions = new Set(officers.map((officer) => officer.officerPosition).filter(Boolean)).size;
  const availablePositions = OFFICER_POSITIONS.filter(
    (position) => !officers.some((officer) => officer.officerPosition === position),
  );

  return (
    <>
      <PageHeading
        title="Chapter Officers"
        description="Manage the current chapter roster and publish officer appointments to the public website."
        actions={
          <Link href="/officials/roxas-city-chapter-officers" target="_blank" rel="noreferrer" className="a-btn a-btn-secondary">
            View public page ↗
          </Link>
        }
      />

      <section className="a-card grid overflow-hidden sm:grid-cols-3 sm:divide-x divide-a-border-soft" aria-label="Officer overview">
        <SummaryItem label="Assigned positions" value={assignedPositions} detail={`of ${OFFICER_POSITIONS.length} available`} />
        <SummaryItem label="Open positions" value={availablePositions.length} detail="Ready to be assigned" />
        <SummaryItem label="Directory members" value={allMembers.length} detail="Eligible for appointment" />
      </section>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <CurrentOfficers officers={officers} />
        <AssignForm allMembers={allMembers} />
      </div>

      <section className="a-card mt-6 px-5 py-4 sm:px-6" aria-labelledby="public-publishing-note">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="public-publishing-note" className="text-sm font-semibold text-a-text">Public publishing</h2>
            <p className="mt-1 text-sm text-a-muted">Changes are reflected automatically on the public chapter officers page.</p>
          </div>
          <Link href="/officials/roxas-city-chapter-officers" target="_blank" rel="noreferrer" className="shrink-0 text-sm font-medium text-a-brand transition hover:text-a-brand-dark">Open public page →</Link>
        </div>
      </section>
    </>
  );
}

function SummaryItem({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="p-5">
      <p className="text-sm font-medium text-a-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-a-text">{value}</p>
      <p className="mt-0.5 text-xs text-a-muted">{detail}</p>
    </div>
  );
}

function AssignForm({ allMembers }: { allMembers: { id: string; memberId: string; firstName: string; lastName: string }[] }) {
  return (
    <section className="a-card p-5 sm:p-6 xl:sticky xl:top-20" aria-labelledby="assign-heading">
      <h2 id="assign-heading" className="a-card-title">Assign a position</h2>
      <p className="mt-1.5 text-sm leading-6 text-a-muted">Choose a member, position, and election date. The appointment will be published automatically.</p>
      <form action={setOfficerPositionAction} className="mt-5 space-y-4">
        <label className="block"><span className="a-label">Member</span><select name="memberId" required className={inputClass} defaultValue="" disabled={allMembers.length === 0}><option value="" disabled>Select a member…</option>{allMembers.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName} · {member.memberId}</option>)}</select></label>
        <label className="block"><span className="a-label">Position</span><select name="officerPosition" required className={inputClass} defaultValue=""><option value="" disabled>Select position…</option>{OFFICER_POSITIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="block"><span className="a-label">Date elected</span><input type="date" name="officerDateElected" required className={inputClass} /></label>
        <button type="submit" disabled={allMembers.length === 0} className="a-btn a-btn-gold w-full">{allMembers.length === 0 ? "Add a member first" : "Save appointment"}</button>
      </form>
      <p className="mt-4 border-t border-a-border-soft pt-4 text-xs leading-5 text-a-muted">Assigning a position marks the member as a chapter officer. Removing an appointment returns them to the standard member status.</p>
    </section>
  );
}

type OfficerRow = { id: string; memberId: string; firstName: string; middleInitial: string | null; lastName: string; officerPosition: string | null; officerDateElected: string | null };

function CurrentOfficers({ officers }: { officers: OfficerRow[] }) {
  return (
    <section className="a-card overflow-hidden" aria-labelledby="current-officers-heading">
      <header className="flex items-end justify-between gap-4 border-b border-a-border px-5 py-4 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-a-muted">Current roster</p>
          <h2 id="current-officers-heading" className="a-card-title mt-1">Active appointments</h2>
        </div>
        <span className="a-badge a-badge-green a-badge-plain">{officers.length} assigned</span>
      </header>
      {officers.length === 0 ? (
        <div className="px-5 py-12 text-center sm:px-6">
          <p className="text-sm text-a-muted">No officer appointments have been assigned.</p>
          <p className="mt-1 text-xs text-a-muted/80">Use the form to create the first appointment.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="a-table min-w-[620px]">
            <thead>
              <tr>
                <th className="a-th sm:!px-6">Position</th>
                <th className="a-th">Officer</th>
                <th className="a-th">Elected</th>
                <th className="a-th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="[&>tr:last-child>td]:border-b-0">
              {officers.map((officer) => (
                <tr key={officer.id} className="a-tr">
                  <td className="a-td font-semibold text-a-text sm:!px-6">{officer.officerPosition ?? "Unassigned"}</td>
                  <td className="a-td"><Link href={`/admin/members/${officer.id}`} className="font-semibold text-a-text transition hover:text-a-brand">{officer.firstName} {officer.middleInitial ? `${officer.middleInitial}. ` : ""}{officer.lastName}</Link><p className="mt-0.5 font-mono text-xs text-a-muted">{officer.memberId}</p></td>
                  <td className="a-td text-a-muted">{officer.officerDateElected ? formatDate(officer.officerDateElected) : "—"}</td>
                  <td className="a-td text-right">
                    <form action={setOfficerPositionAction}>
                      <input type="hidden" name="memberId" value={officer.id} />
                      <input type="hidden" name="officerPosition" value="" />
                      <button type="submit" className="a-btn a-btn-danger a-btn-sm">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}
