"use client";

import { useActionState } from "react";
import {
  approveRegistrationAction,
  rejectRegistrationAction,
} from "@/lib/actions/registration-actions";

export default function RegistrationReview({
  registrationId,
  compact = false,
}: {
  registrationId: string;
  compact?: boolean;
}) {
  const [approveState, approveAction, approvePending] = useActionState(
    approveRegistrationAction,
    {} as { error?: string; success?: string },
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectRegistrationAction,
    {} as { error?: string; success?: string },
  );

  const state = approveState.error ? approveState : rejectState.error ? rejectState : approveState.success ? approveState : rejectState;

  return (
    <div className={compact ? "inline-block text-left" : "mt-4 border-t border-a-border-soft pt-4"}>
      {state?.error ? <p className="mb-2 text-sm font-medium text-a-danger">{state.error}</p> : null}
      {state?.success ? <p className="mb-2 text-sm font-medium text-a-success">{state.success}</p> : null}
      <div className="flex flex-wrap gap-2">
        <form action={approveAction}>
          <input type="hidden" name="registrationId" value={registrationId} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="a-btn a-btn-primary a-btn-sm"
          >
            {approvePending ? "Approving…" : "Approve → neophytes"}
          </button>
        </form>
        <form action={rejectAction}>
          <input type="hidden" name="registrationId" value={registrationId} />
          <button
            type="submit"
            disabled={approvePending || rejectPending}
            className="a-btn a-btn-danger a-btn-sm"
          >
            {rejectPending ? "Rejecting…" : "Reject"}
          </button>
        </form>
      </div>
    </div>
  );
}
