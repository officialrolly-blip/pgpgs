-- 0019: Officer login roles (Provincial Council + Chapter officers).
-- Adds chapter scoping to admin_users so the superadmin can create
-- secretary/treasurer accounts that are restricted to either the whole
-- directory (provincial scope) or a single chapter (chapter scope).
-- Idempotent: safe to run multiple times.

ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "assigned_chapter" text;
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "officer_title" text;

CREATE INDEX IF NOT EXISTS "admin_users_role_idx" ON "admin_users" ("role");
CREATE INDEX IF NOT EXISTS "admin_users_assigned_chapter_idx" ON "admin_users" ("assigned_chapter");
