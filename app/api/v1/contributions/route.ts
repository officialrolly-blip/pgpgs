import { NextResponse } from "next/server";
import { getAdminSessionUserFromRequest } from "@/lib/auth";
import {
  BILLING_MONTH_PATTERN,
  listContributions,
  pesosToCents,
  recordContributionPayment,
  type ContributionFilter,
} from "@/lib/contribution-service";
import {
  CONTRIBUTION_STATUSES,
  currentBillingMonth,
} from "@/lib/contributions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: readonly string[] = ["all", ...CONTRIBUTION_STATUSES];

// REST API v1 — the dues ledger (admin bearer token or admin cookie).
//   GET  /api/v1/contributions?month=YYYY-MM&q=&status=all&page=1&perPage=20
//   POST /api/v1/contributions — record (or edit) a payment / waive a bill.
export async function GET(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim() || currentBillingMonth();
    if (!BILLING_MONTH_PATTERN.test(month)) {
      return NextResponse.json({ error: "Pick a valid billing month." }, { status: 400 });
    }
    const status = url.searchParams.get("status")?.trim() || "all";
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
    }
    const q = url.searchParams.get("q")?.trim() ?? "";
    const page = Number.parseInt(url.searchParams.get("page") ?? "", 10);
    const perPage = Number.parseInt(url.searchParams.get("perPage") ?? "", 10);

    const result = await listContributions({
      month,
      q,
      status: status as ContributionFilter,
      page: Number.isFinite(page) ? page : 1,
      perPage: Number.isFinite(perPage) ? perPage : 20,
    });
    if (!result.ready) {
      return NextResponse.json(
        { error: "The contributions ledger is unavailable right now." },
        { status: 503 },
      );
    }
    return NextResponse.json({ month, q, status, ...result });
  } catch (error) {
    console.error("API v1 contributions list failed", error);
    return NextResponse.json(
      { error: "Unable to load contributions right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSessionUserFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const body = (await request.json().catch(() => null)) as {
      memberPk?: unknown;
      billingMonth?: unknown;
      amountPaid?: unknown;
      paymentMethod?: unknown;
      referenceNumber?: unknown;
      note?: unknown;
      waived?: unknown;
    } | null;
    if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

    const waived = body.waived === true || body.waived === "on";
    const amountMissing =
      body.amountPaid === undefined || body.amountPaid === null || body.amountPaid === "";
    if (amountMissing && !waived) {
      return NextResponse.json({ error: "Amount paid is required." }, { status: 400 });
    }

    const result = await recordContributionPayment(
      {
        memberPk: typeof body.memberPk === "string" ? body.memberPk.trim() : "",
        billingMonth: typeof body.billingMonth === "string" ? body.billingMonth.trim() : "",
        amountPaidCents: pesosToCents(body.amountPaid),
        paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod.trim() : "",
        referenceNumber: typeof body.referenceNumber === "string" ? body.referenceNumber.trim() : "",
        note: typeof body.note === "string" ? body.note.trim() : "",
        waived,
      },
      admin.email,
    );
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
    }
    return NextResponse.json({ success: result.success, bill: result.bill });
  } catch (error) {
    console.error("API v1 record payment failed", error);
    return NextResponse.json(
      { error: "Unable to record the payment right now." },
      { status: 500 },
    );
  }
}
