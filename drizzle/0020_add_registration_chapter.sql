-- 0020: Chapter chosen during neophyte registration.
-- The public neophyte registration form asks which PGPGS chapter the applicant
-- is registering under and stores it here. On approval the value is copied to
-- pgpmembers.member_chapter, which is the column every chapter-scoped
-- Neophyte Status query filters on.
-- Idempotent: safe to run multiple times.

ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "chapter" text;

-- Chapter officer lookups resolve their scope by comparing this column.
CREATE INDEX IF NOT EXISTS "registrations_chapter_idx"
  ON "registrations" ("chapter");

-- Supports the member directory's chapter filter, which now also has to match
-- rows created through the neophyte workflow.
CREATE INDEX IF NOT EXISTS "pgpmembers_member_chapter_idx"
  ON "pgpmembers" ("member_chapter");