#!/usr/bin/env node
/* End-to-end HTTP check of the Neophyte Status module as a chapter officer.
 *
 * Logs in through the real admin-login endpoint, then asserts on the rendered
 * HTML that:
 *   - "Neophyte status" appears in the sidebar navigation
 *   - the chapter officer's own chapter neophyte is listed
 *   - the other chapter's neophyte is NOT present anywhere in the response
 *   - the scope banner names the assigned chapter
 *   - the certificate route 404s for a cross-chapter neophyte
 *   - an unauthenticated request is redirected to the login page
 *
 * Usage: node scripts/verify-neophyte-http.mjs <secretaryEmail> <password> <foreignNeophyteId>
 */
const base = process.env.BASE_URL ?? "http://localhost:3000";
const [email, password, foreignId] = process.argv.slice(2);

let failures = 0;
function check(label, pass, detail = "") {
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${pass || !detail ? "" : `\n        ${detail}`}`);
}

const jar = [];

/**
 * The v1 admin-login endpoint returns an opaque bearer token rather than a
 * cookie. The dashboard's own guard (lib/auth.ts#findAdminUserBySessionToken)
 * also accepts that same token in the SESSION_COOKIE_NAME cookie, so we set it
 * by hand to drive the real server-rendered pages.
 */
const SESSION_COOKIE = "pgpgs_admin_session";

function cookieHeader() {
  return jar.map((c) => `${c[0]}=${c[1]}`).join("; ");
}

const login = await fetch(`${base}/api/v1/auth/admin-login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const loginBody = await login.json().catch(() => ({}));
check(`login as ${email} succeeds`, login.ok, JSON.stringify(loginBody));
if (!login.ok || !loginBody.token) process.exit(1);
jar.push([SESSION_COOKIE, loginBody.token]);
check("session resolves to a chapter-scoped role", loginBody.admin?.role === "chapter_secretary", loginBody.admin?.role);

const page = await fetch(`${base}/admin/neophytes`, {
  headers: { Cookie: cookieHeader() },
  redirect: "manual",
});
const html = await page.text();
check("GET /admin/neophytes is not a redirect (chapter officer may open it)", page.status === 200, `status ${page.status}`);

console.log("\n== navigation ==");
// React's SSR emits <!-- --> separators between adjacent text/expression
// nodes, so assertions strip comments before matching.
const text = html.replace(/<!--[\s\S]*?-->/g, "");
check('sidebar renders the "Neophyte status" nav link', /href="\/admin\/neophytes"[^>]*>\s*(?:<[^>]*>\s*)*Neophyte status/.test(text), text.slice(text.indexOf('href="/admin/neophytes"'), text.indexOf('href="/admin/neophytes"') + 400));
check("nav link is inside the sidebar nav landmark", /<nav[^>]*aria-label="Admin"[\s\S]*?Neophyte status/.test(text));
check("no province-wide-only section leaked into the sidebar", !/href="\/admin\/registrations"/.test(text) && !/href="\/admin\/chapters"/.test(text));

console.log("\n== chapter scope ==");
check("scope banner names the assigned chapter", /Scope:\s*VERIFY-[A-Z0-9]+ Alpha Chapter/.test(text));
check("banner states other chapters are hidden", text.includes("neophytes from other chapters are hidden"));
check("own-chapter neophyte is listed", text.includes("Test Neophyte"));
check("own chapter is shown on the card", /Chapter[\s\S]{0,400}?VERIFY-MUUTZB1U Alpha Chapter/.test(text));

console.log("\n== data isolation ==");
check(
  "foreign neophyte id is absent from the payload",
  !html.includes(foreignId),
  `foreign id ${foreignId} leaked into the page`,
);
check(
  "foreign chapter name is absent from the payload",
  !/Beta Chapter/.test(html),
  "the other chapter's name leaked into the page",
);

console.log("\n== module features ==");
check("create entry point is present", html.includes("/admin/neophytes/new"));
check("search box is present", html.includes('name="q"'));
check("stage filter is present", html.includes('name="status"'));
check("update-stage control is present", html.includes('name="neophyteStatus"'));
check("delete sentinel is offered to a chapter secretary", html.includes("Failed to Comply"));

console.log("\n== certificate route scoping ==");
const foreignCert = await fetch(`${base}/admin/neophytes/${foreignId}/certificate`, {
  headers: { Cookie: cookieHeader() },
  redirect: "manual",
});
check("cross-chapter certificate is not served", foreignCert.status === 404, `status ${foreignCert.status}`);

console.log("\n== unauthenticated access ==");
const anon = await fetch(`${base}/admin/neophytes`, { redirect: "manual" });
check("anonymous request is redirected to login", anon.status === 307 || anon.status === 302 || anon.status === 303, `status ${anon.status}`);
check("redirect targets the login page", String(anon.headers.get("location") ?? "").includes("/admin/login"), anon.headers.get("location") ?? "");

console.log(`\n${failures === 0 ? "ALL HTTP CHECKS PASSED" : `${failures} HTTP CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
