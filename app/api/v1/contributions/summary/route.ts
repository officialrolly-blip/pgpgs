import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import { BILLING_MONTH_PATTERN, getMonthSummary } from "@/lib/contribution-service";
import { currentBillingMonth } from "@/lib/contributions";
import { asOfficer } from "@/lib/officer-access";
import { scopeChapterFor } from "@/lib/officer-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — collection overview for one billing month (admin).
//   GET /api/v1/contributions/summary?month=YYYY-MM
//
// Chapter scoping: a chapter officer's totals cover their assigned chapter only —
// they never receive a province-wide aggregate.
export async function GET(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim() || currentBillingMonth();
    if (!BILLING_MONTH_PATTERN.test(month)) {
      return NextResponse.json({ error: "Pick a valid billing month." }, { status: 400 });
    }

    const chapterScope = scopeChapterFor(asOfficer(admin));
    const summary = await getMonthSummary(month, chapterScope);
    if (!summary.ready) {
      return NextResponse.json(
        { error: "The contributions ledger is unavailable right now." },
        { status: 503 },
      );
    }
    const rate =
      summary.expectedCents > 0
        ? Math.round((summary.collectedCents / summary.expectedCents) * 100)
        : 0;
    return NextResponse.json({
      month,
      chapterScope,
      billed: summary.billed,
      paid: summary.paid,
      partial: summary.partial,
      unpaid: summary.unpaid,
      waived: summary.waived,
      collectedCents: summary.collectedCents,
      expectedCents: summary.expectedCents,
      rate,
    });
  } catch (error) {
    console.error("API v1 contributions summary failed", error);
    return NextResponse.json(
      { error: "Unable to load the summary right now." },
      { status: 500 },
    );
  }
}
