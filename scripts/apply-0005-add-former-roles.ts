/* One-off script to apply drizzle/0005_add_former_roles.sql to the Neon database.
   Uses the direct (unpooled) connection string as recommended for schema migrations.
   Run with: npx tsx scripts/apply-0005-add-former-roles.ts
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
    // ignore if file missing
  }
}

async function main() {
  for (const file of [".env.local", ".env"]) loadEnv(file);

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");
  }

  const sqlText = readFileSync("drizzle/0005_add_former_roles.sql", "utf8");
  const sql = neon(url);
  await sql.query(sqlText);
  console.log("Applied 0005_add_former_roles.sql (idempotent)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});