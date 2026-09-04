import "server-only";

import { asc, eq } from "drizzle-orm";
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
