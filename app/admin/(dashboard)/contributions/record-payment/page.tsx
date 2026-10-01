import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { contributionSettings } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import RecordPaymentForm from "@/components/admin/record-payment-form";
import { requireAdmin } from "@/lib/auth";
import {
  DEFAULT_MONTHLY_DUES_CENTS,
  billingMonthLabel,
  currentBillingMonth,
  formatCentavos,
} from "@/lib/contributions";

export const metadata: Metadata = { title: "Record a Payment" };

export default async function RecordPaymentPage(props: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();
  const params = await props.searchParams;
  const rawMonth = params.month ?? "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : currentBillingMonth();

  let amount = DEFAULT_MONTHLY_DUES_CENTS;
  let ready = true;
  try {
    const [s] = await db.select().from(contributionSettings).limit(1);
    if (s) amount = s.monthlyAmountCents;
    // Probe: fails until the 0018 migration has been applied.
    await db.execute(`select 1 from monthly_contributions limit 1`);
  } catch { ready = false; }

  return (
    <>
      <PageHeading
        title="Record a payment"
        description={`Chapter dues entry — ${formatCentavos(amount)} per member, due monthly. Prefilled for ${billingMonthLabel(month)}.`}
        actions={
          <Link href="/admin/contributions" className="a-btn a-btn-secondary">← Back to ledger</Link>
        }
      />
      {!ready ? <MigrationNotice /> : null}
      {ready ? (
        <RecordPaymentForm defaultBillingMonth={month} defaultAmountCents={amount} />
      ) : null}
    </>
  );
}

function MigrationNotice() {
  return (
    <section className="a-card border-a-warning/40 bg-a-warning-soft/50 p-5" role="alert">
      <h2 className="text-sm font-bold text-a-warning">Database migration needed</h2>
      <p className="mt-1 text-sm text-a-secondary">
        Run <code className="font-mono text-xs">npm run db:migrate-contributions</code> once, then reload.
      </p>
    </section>
  );
}
