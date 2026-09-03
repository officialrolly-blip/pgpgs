-- 0007: Track the neophyte formation workflow and certification audit trail.
-- Idempotent: safe to run multiple times.

ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "neophyte_status" text,
  ADD COLUMN IF NOT EXISTS "neophyte_status_updated_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "neophyte_status_updated_by" text,
  ADD COLUMN IF NOT EXISTS "neophyte_certification_issued_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "neophyte_certification_issued_by" text;

CREATE INDEX IF NOT EXISTS "pgpmembers_neophyte_status_idx"
  ON "pgpmembers" ("neophyte_status");
