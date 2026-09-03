/* Utility script to view real alumni data in the pgpmembers table (Neon Postgres).
   Lists every member whose status is one of the alumni-group statuses:
   Alumni, Former Chapter President, Former Chapter Vice President,
   Former Chapter Master Initiator, Former Chapter Lady Initiator, Grand Knights.
   Run with: npx tsx scripts/view-alumni-data.ts
*/
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined)
        process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
    }
  } catch {}
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("No database URL");

const ALUMNI_STATUSES = [
  "Alumni",
  "Former Chapter President",
  "Former Chapter Vice President",
  "Former Chapter Master Initiator",
  "Former Chapter Lady Initiator",
  "Grand Knights",
];

async function main() {
  const sql = neon(url as string);

  // All statuses present in the table
  const allStatuses = (await sql`SELECT status, count(*) FROM pgpmembers GROUP BY status ORDER BY status`) as { status: string; count: string }[];
  console.log("=== Status counts (all pgpmembers) ===");
  for (const row of allStatuses) console.log(`${row.status}: ${row.count}`);

  // All alumni-group members with full details
  const placeholders = ALUMNI_STATUSES.map((_, i) => `$${i + 1}`).join(", ");
  const rows = (await sql.query(
    `SELECT * FROM pgpmembers WHERE status IN (${placeholders}) ORDER BY date_survived ASC, created_at ASC`,
    ALUMNI_STATUSES,
  )) as Record<string, unknown>[];

  console.log(`\n=== Alumni-group members (${rows.length}) ===`);
  for (const row of rows) {
    console.log("\n----- member -----");
    for (const [key, value] of Object.entries(row)) {
      console.log(`${key}: ${value === null || value === "" ? "(empty)" : String(value)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
