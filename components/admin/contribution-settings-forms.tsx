"use client";

import { useActionState } from "react";
import {
  generateMonthlyBillsAction,
  updateContributionSettingsAction,
  type ContributionActionState,
} from "@/lib/actions/contribution-actions";
import { billingMonthLabel, currentBillingMonth, formatCentavos } from "@/lib/contributions";

export default function ContributionSettingsForms({
  monthlyAmountCents,
  dueDay,
  currentMonth,
}: {
  monthlyAmountCents: number;
  dueDay: number;
  currentMonth: string;
}) {
  const [settingsState, settingsAction, settingsPending] = useActionState<
    ContributionActionState,
    FormData
  >(updateContributionSettingsAction, {});
  const [generateState, generateAction, generatePending] = useActionState<
    ContributionActionState,
    FormData
  >(generateMonthlyBillsAction, {});

  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className="a-card p-5 sm:p-6" aria-labelledby="dues-settings-heading">
        <h2 id="dues-settings-heading" className="a-card-title">Dues settings</h2>
        <p className="mt-1.5 text-sm leading-6 text-a-muted">
          Currently {formatCentavos(monthlyAmountCents)} per member, due every {dueDay}
          {dueDaySuffix(dueDay)} of the month. Changes apply to newly generated bills.
        </p>
        <form action={settingsAction} className="mt-5 grid gap-4 sm:grid-cols-[1fr_120px_auto] sm:items-end">
          <label className="block">
            <span className="a-label">Monthly amount (₱)</span>
            <input
              type="number" name="monthlyAmount" required min="0" max="100000" step="0.01"
              inputMode="decimal" defaultValue={(monthlyAmountCents / 100).toFixed(2)} className="a-input"
            />
          </label>
          <label className="block">
            <span className="a-label">Due day</span>
            <input type="number" name="dueDay" required min={1} max={28} defaultValue={dueDay} className="a-input" />
          </label>
          <button type="submit" disabled={settingsPending} className="a-btn a-btn-primary">
            {settingsPending ? "Saving…" : "Save"}
          </button>
        </form>
        {settingsState.error ? <p className="mt-3 text-xs font-medium text-a-danger" role="alert">{settingsState.error}</p> : null}
        {settingsState.success ? <p className="mt-3 text-xs font-medium text-a-success" role="status">{settingsState.success}</p> : null}
      </section>

      <section className="a-card p-5 sm:p-6" aria-labelledby="generate-bills-heading">
        <h2 id="generate-bills-heading" className="a-card-title">Generate monthly bills</h2>
        <p className="mt-1.5 text-sm leading-6 text-a-muted">
          Creates one {formatCentavos(monthlyAmountCents)} bill for every directory member
          (neophytes excluded). Safe to rerun — existing bills are never overwritten.
        </p>
        <form action={generateAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="a-label">Billing month</span>
            <input type="month" name="billingMonth" required defaultValue={currentMonth || currentBillingMonth()} max={currentBillingMonth()} className="a-input" />
            <span className="mt-1 block text-xs text-a-muted">Now billing {billingMonthLabel(currentMonth)}</span>
          </label>
          <button type="submit" disabled={generatePending} className="a-btn a-btn-secondary shrink-0">
            {generatePending ? "Generating…" : "Generate bills"}
          </button>
        </form>
        {generateState.error ? <p className="mt-3 text-xs font-medium text-a-danger" role="alert">{generateState.error}</p> : null}
        {generateState.success ? <p className="mt-3 text-xs font-medium text-a-success" role="status">{generateState.success}</p> : null}
      </section>
    </div>
  );
}

function dueDaySuffix(day: number): string {
  if (day === 1 || day === 21) return "st";
  if (day === 2 || day === 22) return "nd";
  if (day === 3 || day === 23) return "rd";
  return "th";
}
