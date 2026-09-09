import { NextResponse } from "next/server";
import {
  destroyMemberSession,
  destroyMemberSessionByToken,
  getBearerToken,
} from "@/lib/member-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — logout. Revokes the bearer token (mobile) or the cookie
// session (website) by deleting the member_sessions row.
export async function POST(request: Request) {
  try {
    const bearerToken = getBearerToken(request);
    if (bearerToken) {
      await destroyMemberSessionByToken(bearerToken);
    } else {
      await destroyMemberSession();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("API v1 logout failed", error);
    return NextResponse.json(
      { error: "Logout failed. Please try again." },
      { status: 500 },
    );
  }
}