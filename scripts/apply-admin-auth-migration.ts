/* Applies drizzle/0006_create_admin_auth.sql to the Neon database.
   Uses the direct (unpooled) connection string as recommended for schema
   migrations. Run with: npm run db:migrate-admin
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

  const sqlText = readFileSync("drizzle/0006_create_admin_auth.sql", "utf8");
  const sql = neon(url);
  // The Neon HTTP driver executes one statement per call, so split the
  // migration file into its individual statements (no semicolons appear
  // inside string literals in this migration).
  const statements = sqlText
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied 0006_create_admin_auth.sql (${statements.length} statements, idempotent)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
