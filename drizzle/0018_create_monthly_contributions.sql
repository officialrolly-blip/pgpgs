-- 0018: Monthly member contributions (chapter dues ledger).
-- Full dues system: fixed monthly rate, per-member monthly bills,
-- partial payments, arrears tracking, and audit trail for receipts.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS "contribution_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "monthly_amount_cents" integer NOT NULL DEFAULT 10000 CHECK ("monthly_amount_cents" >= 0),
  "due_day" integer NOT NULL DEFAULT 15 CHECK ("due_day" BETWEEN 1 AND 28),
  "currency" text NOT NULL DEFAULT 'PHP',
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text
);

INSERT INTO "contribution_settings" ("id", "monthly_amount_cents", "due_day", "currency")
VALUES (1, 10000, 15, 'PHP')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "monthly_contributions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_pk" uuid NOT NULL REFERENCES "pgpmembers" ("id") ON DELETE CASCADE,
  "billing_month" text NOT NULL CHECK ("billing_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  "amount_due_cents" integer NOT NULL CHECK ("amount_due_cents" >= 0),
  "amount_paid_cents" integer NOT NULL DEFAULT 0 CHECK ("amount_paid_cents" >= 0),
  "status" text NOT NULL DEFAULT 'unpaid', -- unpaid | partial | paid | waived
  "payment_method" text, -- cash | gcash | bank | maya | other
  "reference_number" text,
  "note" text,
  "paid_at" timestamp with time zone,
  "recorded_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "monthly_contributions_member_month_unique" UNIQUE ("member_pk", "billing_month")
);

CREATE INDEX IF NOT EXISTS "monthly_contributions_member_idx" ON "monthly_contributions" ("member_pk");
CREATE INDEX IF NOT EXISTS "monthly_contributions_month_idx" ON "monthly_contributions" ("billing_month");
CREATE INDEX IF NOT EXISTS "monthly_contributions_status_idx" ON "monthly_contributions" ("status", "billing_month");
