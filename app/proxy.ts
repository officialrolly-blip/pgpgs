import { NextResponse, type NextRequest } from "next/server";

// Fast edge-level guard for the admin dashboard. This only checks cookie
// presence; the authoritative session validation happens server-side in
// app/admin/(dashboard)/layout.tsx and in every admin server action
// (defense in depth).
const SESSION_COOKIE_NAME = "pgpgs_admin_session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname === "/admin/login") {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSessionCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
