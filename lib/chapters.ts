import "server-only";

import { asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";
import { normalizeChapterName } from "@/lib/chapter-names";

/**
 * Returns the set of published chapter names from the database.
 *
 * The public registration form populates its chapter dropdowns from the same
 * published chapters (via GET /api/chapters), and the server validates
 * submitted chapter names against this set. Using the database as the single
 * source of truth ensures that any chapter a member can select in the dropdown
 * is accepted on the server — no stale hardcoded lists that can drift out of sync.
 */
export async function getPublishedChapterNames(): Promise<Set<string>> {
  const rows = await db
    .select({ name: chapters.chapterName })
    .from(chapters)
    .where(eq(chapters.status, "published"))
    .orderBy(asc(chapters.chapterName));
  return new Set(rows.map((row) => row.name));
}

/**
 * Returns every chapter name (published or pending) for admin forms, so
 * administrators can associate members with any chapter that exists in the
 * system.
 */
export async function getAllChapterNames(): Promise<string[]> {
  const rows = await db
    .select({ name: chapters.chapterName })
    .from(chapters)
    .orderBy(asc(chapters.chapterName));
  return rows.map((row) => row.name);
}

// The organisation prefix is stored inconsistently across historical records
// (see lib/chapter-names.ts), so chapter names are compared through the shared
// normalisation helpers rather than literally.
export { normalizeChapterName } from "@/lib/chapter-names";

/**
 * SQL condition matching a `member_chapter`-style column against a chapter
 * name. Both sides are normalised: the column has the `Pi Gamma Phi Gamma
 * Sigma` prefix stripped and is lower-cased in SQL, so legacy short-form rows
 * ("Roxas City Capiz Chapter") and canonical long-form rows both match.
 * Returns `undefined` when no chapter is given so callers can skip the filter.
 */
export function chapterMatches(
  column: SQL | unknown,
  chapterName: string | null | undefined,
): SQL | undefined {
  const target = normalizeChapterName(chapterName);
  if (!target) return undefined;
  return sql`regexp_replace(
    lower(${column as SQL}),
    '^pi[[:space:]]+gamma[[:space:]]+phi[[:space:]]+gamma[[:space:]]+sigma[[:space:]]+',
    ''
  ) = ${target}`;
}
