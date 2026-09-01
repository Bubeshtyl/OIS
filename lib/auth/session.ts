import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { hydrateSessionIfNeeded } from "@/lib/auth/hydrate-session";
import { sessionHasCachedPermissions } from "@/lib/auth/session-access";
import {
  defaultSession,
  sessionOptions,
  type SessionData,
} from "./session-config";

async function maybeHydrateAndSave(session: SessionData) {
  if (
    !session.isLoggedIn ||
    session.isPlatformAdmin ||
    sessionHasCachedPermissions(session) ||
    !session.tenantId ||
    !session.roleId
  ) {
    return session;
  }

  const hydrated = await hydrateSessionIfNeeded(session);
  const cookieStore = await cookies();
  const ironSession = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  Object.assign(ironSession, hydrated);
  await ironSession.save();
  return hydrated;
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    return { ...defaultSession, ...session };
  }

  return maybeHydrateAndSave(session);
}

export async function requireSession() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function saveSession(data: SessionData) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  Object.assign(session, data);
  await session.save();
}

export async function destroySession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  session.destroy();
}
