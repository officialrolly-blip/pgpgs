-- 0008: Chapter registry for the "PGPGS Across Capiz" section.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS "chapters" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chapter_name" text NOT NULL UNIQUE,
  "chapter_address" text NOT NULL,
  "chapter_organizer" text NOT NULL,
  "logo_url" text,
  "president_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "vice_president_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "secretary_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "treasurer_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "master_initiator_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "master_initiator_role" text,
  "lady_initiator_id" uuid REFERENCES "pgpmembers"("id") ON DELETE SET NULL,
  "lady_initiator_role" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chapters_chapter_name_idx"
  ON "chapters" ("chapter_name");