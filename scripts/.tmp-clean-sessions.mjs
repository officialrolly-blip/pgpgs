import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
      }
    }
  } catch {}
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const sql = neon(url);
const result = await sql`DELETE FROM admin_sessions WHERE ip_address IS NULL AND user_agent IS NULL RETURNING id`;
console.log(`Deleted ${result.length} test session(s). Remaining sessions: ${(await sql`SELECT count(*) FROM admin_sessions`)[0].count}`);
