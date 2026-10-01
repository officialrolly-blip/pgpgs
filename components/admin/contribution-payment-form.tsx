"use client";

import { useActionState, useEffect, useState } from "react";
import MemberCombobox, {
  type MemberOption,
} from "@/components/admin/member-combobox";
import {
  recordContributionPaymentAction,
  type ContributionActionState,
} from "@/lib/actions/contribution-actions";
import {
  CONTRIBUTION_PAYMENT_METHOD_LABELS,
  CONTRIBUTION_PAYMENT_METHODS,
  billingMonthLabel,
  currentBillingMonth,
  formatCentavos,
} from "@/lib/contributions";

export default function ContributionPaymentForm({
  defaultBillingMonth,
  defaultAmountCents,
}: {
  defaultBillingMonth: string;
  defaultAmountCents: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="a-btn a-btn-gold" onClick={() => setOpen(true)}>
        + Record a payment
      </button>
      {open ? (
        <PaymentDialog
          defaultBillingMonth={defaultBillingMonth}
          defaultAmountCents={defaultAmountCents}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PaymentDialog({
  defaultBillingMonth,
  defaultAmountCents,
  onClose,
}: {
  defaultBillingMonth: string;
  defaultAmountCents: number;
  onClose: () => void;
}) {
  const [member, setMember] = useState<MemberOption | null>(null);
  const [state, action, pending] = useActionState<
    ContributionActionState,
    FormData
  >(recordContributionPaymentAction, {});

  // Escape closes the dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={onClose}
    >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-payment-heading"
            className="a-card max-h-[90vh] w-full max-w-xl overflow-y-auto p-6 shadow-[var(--a-shadow-md)] sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="record-payment-heading" className="a-card-title">Record a payment</h2>
                <p className="mt-1.5 text-sm leading-6 text-a-muted">
                  Log cash or e-wallet dues for any member and month. Partial payments
                  keep the remaining balance as arrears.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-a-border text-lg leading-none text-a-muted transition hover:bg-a-bg hover:text-a-text"
              >
                ×
              </button>
            </div>
            <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="memberPk" value={member?.id ?? ""} />
        <MemberCombobox label="Member" selected={member} onSelect={setMember} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="a-label">Billing month</span>
            <input
              type="month"
              name="billingMonth"
              required
              defaultValue={defaultBillingMonth || currentBillingMonth()}
              max={currentBillingMonth()}
              className="a-input"
            />
            <span className="mt-1 block text-xs text-a-muted">
              {billingMonthLabel(defaultBillingMonth)} · {formatCentavos(defaultAmountCents)} due
            </span>
          </label>
          <label className="block">
            <span className="a-label">Amount paid (₱)</span>
            <input
              type="number"
              name="amountPaid"
              required
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder={(defaultAmountCents / 100).toFixed(2)}
              className="a-input"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="a-label">Payment method</span>
            <select name="paymentMethod" className="a-select" defaultValue="cash">
              {CONTRIBUTION_PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {CONTRIBUTION_PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="a-label">Reference no. (optional)</span>
            <input
              type="text"
              name="referenceNumber"
              maxLength={80}
              placeholder="GCash ref, OR no.…"
              className="a-input"
              autoComplete="off"
            />
          </label>
        </div>
        <label className="block">
          <span className="a-label">Note (optional)</span>
          <input type="text" name="note" maxLength={500} placeholder="e.g. partial for two months" className="a-input" autoComplete="off" />
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-a-border px-3 py-2.5 text-sm text-a-secondary transition hover:border-a-warning/60 hover:bg-a-warning-soft/40">
          <input type="checkbox" name="waived" className="h-4 w-4 accent-[#b54708]" />
          Waive this month (excused — clears the bill)
        </label>
              {state.error ? <p className="text-xs font-medium text-a-danger" role="alert">{state.error}</p> : null}
              {state.success ? <p className="text-xs font-medium text-a-success" role="status">{state.success}</p> : null}
              <div className="flex flex-col-reverse gap-2 border-t border-a-border-soft pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="a-btn a-btn-secondary">
                  {state.success ? "Done" : "Cancel"}
                </button>
                <button type="submit" disabled={pending || !member} className="a-btn a-btn-gold">
                  {pending ? "Recording…" : member ? "Record payment" : "Select a member first"}
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs leading-5 text-a-muted">
              Recording the full amount marks the bill Paid and stamps a receipt date.
              Anything less stays Partial so arrears carry forward.
            </p>
          </div>
    </div>
  );
}
