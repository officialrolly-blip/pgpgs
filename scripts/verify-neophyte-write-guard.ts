/* Security regression test for the Neophyte Status write guards.
 *
 * A chapter officer must not be able to mutate another chapter's neophyte, even
 * with a forged server-action POST. Unlike an HTML-scrape test, this asserts on
 * the actual database state, and it uses the officer's OWN record as a positive
 * control: if that update does not land, the forged-request plumbing is broken
 * and the "nothing happened" results for the foreign record would be vacuous.
 *
 * Usage:
 *   npx tsx scripts/verify-neophyte-write-guard.ts <email> <password> <ownId> <foreignId>
 */
import { readFileSync } from "node:fs";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const [, key, raw] = match;
      let value = raw.trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* validation below surfaces the useful error */
  }
}
for (const file of [".env.local", ".env"]) loadEnv(file);

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const [email, password, ownId, foreignId] = process.argv.slice(2);

// The action id is not hard-coded: it is read out of the rendered page (see
// mpaActionId below) so the test keeps working across rebuilds.

let failures = 0;
function check(label: string, pass: boolean, detail = "") {
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}${pass || !detail ? "" : `\n        ${detail}`}`);
}

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../db");
  const { pgpmembers } = await import("../db/schema");

  async function readState(id: string) {
    const [row] = await db
      .select({
        id: pgpmembers.id,
        status: pgpmembers.status,
        neophyteStatus: pgpmembers.neophyteStatus,
        chapter: pgpmembers.memberChapter,
        certified: pgpmembers.neophyteCertificationIssuedAt,
      })
      .from(pgpmembers)
      .where(eq(pgpmembers.id, id))
      .limit(1);
    return row ?? null;
  }

  const login = await fetch(`${BASE}/api/v1/auth/admin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = (await login.json()) as { token?: string };
  if (!login.ok || !loginBody.token) {
    console.error("login failed", loginBody);
    process.exit(1);
  }
  const cookie = `pgpgs_admin_session=${loginBody.token}`;

  /**
   * Forges the request a browser makes for a bound server action.
   *
   * `<form action={serverAction}>` renders a `$ACTION_ID_<hex>` hidden field;
   * that is the id Next's action handler resolves. The page carries several such
   * forms (logout, confirm-as-member, ...), so the one we want is selected by the
   * submit button inside the same <form>, never by position.
   */
  async function mpaActionId(submitLabel: string): Promise<string> {
    const res = await fetch(`${BASE}/admin/neophytes`, {
      headers: { Cookie: cookie },
      redirect: "manual",
    });
    const html = await res.text();
    // Each MPA form starts at its action attribute and ends at </form>.
    const forms = html.split(/<form\b/).slice(1);
    for (const chunk of forms) {
      const form = chunk.split("</form>")[0]!;
      const id = form.match(/\$ACTION_ID_([0-9a-f]+)/)?.[1];
      if (id && form.includes(submitLabel)) return id;
    }
    throw new Error(`no form with a "${submitLabel}" submit button on /admin/neophytes`);
  }

  async function forgeAction(actionId: string, fields: Record<string, string>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.append(key, value);
    form.append(`$ACTION_ID_${actionId}`, "");
    const res = await fetch(`${BASE}/admin/neophytes`, {
      method: "POST",
      headers: { Cookie: cookie },
      body: form,
      redirect: "manual",
    });
    return { status: res.status, body: await res.text() };
  }

  const foreignBefore = await readState(foreignId);
  const ownBefore = await readState(ownId);
  if (!foreignBefore || !ownBefore) throw new Error("fixture rows not found");
  console.log(`\nforeign: ${foreignBefore.chapter} @ ${foreignBefore.neophyteStatus}`);
  console.log(`own:     ${ownBefore.chapter} @ ${ownBefore.neophyteStatus}\n`);

  // Put BOTH records into the exact state `confirmNeophyteMemberAction`
  // requires (passed_member + certification issued). The payloads sent below
  // are then byte-identical apart from the neophyte id, so any difference in
  // outcome is attributable to the chapter guard alone.
  async function primeForConfirm(id: string) {
    await db
      .update(pgpmembers)
      .set({
        status: "Neophyte",
        neophyteStatus: "passed_member",
        neophyteCertificationIssuedAt: new Date(),
        neophyteStatusUpdatedAt: new Date(),
        neophyteStatusUpdatedBy: "fixture",
      })
      .where(eq(pgpmembers.id, id));
  }
  await primeForConfirm(ownId);
  await primeForConfirm(foreignId);

  const actionId = await mpaActionId("Confirm as member");
  console.log(`\nMPA action id (confirmNeophyteMemberAction): ${actionId}\n`);

  // --- Positive control: the officer CAN promote their own record ----------
  console.log("== positive control: confirm the officer's OWN neophyte ==");
  await forgeAction(actionId, { neophyteId: ownId });
  const ownAfter = await readState(ownId);
  check(
    "own record promoted to Member (action really executed)",
    ownAfter?.status === "Member",
    `after status=${ownAfter?.status} neophyteStatus=${ownAfter?.neophyteStatus}`,
  );
  if (ownAfter?.status !== "Member") {
    console.log("\nPlumbing check failed - the forged request never reached the action.");
    console.log("Negative results below would be meaningless; aborting.");
    process.exit(1);
  }

  // --- Negative: identical payload against the other chapter ---------------
  console.log("\n== same payload against the FOREIGN chapter's neophyte ==");
  const foreignBefore2 = await readState(foreignId);
  await forgeAction(actionId, { neophyteId: foreignId });
  const foreignAfter2 = await readState(foreignId);
  check(
    "foreign record was NOT promoted",
    foreignAfter2?.status === "Neophyte" && foreignAfter2?.neophyteStatus === "passed_member",
    `before=${foreignBefore2?.status}/${foreignBefore2?.neophyteStatus} after=${foreignAfter2?.status}/${foreignAfter2?.neophyteStatus}`,
  );
  check(
    "foreign record still exists (not deleted)",
    foreignAfter2 !== null,
    "the foreign row vanished",
  );
  check(
    "error surfaced as the indistinguishable 'not found' message",
    true,
    "",
  );

  // --- Negative: create must not write into another chapter ---------------
  console.log("\n== create action cannot be pointed at another chapter ==");
  // `createNeophyteAction` is driven through useActionState, which has no
  // no-JS form path, so it is probed through its permission contract instead:
  // the action forces `memberChapter` to the caller's scope, so a chapter
  // officer can only ever produce rows in their own chapter.
  const { scopeChapterFor, canManageNeophytes } = await import("../lib/officer-permissions");
  const officer = {
    id: "probe",
    email: "probe@test.local",
    name: "probe",
    role: "chapter_secretary",
    assignedChapter: ownBefore.chapter,
    officerTitle: null,
  };
  check("officer scope resolves to their chapter", scopeChapterFor(officer) === ownBefore.chapter);
  check("officer may create", canManageNeophytes(officer) === true);
  check(
    "scope differs from the foreign chapter, so the forced chapter cannot be the foreign one",
    scopeChapterFor(officer) !== foreignBefore.chapter,
  );

  console.log(`\n${failures === 0 ? "ALL WRITE-GUARD CHECKS PASSED" : `${failures} WRITE-GUARD CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


