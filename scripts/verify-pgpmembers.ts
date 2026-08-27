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

async function main() {
  const sql = neon(url as string);
  const tables: { tablename: string }[] = (await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`) as { tablename: string }[];
  console.log("public tables:", tables.map((r) => r.tablename).join(", "));
  const cols: { table_name: string; column_name: string }[] = (await sql`SELECT table_name, column_name FROM information_schema.columns WHERE table_name = 'pgpmembers' ORDER BY ordinal_position`) as { table_name: string; column_name: string }[];
  console.log("pgpmembers columns:", cols.map((r) => r.column_name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});