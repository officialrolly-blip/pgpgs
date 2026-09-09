// Smoke test for the REST API v1 (see docs/api-v1.md).
//
// Usage:  node scripts/api-v1-smoke-test.mjs [baseUrl]
// Requires the dev server (or deployment) to be running.
//
// Reads DATABASE_URL from .env.local / .env to create a temporary member
// session directly in the database for the auth checks, then revokes it via
// the logout endpoint. No data is modified beyond that temporary session.
import { readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

function loadEnv(file) {
  try {
    const content = readFileSync(file, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env files are optional for the public-endpoint checks.
  }
}

loadEnv(".env.local");
loadEnv(".env");

const BASE = process.argv[2] ?? "http://localhost:3000";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured — cannot run the auth checks.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const results = [];

function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

async function main() {
  // --- Public endpoints -----------------------------------------------------
  const newsRes = await fetch(`${BASE}/api/v1/news?limit=3`);
  const newsJson = await newsRes.json().catch(() => ({}));
  check(
    "GET /api/v1/news returns published posts",
    newsRes.status === 200 && Array.isArray(newsJson.posts),
    `${newsJson.posts?.length ?? 0} post(s)`,
  );

  const slug = newsJson.posts?.[0]?.slug;
  if (slug) {
    const postRes = await fetch(`${BASE}/api/v1/news/${encodeURIComponent(slug)}`);
    const postJson = await postRes.json().catch(() => ({}));
    check(
      "GET /api/v1/news/[slug] returns the full post",
      postRes.status === 200 && postJson.post?.body !== undefined,
      slug,
    );
  } else {
    check("GET /api/v1/news/[slug] (skipped — no published posts)", true);
  }

  const chaptersRes = await fetch(`${BASE}/api/v1/chapters`);
  const chaptersJson = await chaptersRes.json().catch(() => ({}));
  check(
    "GET /api/v1/chapters returns published chapters",
    chaptersRes.status === 200 && Array.isArray(chaptersJson.chapters),
    `${chaptersJson.chapters?.length ?? 0} chapter(s)`,
  );

  const officersRes = await fetch(`${BASE}/api/v1/officers`);
  const officersJson = await officersRes.json().catch(() => ({}));
  check(
    "GET /api/v1/officers returns officers",
    officersRes.status === 200 && Array.isArray(officersJson.officers),
    `${officersJson.officers?.length ?? 0} officer(s)`,
  );

  // --- Auth flow --------------------------------------------------------------
  const meNoAuth = await fetch(`${BASE}/api/v1/auth/me`);
  check("GET /api/v1/auth/me without token → 401", meNoAuth.status === 401);

  const badLogin = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId: "SMOKE-TEST-NO-SUCH-ID", password: "wrong" }),
  });
  check("POST /api/v1/auth/login with invalid credentials → 401", badLogin.status === 401);

  // Create a temporary session directly in the database (same shape the
  // login endpoint produces) to exercise the bearer-token flow.
  const [credential] = await sql`
    SELECT mc.id AS credential_id, mc.member_id
    FROM member_credentials mc
    LIMIT 1
  `;

  if (!credential) {
    check(
      "Bearer flow (skipped — no member_credentials rows yet; verify a member on the website first)",
      true,
    );
  } else {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO member_sessions (credential_id, token_hash, expires_at)
      VALUES (${credential.credential_id}, ${tokenHash}, ${expiresAt})
    `;

    const meRes = await fetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meJson = await meRes.json().catch(() => ({}));
    // member_credentials stores IDs uppercase while pgpmembers keeps the
    // original casing, so compare case-insensitively.
    const memberIdMatches =
      typeof meJson.member?.memberId === "string" &&
      meJson.member.memberId.toUpperCase() === credential.member_id.toUpperCase();
    check(
      "GET /api/v1/auth/me with bearer token → 200",
      meRes.status === 200 && memberIdMatches,
      meJson.member?.fullName ?? "",
    );

    const logoutRes = await fetch(`${BASE}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    check("POST /api/v1/auth/logout revokes the token", logoutRes.status === 200);

    const meAfter = await fetch(`${BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check("Revoked token is rejected → 401", meAfter.status === 401);
  }

  const failed = results.filter((ok) => !ok).length;
  console.log(
    failed === 0
      ? `\nAll API v1 smoke tests passed (${results.length}/${results.length}).`
      : `\n${failed} of ${results.length} smoke test(s) failed.`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Smoke test crashed:", error);
  process.exit(1);
});