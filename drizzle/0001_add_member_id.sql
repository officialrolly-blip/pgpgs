ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "member_id" text;

WITH numbered_registrations AS (
  SELECT
    id,
    'PGPGS-' || EXTRACT(YEAR FROM created_at)::integer || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at, id)::text, 4, '0') AS generated_member_id
  FROM registrations
  WHERE member_id IS NULL
)
UPDATE registrations
SET member_id = numbered_registrations.generated_member_id
FROM numbered_registrations
WHERE registrations.id = numbered_registrations.id;

ALTER TABLE "registrations" ALTER COLUMN "member_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "registrations_member_id_unique" ON "registrations" USING btree ("member_id");
