import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, destroyAdminSessionByToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  const trimmed = token.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// REST API v1 — admin logout. Revokes the bearer token (mobile) or the
// website cookie session by deleting the admin_sessions row.
export async function POST(request: Request) {
  try {
    const fromHeader = bearerToken(request);
    const token =
      fromHeader ??
      (await cookies()).get(SESSION_COOKIE_NAME)?.value ??
      null;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    await destroyAdminSessionByToken(token);
    if (!fromHeader) {
      (await cookies()).delete(SESSION_COOKIE_NAME);
    }
    return NextResponse.json({ success: "Session revoked." });
  } catch (error) {
    console.error("API v1 admin logout failed", error);
    return NextResponse.json(
      { error: "Logout failed. Please try again." },
      { status: 500 },
    );
  }
}
