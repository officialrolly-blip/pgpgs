// Shared vocabulary for the monthly-dues ledger, used by the admin
// contributions dashboard, member portal, and server actions.
export const CONTRIBUTION_STATUSES = [
  "unpaid",
  "partial",
  "paid",
  "waived",
] as const;

export const CONTRIBUTION_STATUS_LABELS: Record<
  (typeof CONTRIBUTION_STATUSES)[number],
  string
> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
  waived: "Waived",
};

export const CONTRIBUTION_PAYMENT_METHODS = [
  "cash",
  "gcash",
  "maya",
  "bank",
  "other",
] as const;

export const CONTRIBUTION_PAYMENT_METHOD_LABELS: Record<
  (typeof CONTRIBUTION_PAYMENT_METHODS)[number],
  string
> = {
  cash: "Cash",
  gcash: "GCash",
  maya: "Maya",
  bank: "Bank transfer",
  other: "Other",
};

export const DEFAULT_MONTHLY_DUES_CENTS = 10000; // ₱100.00
export const DEFAULT_DUES_DUE_DAY = 15;

export function formatCentavos(cents: number, currency = "PHP"): string {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `₱${(cents / 100).toFixed(2)}`;
  }
}

export function currentBillingMonth(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function billingMonthLabel(billingMonth: string): string {
  const match = billingMonth.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!match) return billingMonth;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}
