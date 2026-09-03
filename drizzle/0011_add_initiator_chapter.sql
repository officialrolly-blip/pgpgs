-- Add PGPGS chapter to former initiator (Master Initiator / Lady Initiator) records.

ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "former_master_initiator_chapter" text,
  ADD COLUMN IF NOT EXISTS "former_lady_initiator_chapter" text;