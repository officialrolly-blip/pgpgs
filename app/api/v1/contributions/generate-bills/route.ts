import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import { generateMonthlyBills } from "@/lib/contribution-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — generate one bill per active directory member (admin).
//   POST /api/v1/contributions/generate-bills  { "billingMonth": "YYYY-MM" }
// Billing month is optional (defaults to the current month). Existing bills
// are never overwritten — reruns only fill in members still missing a row.
export async function POST(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      billingMonth?: unknown;
    } | null;
    if (body !== null && typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const result = await generateMonthlyBills(
      typeof body?.billingMonth === "string" ? body.billingMonth.trim() : "",
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ success: result.success, created: result.created ?? 0 });
  } catch (error) {
    console.error("API v1 generate bills failed", error);
    return NextResponse.json(
      { error: "Unable to generate bills right now." },
      { status: 500 },
    );
  }
}
