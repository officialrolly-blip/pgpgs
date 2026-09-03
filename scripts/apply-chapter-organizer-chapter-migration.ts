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
  await sql`ALTER TABLE "pgpmembers" ADD COLUMN IF NOT EXISTS "chapter_organizer_chapter" text`;
  console.log("Chapter Organizer chapter column is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});