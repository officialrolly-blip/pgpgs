// Chapter-name comparison helpers.
//
// Kept in a separate, dependency-free module because both the browser bundle
// (components/admin/create-admin-form.tsx imports lib/officer-permissions.ts)
// and the server need them, while lib/chapters.ts is "server-only" (it talks to
// the database).
//
// The organisation prefix is stored inconsistently across historical records:
// some rows say "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter", others
// just "Roxas City Capiz Chapter". Comparing those literally hides members from
// chapter-scoped views (and would let a chapter officer through the wrong
// door), so the prefix is stripped before matching.
const ORG_PREFIX = /^pi\s*gamma\s*phi\s*gamma\s*sigma\s+/i;

/** Normalises a chapter name for comparison (lowercase, no org prefix). */
export function normalizeChapterName(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(ORG_PREFIX, "").trim();
}

/**
 * True when two chapter names refer to the same chapter. Both sides are
 * normalised, so legacy short-form rows ("Roxas City Capiz Chapter") and
 * canonical long-form rows ("Pi Gamma Phi Gamma Sigma Roxas City Capiz
 * Chapter") compare equal.
 *
 * Empty/unknown names never match: an unassigned chapter must not be treated as
 * belonging to every scoped officer.
 */
export function chapterNamesEqual(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = normalizeChapterName(left);
  const b = normalizeChapterName(right);
  return a !== "" && a === b;
}

/**
 * Chapter-pin check for callers that hold a chapter *scope string* rather than a
 * session (REST handlers, shared services).
 *
 * A null/empty scope means "province-wide view" (full + provincial officers) and
 * therefore passes everything. A scope set on the other hand only admits records
 * from that one chapter — an unassigned record never matches.
 */
export function canAccessChapterName(
  recordChapter: string | null | undefined,
  scope: string | null | undefined,
): boolean {
  const target = normalizeChapterName(scope);
  if (!target) return true;
  return chapterNamesEqual(recordChapter, scope);
}