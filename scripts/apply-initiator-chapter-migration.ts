/* Applies drizzle/0011_add_initiator_chapter.sql to the Neon database.
   Uses the direct (unpooled) connection string for schema migrations.
   Run with: npm run db:migrate-initiator-chapter

   Adds the "former_master_initiator_chapter" and "former_lady_initiator_chapter"
   columns to store which PGPGS Chapter a Former Chapter Master/Lady Initiator
   served, mirroring the existing former president / vice president chapter fields.
   Idempotent: safe to run multiple times.
*/
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
      value = value.replace(/\\n/g, "\n");
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Ignore missing env files; the validation below gives the useful error.
  }
}

async function main() {
  for (const file of [".env.local", ".env"]) loadEnv(file);
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");

  const sql = neon(url);
  const sqlText = readFileSync("drizzle/0011_add_initiator_chapter.sql", "utf8");
  // Neon HTTP prepared statements accept one command at a time.
  for (const statement of sqlText.split(/;\s*(?=\n|$)/).map((value) => value.trim()).filter(Boolean)) {
    await sql.query(statement);
  }
  console.log("Applied 0011_add_initiator_chapter.sql (idempotent)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});