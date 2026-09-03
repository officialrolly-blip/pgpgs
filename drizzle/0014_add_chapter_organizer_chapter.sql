-- Add the PGPGS chapter associated with a Chapter Organizer.

ALTER TABLE "pgpmembers"
  ADD COLUMN IF NOT EXISTS "chapter_organizer_chapter" text;