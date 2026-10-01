import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { monthlyContributions } from "@/db/schema";
import { getMemberSessionUser } from "@/lib/member-auth";

export const runtime = "nodejs";

// Returns the signed-in member's own dues ledger (latest 12 bills).
export async function GET() {
  try {
    const session = await getMemberSessionUser();
    if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    let bills: {
      billingMonth: string; amountDueCents: number; amountPaidCents: number;
      status: string; paymentMethod: string | null; paidAt: Date | null;
    }[] = [];
    try {
      bills = await db.select({
        billingMonth: monthlyContributions.billingMonth,
        amountDueCents: monthlyContributions.amountDueCents,
        amountPaidCents: monthlyContributions.amountPaidCents,
        status: monthlyContributions.status,
        paymentMethod: monthlyContributions.paymentMethod,
        paidAt: monthlyContributions.paidAt,
      }).from(monthlyContributions)
        .where(eq(monthlyContributions.memberPk, session.memberPk))
        .orderBy(desc(monthlyContributions.billingMonth)).limit(12);
    } catch {
      return NextResponse.json({ bills: [] });
    }
    return NextResponse.json({
      bills: bills.map((b) => ({ ...b, paidAt: b.paidAt?.toISOString() ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load contributions." }, { status: 500 });
  }
}
