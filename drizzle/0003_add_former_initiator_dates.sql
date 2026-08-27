ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "former_master_initiator_start" text,
  ADD COLUMN IF NOT EXISTS "former_master_initiator_end" text,
  ADD COLUMN IF NOT EXISTS "former_lady_initiator_start" text,
  ADD COLUMN IF NOT EXISTS "former_lady_initiator_end" text;