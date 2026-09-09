import { NextResponse } from "next/server";
import {
  MEMBER_SESSION_TTL_SECONDS,
  authenticateMember,
} from "@/lib/member-auth";
import { checkRateLimit, getClientIp } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — member login for the mobile app.
//
// Verifies the same member_credentials as the website, creates the same
// member_sessions row, but returns the opaque token in the response body so
// the mobile app can store it (secure storage) and send it as
// `Authorization: Bearer <token>`. The website's cookie flow
// (/api/member-id/login) is untouched.
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(
      `v1-login:${getClientIp(request)}`,
      LOGIN_RATE_LIMIT,
      LOGIN_RATE_WINDOW_MS,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      memberId?: string;
      password?: string;
    } | null;

    const memberId = body?.memberId?.trim();
    const password = body?.password;

    if (!memberId || !password) {
      return NextResponse.json(
        { error: "Member ID and password are required." },
        { status: 400 },
      );
    }

    const result = await authenticateMember(memberId, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      token: result.token,
      tokenType: "Bearer",
      expiresIn: MEMBER_SESSION_TTL_SECONDS,
      member: {
        memberId: result.user.memberId,
      },
    });
  } catch (error) {
    console.error("API v1 login failed", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}