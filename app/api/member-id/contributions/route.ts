import { NextResponse } from "next/server";
import { getMemberSessionUser } from "@/lib/member-auth";
import { getMemberOwnBills } from "@/lib/contribution-service";

export const runtime = "nodejs";

// Returns the signed-in member's own dues ledger (latest 12 bills).
export async function GET() {
  try {
    const session = await getMemberSessionUser();
    if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    const { bills } = await getMemberOwnBills(session.memberPk, 12);
    return NextResponse.json({
      bills: bills.map((b) => ({ ...b, paidAt: b.paidAt?.toISOString() ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load contributions." }, { status: 500 });
  }
}
