import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnv(file: string) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      let value = raw.trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {}
}

async function main() {
  for (const file of [".env.local", ".env"]) loadEnv(file);
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS "registration_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "registration_id" uuid NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
    "token_hash" text NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS "registration_sessions_registration_id_idx" ON "registration_sessions" ("registration_id")`;
  await sql`CREATE INDEX IF NOT EXISTS "registration_sessions_expires_at_idx" ON "registration_sessions" ("expires_at")`;
  console.log("Registration session table is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});