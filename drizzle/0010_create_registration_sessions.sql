-- Applicant sessions for checking membership application status.

CREATE TABLE IF NOT EXISTS "registration_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "registration_sessions_registration_id_idx"
  ON "registration_sessions" ("registration_id");

CREATE INDEX IF NOT EXISTS "registration_sessions_expires_at_idx"
  ON "registration_sessions" ("expires_at");