/* Applies drizzle/0010_add_chapter_review_workflow.sql to the Neon database.
   Uses the direct (unpooled) connection string for schema migrations.
   Run with: npm run db:migrate-chapter-workflow

   When the "status" column is added for the first time, chapters that already
   existed are marked "published": they were visible on the public site before
   the review workflow, so their behavior must not change.
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

function resultRows<T>(result: unknown): T[] {
  // The Neon HTTP driver has returned both plain row arrays and
  // { rows: [...] } shapes across versions; normalize both.
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function main() {
  for (const file of [".env.local", ".env"]) loadEnv(file);
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");

  const sql = neon(url);

  const statusCheck = await sql.query(
    `select exists (
       select 1 from information_schema.columns
       where table_name = 'chapters' and column_name = 'status'
     ) as present`,
  );
  const columnExisted = resultRows<{ present: boolean }>(statusCheck)[0]?.present === true;

  const sqlText = readFileSync("drizzle/0010_add_chapter_review_workflow.sql", "utf8");
  // Neon HTTP prepared statements accept one command at a time.
  for (const statement of sqlText.split(/;\s*(?=\n|$)/).map((value) => value.trim()).filter(Boolean)) {
    await sql.query(statement);
  }
  console.log("Applied 0010_add_chapter_review_workflow.sql (idempotent)");

  if (!columnExisted) {
    await sql.query(
      `update "chapters"
       set "status" = 'published',
           "published_at" = coalesce("published_at", "created_at"),
           "reviewed_at" = coalesce("reviewed_at", "created_at"),
           "reviewed_by" = coalesce("reviewed_by", 'pre-workflow import')
       where "status" = 'pending'`,
    );
    console.log('Backfilled existing chapters to "published".');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});