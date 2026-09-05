import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  canAccessRouteSync,
  getDefaultPathSync,
} from "@/lib/auth/rbac";
import { sessionHasCachedPermissions } from "@/lib/auth/session-access";
import {
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session-config";

const PUBLIC_PATHS = ["/login", "/api/telegram/webhook"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);
  const hasSessionCookie = request.cookies.has(sessionOptions.cookieName);

  // Public routes with no session cookie: skip iron-session decrypt entirely.
  if (isPublic && !hasSessionCookie) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (!session.isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(
      new URL(getDefaultPathSync(session) ?? "/", request.url)
    );
  }

  // Sync route ACL when permissions are already in the session cookie (no DB).
  if (
    session.isLoggedIn &&
    !isPublic &&
    (session.isPlatformAdmin || sessionHasCachedPermissions(session))
  ) {
    const allowed = canAccessRouteSync(session, pathname);
    if (allowed === false) {
      return NextResponse.redirect(
        new URL(getDefaultPathSync(session) ?? "/", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
