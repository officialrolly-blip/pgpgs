import { NextResponse } from "next/server";
import { authenticateAdmin, SESSION_TTL_SECONDS } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// REST API v1 — admin login for API clients (mobile/treasurer tooling).
// Same admin_users credentials and lockout rules as the website; returns the
// opaque session token in the body for `Authorization: Bearer` use. The
// website's cookie flow (/admin/login server action) is untouched.
const LOGIN_RATE_LIMIT = 5;
const LOGIN_RATE_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(
      `v1-admin-login:${getClientIp(request)}`,
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
      email?: string;
      password?: string;
    } | null;

    const email = body?.email?.trim();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const result = await authenticateAdmin(email, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      token: result.token,
      tokenType: "Bearer",
      expiresIn: SESSION_TTL_SECONDS,
      admin: {
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
  } catch (error) {
    console.error("API v1 admin login failed", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 },
    );
  }
}
