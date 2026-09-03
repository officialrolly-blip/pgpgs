/* End-to-end login flow test (progressive-enhancement server action POST). */
const BASE = "http://localhost:3000";

/** Extracts every hidden input from the login form as [name, value] pairs. */
function extractActionFields(html) {
  const fields = [];
  const re = /<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/?>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    fields.push([m[1], m[2]?.replaceAll("&quot;", '"') ?? ""]);
  }
  return fields;
}

async function postLogin(email, password) {
  const page = await fetch(`${BASE}/admin/login`);
  const html = await page.text();
  const cookieHeader = (page.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");

  const form = new FormData();
  for (const [name, value] of extractActionFields(html)) {
    form.set(name, value);
  }
  form.set("email", email);
  form.set("password", password);
  form.set("next", "/admin");

  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    body: form,
    headers: { cookie: cookieHeader },
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const session = setCookies.find((c) => c.startsWith("pgpgs_admin_session="));
  return { status: res.status, sessionCookie: session?.split(";")[0] ?? null, body: await res.text() };
}

const bad = await postLogin("admin@pgpgsroxascity.com", "definitely-wrong-password");
console.log("wrong password ->", bad.status, "session set:", Boolean(bad.sessionCookie));

const good = await postLogin("admin@pgpgsroxascity.com", "PGPGS-admin-2026#Roxas");
console.log("correct password ->", good.status, "session set:", Boolean(good.sessionCookie));

if (good.sessionCookie) {
  const dash = await fetch(`${BASE}/admin`, {
    headers: { cookie: good.sessionCookie },
    redirect: "manual",
  });
  const html = await dash.text();
  console.log("dashboard with session ->", dash.status, "welcome:", html.includes("Welcome back"));
}
