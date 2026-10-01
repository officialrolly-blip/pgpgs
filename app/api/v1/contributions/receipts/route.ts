import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import {
  BILLING_MONTH_PATTERN,
  UUID_PATTERN,
  getMemberStatement,
} from "@/lib/contribution-service";
import { currentBillingMonth } from "@/lib/contributions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — receipt + arrears snapshot for one member (admin).
//   GET /api/v1/contributions/receipts?member=<memberPk-uuid>&month=YYYY-MM
export async function GET(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const url = new URL(request.url);
    const member = url.searchParams.get("member")?.trim() ?? "";
    if (!UUID_PATTERN.test(member)) {
      return NextResponse.json(
        { error: "A valid member record id (member param) is required." },
        { status: 400 },
      );
    }
    const month = url.searchParams.get("month")?.trim() || currentBillingMonth();
    if (!BILLING_MONTH_PATTERN.test(month)) {
      return NextResponse.json({ error: "Pick a valid billing month." }, { status: 400 });
    }

    const statement = await getMemberStatement(member, month);
    if (statement.migrationNeeded) {
      return NextResponse.json(
        { error: "The contributions ledger is unavailable right now." },
        { status: 503 },
      );
    }
    if (!statement.member) {
      return NextResponse.json({ error: "No member found for that reference." }, { status: 404 });
    }
    return NextResponse.json({
      month,
      member: statement.member,
      bill: statement.bill,
      bills: statement.bills,
      arrears: statement.arrears,
      owedCents: statement.owedCents,
      lifetimeCents: statement.lifetimeCents,
    });
  } catch (error) {
    console.error("API v1 contributions receipts failed", error);
    return NextResponse.json(
      { error: "Unable to load the statement right now." },
      { status: 500 },
    );
  }
}
