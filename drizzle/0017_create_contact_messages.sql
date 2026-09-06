-- 0017: Contact messages submitted through the public "Get in touch" form.
-- Read by admins in the dashboard Inbox.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS "contact_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "contact_number" text,
  "subject" text,
  "message" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unread', -- unread | read
  "read_at" timestamp with time zone,
  "read_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "contact_messages_status_idx" ON "contact_messages" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "contact_messages_created_at_idx" ON "contact_messages" ("created_at");