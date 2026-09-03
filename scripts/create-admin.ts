/* Creates or resets an admin user for the PGPGS admin dashboard.

   Usage:
     npm run create-admin -- --email you@example.com --name "Your Name" --password "strongPassword123" [--role superadmin]

   - Password requirements: at least 12 characters.
   - If the email already exists, the password/name/role are updated and the
     account is unlocked + re-activated.
*/
import { readFileSync } from "node:fs";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scrypt = promisify(scryptCallback);

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

function argValue(flag: string): string {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    console.error(`Missing required argument: ${flag} <value>`);
    process.exit(1);
  }
  return process.argv[index + 1];
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  for (const file of [".env.local", ".env"]) loadEnv(file);

  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");
  }

  const email = argValue("--email").trim().toLowerCase();
  const name = argValue("--name").trim();
  const password = argValue("--password");
  const role = (process.argv.includes("--role") ? argValue("--role") : "admin").toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please provide a valid email address.");
  }
  if (!name) throw new Error("Please provide a name with --name.");
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters long.");
  }
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("--role must be either \"admin\" or \"superadmin\".");
  }

  const passwordHash = await hashPassword(password);
  const sql = neon(url);

  await sql`
    INSERT INTO admin_users (email, name, password_hash, role, is_active, updated_at)
    VALUES (${email}, ${name}, ${passwordHash}, ${role}, true, now())
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password_hash = EXCLUDED.password_hash,
      role = EXCLUDED.role,
      is_active = true,
      failed_login_attempts = 0,
      locked_until = NULL,
      updated_at = now()
  `;

  console.log(`Admin user ready: ${email} (role: ${role})`);
  console.log("You can now sign in at /admin/login");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
