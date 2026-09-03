/* Distinguishes which page renders at /admin with a fresh login session. */
const BASE = "http://localhost:3000";

function extractActionFields(html) {
  const fields = [];
  const re = /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/?>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    fields.push([m[1], m[2]?.replaceAll("&quot;", '"') ?? ""]);
  }
  return fields;
}

const page = await fetch(`${BASE}/admin/login`);
const html = await page.text();
const cookieHeader = (page.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0])
  .join("; ");

const form = new FormData();
for (const [name, value] of extractActionFields(html)) form.set(name, value);
form.set("email", "admin@pgpgsroxascity.com");
form.set("password", "PGPGS-admin-2026#Roxas");
form.set("next", "/admin");

const res = await fetch(`${BASE}/admin/login`, {
  method: "POST",
  body: form,
  headers: { cookie: cookieHeader },
  redirect: "manual",
});
const session = (res.headers.getSetCookie?.() ?? []).find((c) => c.startsWith("pgpgs_admin_session="))?.split(";")[0];
console.log("login status:", res.status, "session:", Boolean(session));

const dash = await fetch(`${BASE}/admin`, { headers: { cookie: session } });
const body = await dash.text();
console.log("dashboard status:", dash.status);
console.log("marker checks:", {
  totalMembers: body.includes("Total Members"),
  memberDirectory: body.includes("Member Directory") || body.includes("Latest applications"),
  signInForm: body.includes("Sign in to your account"),
  welcomeChunk: body.match(/elcome[^"]{0,60}/)?.[0] ?? "(none)",
});
