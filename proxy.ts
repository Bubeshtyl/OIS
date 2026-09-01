import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { hydrateSessionIfNeeded } from "@/lib/auth/hydrate-session";
import {
  canAccessRoute,
  canAccessRouteSync,
  getDefaultPath,
  getDefaultPathSync,
} from "@/lib/auth/rbac";
import { sessionHasCachedPermissions } from "@/lib/auth/session-access";
import {
  sessionOptions,
  type SessionData,
} from "@/lib/auth/session-config";

const PUBLIC_PATHS = ["/login", "/api/telegram/webhook"];

async function loadSession(request: NextRequest, response: NextResponse) {
  const session = await getIronSession<SessionData>(
    request,
    response,
    sessionOptions
  );

  if (
    session.isLoggedIn &&
    !session.isPlatformAdmin &&
    !sessionHasCachedPermissions(session) &&
    session.tenantId &&
    session.roleId
  ) {
    const hydrated = await hydrateSessionIfNeeded(session);
    Object.assign(session, hydrated);
    await session.save();
  }

  return session;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();
  const session = await loadSession(request, response);

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
      new URL(
        getDefaultPathSync(session) ?? (await getDefaultPath(session)),
        request.url
      )
    );
  }

  if (session.isLoggedIn) {
    const allowed = canAccessRouteSync(session, pathname);
    if (allowed === false) {
      return NextResponse.redirect(
        new URL(
          getDefaultPathSync(session) ?? (await getDefaultPath(session)),
          request.url
        )
      );
    }
    if (allowed === null && !(await canAccessRoute(session, pathname))) {
      const defaultPath =
        getDefaultPathSync(session) ?? (await getDefaultPath(session));
      if (pathname !== defaultPath) {
        return NextResponse.redirect(new URL(defaultPath, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
