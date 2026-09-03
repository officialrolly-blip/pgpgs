-- 0010: Review workflow for the "PGPGS Across Capiz" chapter registry.
-- Chapters submitted through the public form start as "pending" and only
-- appear on the public site after an administrator publishes them.
-- Idempotent: safe to run multiple times.

ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'pending';
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "published_by" text;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;
ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "reviewed_by" text;

CREATE INDEX IF NOT EXISTS "chapters_status_idx"
  ON "chapters" ("status");