-- add vice president role to chapter records

ALTER TABLE "chapters"
  ADD COLUMN IF NOT EXISTS "vice_president_role" text;