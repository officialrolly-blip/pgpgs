import { NextResponse } from "next/server";
import { and, asc, count, eq, ilike, ne, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import {
  chapterMatches,
  getAllChapterNames,
  normalizeChapterName,
} from "@/lib/chapters";
import { scopeChapterFor, type SessionOfficer } from "@/lib/officer-permissions";
import { checkRateLimit, getClientIp } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

// REST API v1 — member directory. Admin-authenticated (bearer token or the
// website cookie).
//
// Chapter scoping: chapter_secretary / chapter_treasurer are pinned to their
// assigned chapter and CANNOT widen it with ?chapter=. Provincial and full
// admins may pass ?chapter= to filter, or omit it for the whole province.
export async function GET(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const rateLimit = checkRateLimit(
      `v1-members:${getClientIp(request)}`,
      120,
      60_000,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status")?.trim() ?? "";
    const chapterParam = url.searchParams.get("chapter")?.trim() ?? "";
    const includeNeophytes =
      url.searchParams.get("includeNeophytes") === "true";
    const requestedLimit = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
    const requestedOffset = Number(url.searchParams.get("offset") ?? 0);

    if (!Number.isFinite(requestedLimit) || requestedLimit < 1) {
      return NextResponse.json(
        { error: "limit must be a positive number." },
        { status: 400 },
      );
    }
    if (!Number.isFinite(requestedOffset) || requestedOffset < 0) {
      return NextResponse.json(
        { error: "offset must be zero or greater." },
        { status: 400 },
      );
    }
    const limitValue = Math.min(Math.floor(requestedLimit), MAX_LIMIT);
    const offsetValue = Math.floor(requestedOffset);
const officer: SessionOfficer = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      assignedChapter: admin.assignedChapter ?? null,
      officerTitle: admin.officerTitle ?? null,
    };
    const chapterScope = scopeChapterFor(officer);

    // A chapter-scoped officer is locked to their own chapter; a broader request
    // is rejected rather than silently widened.
    const effectiveChapter = chapterScope ?? chapterParam;

    if (
      chapterScope &&
      chapterParam &&
      normalizeChapterName(chapterParam) !== normalizeChapterName(chapterScope)
    ) {
      return NextResponse.json(
        {
          error:
            "Your account is limited to its assigned chapter. Remove ?chapter= or use your assigned chapter.",
        },
        { status: 403 },
      );
    }

    const conditions: SQL[] = [];
    if (!includeNeophytes) {
      conditions.push(ne(pgpmembers.status, "Neophyte"));
    }
    const chapterCondition = chapterMatches(
      pgpmembers.memberChapter,
      effectiveChapter,
    );
    if (chapterCondition) conditions.push(chapterCondition);
    if (status) conditions.push(eq(pgpmembers.status, status));
    if (q) {
      const pattern = `%${q}%`;
      const search = or(
        ilike(pgpmembers.firstName, pattern),
        ilike(pgpmembers.lastName, pattern),
        ilike(pgpmembers.memberId, pattern),
        ilike(pgpmembers.email, pattern),
      );
      if (search) conditions.push(search);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRows, rows, statusBreakdown] = await Promise.all([
      db.select({ value: count() }).from(pgpmembers).where(where),
      db
        .select({
          id: pgpmembers.id,
          memberId: pgpmembers.memberId,
          firstName: pgpmembers.firstName,
          middleInitial: pgpmembers.middleInitial,
          lastName: pgpmembers.lastName,
          email: pgpmembers.email,
          status: pgpmembers.status,
          chapter: pgpmembers.memberChapter,
          officerPosition: pgpmembers.officerPosition,
          officerDateElected: pgpmembers.officerDateElected,
          photoUrl: pgpmembers.photoUrl,
          hasPhoto: pgpmembers.hasPhoto,
        })
        .from(pgpmembers)
        .where(where)
        .orderBy(asc(pgpmembers.lastName), asc(pgpmembers.firstName))
        .limit(limitValue)
        .offset(offsetValue),
      db
        .select({ status: pgpmembers.status, value: count() })
        .from(pgpmembers)
        .where(where)
        .groupBy(pgpmembers.status),
    ]);

    const total = Number(totalRows[0]?.value ?? 0);

    return NextResponse.json({
      members: rows.map((row) => ({
        id: row.id,
        memberId: row.memberId,
        fullName: [row.firstName, row.middleInitial, row.lastName]
          .filter(Boolean)
          .join(" "),
        email: row.email,
        status: row.status,
        chapter: row.chapter,
        position: row.officerPosition,
        dateElected: row.officerDateElected,
        photoUrl: row.photoUrl,
        hasPhoto: row.hasPhoto,
      })),
      pagination: {
        total,
        limit: limitValue,
        offset: offsetValue,
        returned: rows.length,
        hasMore: offsetValue + rows.length < total,
      },
      countsByStatus: Object.fromEntries(
        statusBreakdown.map((row) => [row.status, Number(row.value)]),
      ),
      scope: {
        role: admin.role,
        chapter: effectiveChapter || null,
        locked: Boolean(chapterScope),
      },
      chapters: await getAllChapterNames().catch(() => [] as string[]),
    });
  } catch (error) {
    console.error("API v1 members list failed", error);
    return NextResponse.json(
      { error: "Unable to load members right now." },
      { status: 500 },
    );
  }
}