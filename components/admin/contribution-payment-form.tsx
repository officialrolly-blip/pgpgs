"use client";

import { useActionState, useState } from "react";
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
  const [member, setMember] = useState<MemberOption | null>(null);
  const [state, action, pending] = useActionState<
    ContributionActionState,
    FormData
  >(recordContributionPaymentAction, {});

  return (
    <section className="a-card p-5 sm:p-6 xl:sticky xl:top-20" aria-labelledby="record-payment-heading">
      <h2 id="record-payment-heading" className="a-card-title">Record a payment</h2>
      <p className="mt-1.5 text-sm leading-6 text-a-muted">
        Log cash or e-wallet dues for any member and month. Partial payments
        keep the remaining balance as arrears.
      </p>
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
        <button type="submit" disabled={pending || !member} className="a-btn a-btn-gold w-full">
          {pending ? "Recording…" : member ? "Record payment" : "Select a member first"}
        </button>
      </form>
      {state.error ? <p className="mt-3 text-xs font-medium text-a-danger" role="alert">{state.error}</p> : null}
      {state.success ? <p className="mt-3 text-xs font-medium text-a-success" role="status">{state.success}</p> : null}
      <p className="mt-4 border-t border-a-border-soft pt-4 text-xs leading-5 text-a-muted">
        Recording the full amount marks the bill Paid and stamps a receipt date.
        Anything less stays Partial so arrears carry forward.
      </p>
    </section>
  );
}
