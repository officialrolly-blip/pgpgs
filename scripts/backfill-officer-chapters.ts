/* Backfills pgpmembers.member_chapter for former / current officers whose
   chapter is NULL.

   Why this exists
   ---------------
   The member form only renders a chapter selector for the "Member" and
   "Alumni" statuses (components/admin/member-form.tsx). Officers and former
   officers have no chapter field, while parseMemberForm() defaults
   member_chapter to null — so editing those records leaves them with no
   chapter. A NULL chapter can never match a chapter-scoped view
   (NULL = 'text' is unknown in SQL), which hid these people from
   chapter-scoped dashboards and from GET /api/v1/members.

   This is a DATA fix, not a schema change. It is idempotent: it only touches
   rows where member_chapter IS NULL, and it verifies the target chapter exists
   in the chapters table before writing anything.

   Usage
   -----
     npm run db:backfill-officer-chapters            # dry run (default)
     npm run db:backfill-officer-chapters -- --apply # writes to the database

   The dry run prints exactly which rows would change so the values can be
   reviewed before anything is written.
*/
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const TARGET_CHAPTER = "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter";
const APPLY = process.argv.includes("--apply");

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

  // Safety net: never write a chapter that is not a real, published chapter.
  const [chapter] = await sql.query(
    "SELECT chapter_name FROM chapters WHERE lower(chapter_name) = lower($1)",
    [TARGET_CHAPTER],
  );
  if (!chapter) {
    throw new Error(
      `Chapter "${TARGET_CHAPTER}" was not found in the chapters table. ` +
        `Nothing was changed. Check the exact name first.`,
    );
  }

  // Only NULL rows. Rows that already carry a (possibly short-form) chapter are
  // left untouched — those already match via the prefix-tolerant filter.
  const rows = await sql.query(
    `SELECT id, member_id, first_name, last_name, status
       FROM pgpmembers
      WHERE member_chapter IS NULL
        AND status <> 'Neophyte'
      ORDER BY last_name, first_name`,
  );

  console.log(`Target chapter : ${TARGET_CHAPTER}`);
  console.log(`Mode           : ${APPLY ? "APPLY (writes)" : "DRY RUN (no writes)"}`);
  console.log(`Rows to update : ${rows.length}\n`);

  for (const row of rows) {
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
    console.log(`  [${row.status}] ${name} (${row.member_id})`);
  }

  if (rows.length === 0) {
    console.log("\nNothing to backfill.");
    return;
  }

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
    return;
  }

  const ids = rows.map((row) => row.id);
  const updated = await sql.query(
    `UPDATE pgpmembers
        SET member_chapter = $1
      WHERE id = ANY($2::uuid[])
      RETURNING id`,
    [TARGET_CHAPTER, ids],
  );

  console.log(`\nUpdated ${updated.length} row(s) to "${TARGET_CHAPTER}".`);

  const remaining = await sql.query(
    "SELECT count(*)::int AS n FROM pgpmembers WHERE member_chapter IS NULL AND status <> 'Neophyte'",
  );
  console.log(`Non-neophyte members still missing a chapter: ${remaining[0].n}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});