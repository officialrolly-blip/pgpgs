"use client";

import { useActionState } from "react";
import Link from "next/link";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import {
  confirmNeophyteMemberAction,
  issueNeophyteCertificationAction,
  updateNeophyteStatusAction,
  type NeophyteActionState,
} from "@/lib/actions/neophyte-actions";
import { NEOPHYTE_STATUSES, NEOPHYTE_STATUS_LABELS } from "@/lib/member-constants";

export default function NeophyteStatusControls({
  neophyteId,
  currentStatus,
  certificationIssuedAt,
}: {
  neophyteId: string;
  currentStatus: string;
  certificationIssuedAt: string | null;
}) {
  const [statusState, statusAction, statusPending] = useActionState<NeophyteActionState, FormData>(
    updateNeophyteStatusAction,
    {},
  );
  const [certState, certAction, certPending] = useActionState<NeophyteActionState, FormData>(
    issueNeophyteCertificationAction,
    {},
  );
  const activeStatus = NEOPHYTE_STATUSES.includes(currentStatus as (typeof NEOPHYTE_STATUSES)[number])
    ? currentStatus
    : "orientation";
  const passed = activeStatus === "passed_member";
  const certified = Boolean(certificationIssuedAt);

  return (
    <div className="border-t border-a-border-soft px-5 py-5 sm:px-6">
      <div className="grid gap-2 sm:grid-cols-4">
        {NEOPHYTE_STATUSES.map((status, index) => {
          const currentIndex = NEOPHYTE_STATUSES.indexOf(activeStatus as (typeof NEOPHYTE_STATUSES)[number]);
          const complete = index < currentIndex;
          const current = status === activeStatus;
          return (
            <div key={status} className={`relative rounded-lg border px-3 py-3 ${current ? "border-a-brand bg-a-brand-soft" : "border-a-border-soft bg-[var(--a-bg)]"}`}>
              <span className={`text-[10px] font-bold ${complete || current ? "text-a-brand" : "text-a-muted/60"}`}>{String(index + 1).padStart(2, "0")}</span>
              <p className={`mt-1 text-xs font-semibold ${current ? "text-a-brand-dark" : "text-a-secondary"}`}>{NEOPHYTE_STATUS_LABELS[status]}</p>
              <p className="mt-0.5 text-[10px] text-a-muted">{complete ? "Completed" : current ? "Current step" : "Next step"}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <form action={statusAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <input type="hidden" name="neophyteId" value={neophyteId} />
          <label className="block"><span className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">Update stage</span><select name="neophyteStatus" defaultValue={activeStatus} className="a-select mt-1 sm:min-w-56"><option value="orientation">Orientation</option><option value="baptism">Baptism</option><option value="baptism_confirmed">Confirmation of Baptism</option><option value="passed_member">Passed as a Member</option></select></label>
          <button type="submit" disabled={statusPending} className="a-btn a-btn-primary a-btn-sm">{statusPending ? "Saving…" : "Save status"}</button>
        </form>

        <div className="flex flex-wrap gap-2">
          {passed && !certified ? <form action={certAction}><input type="hidden" name="neophyteId" value={neophyteId} /><button type="submit" disabled={certPending} className="a-btn a-btn-sm border border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--green-dark)] transition hover:bg-[var(--gold)]/25 disabled:cursor-not-allowed disabled:opacity-60">{certPending ? "Issuing…" : "Issue certification"}</button></form> : null}
          {certified ? <Link href={`/admin/neophytes/${neophyteId}/certificate`} target="_blank" rel="noreferrer" className="a-btn a-btn-secondary a-btn-sm">View / print certificate ↗</Link> : null}
          {passed && certified ? <form action={confirmNeophyteMemberAction}><input type="hidden" name="neophyteId" value={neophyteId} /><ConfirmSubmitButton message="Confirm this neophyte as an official member? This will move the record to the member directory." className="a-btn a-btn-primary a-btn-sm">Confirm as member</ConfirmSubmitButton></form> : null}
        </div>
      </div>

      {statusState.error ? <p className="mt-3 text-xs font-medium text-a-danger">{statusState.error}</p> : null}
      {certState.error ? <p className="mt-3 text-xs font-medium text-a-danger">{certState.error}</p> : null}
      {statusState.success ? <p className="mt-3 text-xs font-medium text-a-success">{statusState.success}</p> : null}
      {certState.success ? <p className="mt-3 text-xs font-medium text-a-success">{certState.success}</p> : null}
    </div>
  );
}
