-- Add the PGPGS chapter associated with a Grand Knight role.

ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "grand_knight_chapter" text;