-- Adds Former Chapter Vice President details (chapter, role, term dates)
-- and role selection for Former Chapter Master Initiator / Former Chapter Lady Initiator.
ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "former_vice_president_chapter" text,
  ADD COLUMN IF NOT EXISTS "former_vice_president_role" text,
  ADD COLUMN IF NOT EXISTS "former_vice_president_start" text,
  ADD COLUMN IF NOT EXISTS "former_vice_president_end" text,
  ADD COLUMN IF NOT EXISTS "former_master_initiator_role" text,
  ADD COLUMN IF NOT EXISTS "former_lady_initiator_role" text;