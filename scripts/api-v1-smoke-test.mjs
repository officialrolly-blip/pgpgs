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

    const myBillsRes = await fetch(`${BASE}/api/v1/contributions/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const myBillsJson = await myBillsRes.json().catch(() => ({}));
    check(
      "GET /api/v1/contributions/me with member token → 200",
      myBillsRes.status === 200 && Array.isArray(myBillsJson.bills),
      `${myBillsJson.bills?.length ?? 0} bill(s)`,
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

  // --- Admin auth + contributions endpoints -------------------------------
  const adminMissing = await fetch(`${BASE}/api/v1/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  check("POST /api/v1/auth/admin-login with missing fields → 400", adminMissing.status === 400);

  const badAdminLogin = await fetch(`${BASE}/api/v1/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "no-such-admin@example.com", password: "wrong" }),
  });
  check("POST /api/v1/auth/admin-login with invalid credentials → 401", badAdminLogin.status === 401);

  const listNoAuth = await fetch(`${BASE}/api/v1/contributions`);
  check("GET /api/v1/contributions without admin token → 401", listNoAuth.status === 401);

  const summaryNoAuth = await fetch(`${BASE}/api/v1/contributions/summary`);
  check("GET /api/v1/contributions/summary without admin token → 401", summaryNoAuth.status === 401);

  const settingsNoAuth = await fetch(`${BASE}/api/v1/contributions/settings`);
  check("GET /api/v1/contributions/settings without admin token → 401", settingsNoAuth.status === 401);

  const receiptsNoAuth = await fetch(`${BASE}/api/v1/contributions/receipts?member=x`);
  check("GET /api/v1/contributions/receipts without admin token → 401", receiptsNoAuth.status === 401);

  const deleteNoAuth = await fetch(`${BASE}/api/v1/contributions/00000000-0000-0000-0000-000000000000`, { method: "DELETE" });
  check("DELETE /api/v1/contributions/{id} without admin token → 401", deleteNoAuth.status === 401);

  // Create a temporary admin session directly in the database (same shape the
  // admin-login endpoint produces) to exercise the bearer flow, then revoke it
  // via admin-logout. No other data is modified.
  const [adminUser] = await sql`
    SELECT id, email FROM admin_users LIMIT 1
  `;

  if (!adminUser) {
    check(
      "Admin bearer flow (skipped — no admin_users rows yet; create an admin first)",
      true,
    );
  } else {
    const adminToken = randomBytes(32).toString("base64url");
    const adminTokenHash = createHash("sha256").update(adminToken).digest("hex");
    const adminExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO admin_sessions (user_id, token_hash, expires_at)
      VALUES (${adminUser.id}, ${adminTokenHash}, ${adminExpiresAt})
    `;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    const settingsRes = await fetch(`${BASE}/api/v1/contributions/settings`, {
      headers: adminHeaders,
    });
    check(
      "GET /api/v1/contributions/settings with admin token → 200",
      settingsRes.status === 200,
    );

    const listRes = await fetch(`${BASE}/api/v1/contributions`, {
      headers: adminHeaders,
    });
    check(
      "GET /api/v1/contributions with admin token → 200 (or 503 pre-migration)",
      listRes.status === 200 || listRes.status === 503,
      `status ${listRes.status}`,
    );

    const summaryRes = await fetch(`${BASE}/api/v1/contributions/summary`, {
      headers: adminHeaders,
    });
    check(
      "GET /api/v1/contributions/summary → 200 (or 503 pre-migration)",
      summaryRes.status === 200 || summaryRes.status === 503,
      `status ${summaryRes.status}`,
    );

    const adminLogoutRes = await fetch(`${BASE}/api/v1/auth/admin-logout`, {
      method: "POST",
      headers: adminHeaders,
    });
    check("POST /api/v1/auth/admin-logout revokes the admin token", adminLogoutRes.status === 200);

    const settingsAfter = await fetch(`${BASE}/api/v1/contributions/settings`, {
      headers: adminHeaders,
    });
    check("Revoked admin token is rejected → 401", settingsAfter.status === 401);
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