import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import {
  getContributionSettings,
  pesosToCents,
  updateContributionSettings,
} from "@/lib/contribution-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — chapter dues settings (admin).
//   GET /api/v1/contributions/settings
//   PUT /api/v1/contributions/settings  { "monthlyAmount": 100, "dueDay": 15 }
// `monthlyAmount` is in pesos (accepts "1,200.50"); stored as centavos.
export async function GET(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const settings = await getContributionSettings();
    return NextResponse.json({
      monthlyAmountCents: settings.amountCents,
      dueDay: settings.dueDay,
      ready: settings.ready,
    });
  } catch (error) {
    console.error("API v1 contributions settings read failed", error);
    return NextResponse.json(
      { error: "Unable to load settings right now." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      monthlyAmount?: unknown;
      dueDay?: unknown;
    } | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

    const result = await updateContributionSettings(
      {
        monthlyAmountCents: pesosToCents(body.monthlyAmount),
        dueDay: Number(body.dueDay),
      },
      admin.email,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ success: result.success });
  } catch (error) {
    console.error("API v1 contributions settings update failed", error);
    return NextResponse.json(
      { error: "Unable to update settings right now." },
      { status: 500 },
    );
  }
}
