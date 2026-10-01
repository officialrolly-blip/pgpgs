import { NextResponse } from "next/server";
import { getMemberSessionUserFromRequest } from "@/lib/member-auth";
import { getMemberOwnBills } from "@/lib/contribution-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — the signed-in member's own dues ledger (member bearer token
// or website cookie). Same data as /api/member-id/contributions, versioned
// for the mobile app.
//   GET /api/v1/contributions/me?limit=1..24 (default 12)
export async function GET(request: Request) {
  try {
    const session = await getMemberSessionUserFromRequest(request);
    if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const url = new URL(request.url);
    const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 12;

    const { bills } = await getMemberOwnBills(session.memberPk, limit);
    return NextResponse.json({ bills });
  } catch (error) {
    console.error("API v1 my contributions failed", error);
    return NextResponse.json(
      { error: "Failed to load contributions." },
      { status: 500 },
    );
  }
}
