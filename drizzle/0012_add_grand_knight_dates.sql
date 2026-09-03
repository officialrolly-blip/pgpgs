-- Add term dates for former Grand Knights.

ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "grand_knight_start" text,
  ADD COLUMN IF NOT EXISTS "grand_knight_end" text;