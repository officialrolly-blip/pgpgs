/* Verifies chapter-based data isolation for the Neophyte Status module.
 *
 * Creates two throwaway chapters, a neophyte in each, and a chapter secretary
 * account, then asserts through the real permission + query layer that:
 *   - a chapter secretary/treasurer sees only their own chapter's neophytes
 *   - province-wide roles still see everything
 *   - canAccessChapter rejects cross-chapter and unassigned rows
 *   - the write permissions match the documented matrix
 *
 * Run with: npx tsx scripts/verify-neophyte-chapter-scope.ts
 * Prints a cleanup handle at the end.
 */
import { readFileSync } from "node:fs";

// The env file has to be read before @/db is evaluated, so every database-backed
// module is imported lazily inside main().
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
    /* validation below surfaces the useful error */
  }
}

for (const file of [".env.local", ".env"]) loadEnv(file);

const RUN = `VERIFY-${Date.now().toString(36).toUpperCase()}`;
const ALPHA = `${RUN} Alpha Chapter`;
const BETA = `${RUN} Beta Chapter`;
const SECRETARY_EMAIL = `${RUN.toLowerCase()}-secretary@test.local`;
export const PASSWORD = "Verify-Scope-Pw-1234";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label}` +
      (pass ? "" : `\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`),
  );
}

function officer(role: string, assignedChapter: string | null) {
  return {
    id: `test-${role}`,
    email: `${role}@test.local`,
    name: role,
    role,
    assignedChapter,
    officerTitle: null,
  };
}
async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_UNPOOLED/DATABASE_URL is not configured.");

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);

  // --list <run> prints the ids of a previous run so the HTTP checks can be
  // pointed at the right rows.
  const listRun = process.argv[2];
  if (listRun === "--list") {
    const rows = (await sql.query(
      "select id, member_chapter from pgpmembers where email like $1 order by member_chapter nulls last",
      [`${process.argv[3].toLowerCase()}%@test.local`],
    )) as Array<{ id: string; member_chapter: string | null }>;
    for (const r of rows) console.log(`${r.id}|${r.member_chapter ?? ""}`);
    return;
  }

  // --cleanup <run> removes every row a verification run created.
  if (listRun === "--cleanup") {
    const run = process.argv[3];
    const prefix = `${run.toLowerCase()}%@test.local`;
    await sql.query("delete from pgpmembers where email like $1", [prefix]);
    await sql.query("delete from admin_users where email like $1", [prefix]);
    console.log(`Cleaned up rows for ${run}.`);
    return;
  }

  // --reset <alphaChapter> puts the fixture neophytes back to Orientation so a
  // previous run's stage promotions do not affect the next one.
  if (listRun === "--reset") {
    const chapter = process.argv[3];
    await sql.query(
      "update pgpmembers set status = 'Neophyte', neophyte_status = 'orientation', neophyte_certification_issued_at = null, neophyte_status_updated_by = 'fixture' where member_chapter = $1",
      [chapter],
    );
    console.log(`Reset fixtures in ${chapter}.`);
    return;
  }

  const { and, eq, sql: drizzleSql } = await import("drizzle-orm");
  const { db } = await import("../db");
  const { adminUsers, pgpmembers } = await import("../db/schema");
  const { hashPassword } = await import("../lib/auth");
  const {
    canAccessChapter,
    canDeleteNeophytes,
    canManageNeophytes,
    canViewNeophytes,
    scopeChapterFor,
  } = await import("../lib/officer-permissions");

  // Mirrors lib/chapters.ts#chapterMatches verbatim. That module is
  // "server-only" and therefore not importable from a plain tsx script, so the
  // production predicate is reproduced here instead of diverging silently.
  const chapterMatches = (chapterName: string | null | undefined) =>
    drizzleSql`regexp_replace(
      lower(${pgpmembers.memberChapter}),
      '^pi[[:space:]]+gamma[[:space:]]+phi[[:space:]]+gamma[[:space:]]+sigma[[:space:]]+',
      ''
    ) = ${chapterName!.trim().toLowerCase()}`;

  const createdMemberIds: string[] = [];
  const createdEmails: string[] = [];
  async function makeNeophyte(email: string, chapter: string | null) {
    createdEmails.push(email);
    const [row] = await db
      .insert(pgpmembers)
      .values({
        memberId: `${RUN}-${createdMemberIds.length + 1}`,
        firstName: "Test",
        lastName: "Neophyte",
        age: 20,
        dateOfBirth: "2005-01-01",
        placeOfBirth: "Roxas City",
        street: "1 Test St",
        barangay: "Poblacion",
        municipality: "Roxas City",
        province: "Capiz",
        email,
        contactNumber: "09171234567",
        guardianName: "Guardian",
        guardianAddress: "2 Test St",
        guardianContact: "09181234567",
        baptizedName: "Test",
        dateSurvived: "2026-01-01",
        status: "Neophyte",
        memberChapter: chapter,
        neophyteStatus: "orientation",
      })
      .returning({ id: pgpmembers.id });
    createdMemberIds.push(row!.id);
    return row!.id;
  }

  /** Mirrors the page's list query: chapter pin + status filter. */
  async function listNeophytesFor(user: ReturnType<typeof officer>) {
    const scope = scopeChapterFor(user);
    const conditions = [eq(pgpmembers.status, "Neophyte")];
    if (scope) conditions.push(chapterMatches(scope));
    return db
      .select({ id: pgpmembers.id, memberChapter: pgpmembers.memberChapter })
      .from(pgpmembers)
      .where(and(...conditions));
  }

  const alphaId = await makeNeophyte(`${RUN.toLowerCase()}-alpha@test.local`, ALPHA);
  const betaId = await makeNeophyte(`${RUN.toLowerCase()}-beta@test.local`, BETA);
  const noneId = await makeNeophyte(`${RUN.toLowerCase()}-none@test.local`, null);

  console.log("\n== module access (sidebar entry) ==");
  for (const role of [
    "superadmin",
    "admin",
    "provincial_secretary",
    "provincial_treasurer",
    "chapter_secretary",
    "chapter_treasurer",
  ]) {
    check(
      `canViewNeophytes(${role})`,
      canViewNeophytes(officer(role, role.startsWith("chapter") ? ALPHA : null)),
      true,
    );
  }

  console.log("\n== create / update rights ==");
  check("canManageNeophytes(chapter_secretary)", canManageNeophytes(officer("chapter_secretary", ALPHA)), true);
  check("canManageNeophytes(chapter_treasurer)", canManageNeophytes(officer("chapter_treasurer", ALPHA)), true);
  check("canManageNeophytes(provincial_secretary)", canManageNeophytes(officer("provincial_secretary", null)), true);
  check("canManageNeophytes(provincial_treasurer)", canManageNeophytes(officer("provincial_treasurer", null)), false);

  console.log("\n== hard-delete rights ==");
  check("canDeleteNeophytes(superadmin)", canDeleteNeophytes(officer("superadmin", null)), true);
  check("canDeleteNeophytes(chapter_secretary)", canDeleteNeophytes(officer("chapter_secretary", ALPHA)), true);
  check("canDeleteNeophytes(chapter_treasurer)", canDeleteNeophytes(officer("chapter_treasurer", ALPHA)), false);

  console.log("\n== scope resolution ==");
  check("scopeChapterFor(chapter_secretary)", scopeChapterFor(officer("chapter_secretary", ALPHA)), ALPHA);
  check("scopeChapterFor(provincial_secretary)", scopeChapterFor(officer("provincial_secretary", null)), null);
  check("scopeChapterFor(chapter role, no assignment)", scopeChapterFor(officer("chapter_secretary", null)), null);

  console.log("\n== row-level access (getScopedNeophyte predicate) ==");
  const secretary = officer("chapter_secretary", ALPHA);
  check("secretary canAccess own-chapter row", canAccessChapter(secretary, ALPHA), true);
  check("secretary canAccess other-chapter row", canAccessChapter(secretary, BETA), false);
  check("secretary canAccess unassigned row", canAccessChapter(secretary, null), false);
  check("provincial canAccess any chapter row", canAccessChapter(officer("provincial_secretary", null), BETA), true);
  check(
    "secretary canAccess long-form prefixed row (legacy)",
    canAccessChapter(secretary, `Pi Gamma Phi Gamma Sigma ${ALPHA}`),
    true,
  );

  console.log("\n== page list query ==");
  const secretaryRows = await listNeophytesFor(secretary);
  const treasurerRows = await listNeophytesFor(officer("chapter_treasurer", ALPHA));
  const provincialRows = await listNeophytesFor(officer("provincial_secretary", null));
  check("chapter secretary sees only own chapter", secretaryRows.map((r) => r.id), [alphaId]);
  check("chapter treasurer sees only own chapter", treasurerRows.map((r) => r.id), [alphaId]);
  check("provincial secretary sees both chapters", provincialRows.filter((r) => [alphaId, betaId].includes(r.id)).length, 2);
  check("scoped view never leaks the unassigned row", [secretaryRows, treasurerRows].flat().some((r) => r.id === noneId), false);

  console.log("\n== search + stage filter stay inside the pin ==");
  const searched = await db
    .select({ id: pgpmembers.id })
    .from(pgpmembers)
    .where(
      and(
        eq(pgpmembers.status, "Neophyte"),
        eq(pgpmembers.neophyteStatus, "orientation"),
        chapterMatches(scopeChapterFor(secretary)),
      ),
    );
  check("search result stays in own chapter", searched.map((r) => r.id), [alphaId]);

  console.log("\n== aggregate honours the chapter pin ==");
  const agg = await db.execute<{ passed: number }>(drizzleSql`
    select count(*) filter (where neophyte_status = 'passed_member')::int as passed
    from pgpmembers
    where status = 'Neophyte' and ${chapterMatches(ALPHA)}
  `);
  check("scoped aggregate executes", typeof agg.rows[0]?.passed, "number");

  console.log("\n== registration chapter column ==");
  const columns = await sql.query(
    "select column_name from information_schema.columns where table_name = 'registrations' and column_name = 'chapter'",
  );
  check("registrations.chapter exists", columns.length, 1);
  const indexes = (await sql.query(
    "select indexname from pg_indexes where indexname in ('registrations_chapter_idx','pgpmembers_member_chapter_idx')",
  )) as Array<{ indexname: string }>;
  check(
    "chapter indexes created",
    indexes.map((i) => i.indexname).sort(),
    ["pgpmembers_member_chapter_idx", "registrations_chapter_idx"],
  );

  console.log("\n== chapter secretary account for the manual browser check ==");
  await db.insert(adminUsers).values({
    email: SECRETARY_EMAIL,
    name: `${RUN} Chapter Secretary`,
    passwordHash: await hashPassword(PASSWORD),
    role: "chapter_secretary",
    assignedChapter: ALPHA,
    officerTitle: "Chapter Secretary",
  });
  console.log(`      email:   ${SECRETARY_EMAIL}`);
  console.log(`      password: ${PASSWORD}`);
  console.log(`      chapter:  ${ALPHA}`);
  console.log(`      beta neophyte id (must stay hidden): ${betaId}`);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  console.log(`CLEANUP_RUN=${RUN}`);
  console.log(`CLEANUP_EMAILS=${createdEmails.join(",")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
