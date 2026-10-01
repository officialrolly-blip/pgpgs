import "server-only";

import { asc, eq, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { chapters } from "@/db/schema";

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

// The organisation prefix is stored inconsistently across historical records:
// some rows say "Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter", others
// just "Roxas City Capiz Chapter". Comparing those literally hides members from
// chapter-scoped views, so the prefix is stripped before matching.
const ORG_PREFIX = /^pi\s*gamma\s*phi\s*gamma\s*sigma\s+/i;

/** Normalises a chapter name for comparison (lowercase, no org prefix). */
export function normalizeChapterName(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(ORG_PREFIX, "").trim();
}

/**
 * SQL condition matching a `member_chapter`-style column against a chapter
 * name, tolerant of the missing organisation prefix and casing. Returns
 * `undefined` when no chapter is given so callers can skip the filter.
 */
export function chapterMatches(
  column: SQL | unknown,
  chapterName: string | null | undefined,
): SQL | undefined {
  const target = normalizeChapterName(chapterName);
  if (!target) return undefined;
  const columnRef = column as SQL;
  return or(
    sql`lower(${columnRef}) = ${target}`,
    sql`lower(${columnRef}) like ${`${target.replace(/[%_]/g, "")}%`}`,
  )!;
}
