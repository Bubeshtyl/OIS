import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import {
  canAccessRoute,
  getDefaultPath,
} from "@/lib/auth/rbac";
import {
  defaultSession,
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session-config";

const PUBLIC_PATHS = ["/login", "/api/telegram/webhook"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!session.isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(
      new URL(await getDefaultPath(session.role), request.url)
    );
  }

  if (session.isLoggedIn && !(await canAccessRoute(session.role, pathname))) {
    const defaultPath = await getDefaultPath(session.role);
    if (pathname !== defaultPath) {
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
