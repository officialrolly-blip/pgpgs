// Server-side authentication for the PGPGS admin dashboard.
// - Passwords: scrypt with random 16-byte salt, stored as "salt:hexkey"
//   (same format/convention as app/api/registrations/route.ts).
// - Sessions: opaque 32-byte tokens in an httpOnly cookie; the database
//   stores only the SHA-256 hash of the token, so a DB leak cannot be
//   replayed as a session. Sessions are revocable and expire after 7 days.
// - Login hardening: account lockout after 5 consecutive failed attempts
//   (15 minutes), constant-time hash comparison, timing-equalized failures.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions, adminUsers } from "@/db/schema";
import { bestEffortDbCleanup } from "@/lib/db-cleanup";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "pgpgs_admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_KEY_LENGTH = 32;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 12;

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  assignedChapter?: string | null;
  officerTitle?: string | null;
};

export type AdminRequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(keyHex, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

async function requestMeta(): Promise<AdminRequestMeta> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwarded ? forwarded.split(",")[0]!.trim() : null,
    userAgent: headerList.get("user-agent"),
  };
}

/**
 * Validates credentials with lockout protection. Returns the session token
 * on success so the caller can set the cookie, or a generic error message.
 */
export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<{ ok: true; token: string; user: AdminUser } | { ok: false; error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const meta = await requestMeta();

  const [account] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizedEmail))
    .limit(1);

  if (!account) {
    // Equalize response timing with the wrong-password path.
    await verifyPassword(password, await hashPassword("timing-equalization-placeholder"));
    return { ok: false, error: "Invalid email or password." };
  }

  const now = new Date();
  if (account.lockedUntil && account.lockedUntil > now) {
    const minutesLeft = Math.max(
      1,
      Math.ceil((account.lockedUntil.getTime() - now.getTime()) / 60_000),
    );
    return {
      ok: false,
      error: `Too many failed attempts. This account is locked for ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.`,
    };
  }

  const passwordMatches = await verifyPassword(password, account.passwordHash);

  if (!passwordMatches || !account.isActive) {
    if (account.isActive) {
      const previousLockExpired = Boolean(
        account.lockedUntil && account.lockedUntil <= now,
      );
      const failedAttempts = previousLockExpired
        ? 1
        : account.failedLoginAttempts + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;

      await db
        .update(adminUsers)
        .set({
          failedLoginAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil: shouldLock
            ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000)
            : account.lockedUntil,
          updatedAt: now,
        })
        .where(eq(adminUsers.id, account.id));

      if (shouldLock) {
        return {
          ok: false,
          error: `Too many failed attempts. This account is locked for ${LOCKOUT_MINUTES} minutes.`,
        };
      }
    }
    return { ok: false, error: "Invalid email or password." };
  }

  // Success: reset counters, stamp last login, prune dead sessions, mint token.
  const token = randomBytes(SESSION_KEY_LENGTH).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  await db
    .update(adminUsers)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(eq(adminUsers.id, account.id));

  await db
    .delete(adminSessions)
    .where(and(eq(adminSessions.userId, account.id), lt(adminSessions.expiresAt, now)));

  await db.insert(adminSessions).values({
    userId: account.id,
    tokenHash: hashToken(token),
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return {
    ok: true,
    token,
    user: {
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      assignedChapter: (account as { assignedChapter?: string | null }).assignedChapter ?? null,
      officerTitle: (account as { officerTitle?: string | null }).officerTitle ?? null,
    },
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validates a session token against the admin_sessions store (shared by the
 * cookie flow and the REST API bearer flow) or null. Stale/invalidated
 * sessions are deleted from the store; the browser cookie is left alone (it
 * simply stops matching until logout or natural expiry — see destroySession).
 */
async function findAdminUserBySessionToken(token: string): Promise<AdminUser | null> {
  let row: {
    id: string;
    email: string;
    name: string;
    role: string;
    assignedChapter: string | null;
    officerTitle: string | null;
    isActive: boolean;
    expiresAt: Date;
  } | undefined;
  try {
    [row] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        assignedChapter: adminUsers.assignedChapter,
        officerTitle: adminUsers.officerTitle,
        isActive: adminUsers.isActive,
        expiresAt: adminSessions.expiresAt,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
      .where(eq(adminSessions.tokenHash, hashToken(token)))
      .limit(1);
  } catch {
    // Older databases may not have the officer-role columns yet — fall back
    // to the legacy column set until `npm run db:migrate-officers` is run.
    const [legacy] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        expiresAt: adminSessions.expiresAt,
      })
      .from(adminSessions)
      .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
      .where(eq(adminSessions.tokenHash, hashToken(token)))
      .limit(1);
    if (!legacy) return null;
    row = { ...legacy, assignedChapter: null, officerTitle: null };
  }

  if (!row) return null;
  if (row.expiresAt <= new Date() || !row.isActive) {
    await bestEffortDbCleanup(() =>
      db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token))),
    );
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    assignedChapter: row.assignedChapter ?? null,
    officerTitle: row.officerTitle ?? null,
  };
}

/** Returns the signed-in admin (validated against the session store) or null. */
export async function getSessionUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return findAdminUserBySessionToken(token);
}

/**
 * Authenticates a REST API request the way the mobile/member API does:
 * `Authorization: Bearer <token>` first, falling back to the website's
 * httpOnly admin cookie for same-origin web calls. Never redirects — callers
 * return a 401 JSON body instead.
 */
export async function getAdminSessionUserFromRequest(
  request: Request,
): Promise<AdminUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
    return findAdminUserBySessionToken(token.trim());
  }
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return findAdminUserBySessionToken(cookieToken);
  return null;
}

/** Revokes the admin session behind a bearer token or raw session token. */
export async function destroyAdminSessionByToken(token: string): Promise<void> {
  await bestEffortDbCleanup(() =>
    db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token))),
  );
}

/** Guard for pages and server actions: redirects to login when unauthenticated. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  return user;
}

/** Guard for superadmin-only pages and actions. */
export async function requireSuperadmin(): Promise<AdminUser> {
  const user = await requireAdmin();
  if (user.role !== "superadmin") redirect("/admin");
  return user;
}

/** Deletes the current session server-side. Safe to call when signed out. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await bestEffortDbCleanup(() =>
      db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashToken(token))),
    );
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function isPasswordStrongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export const MIN_PASSWORD_LENGTH_VALUE = MIN_PASSWORD_LENGTH;

