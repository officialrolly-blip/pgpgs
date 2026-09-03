// Server-side authentication for the PGPGS member digital-ID portal.
// - Reuses the same scrypt + SHA-256 conventions as admin auth (lib/auth.ts).
// - Sessions: opaque 32-byte tokens in an httpOnly cookie.
import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { memberCredentials, memberSessions } from "@/db/schema";

const scrypt = promisify(scryptCallback);

export const MEMBER_SESSION_COOKIE_NAME = "pgpgs_member_session";
export const MEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_KEY_LENGTH = 32;

export type MemberSessionUser = {
  credentialId: string;
  memberPk: string;
  memberId: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(":");
  if (!salt || !keyHex) return false;
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(keyHex, "hex");
  if (storedKey.length !== derivedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

export async function authenticateMember(
  memberId: string,
  password: string,
): Promise<{ ok: true; token: string; user: MemberSessionUser } | { ok: false; error: string }> {
  const normalizedId = memberId.trim().toUpperCase();
  const normalizedPassword = password.trim().toUpperCase();

  const [credential] = await db
    .select()
    .from(memberCredentials)
    .where(eq(memberCredentials.memberId, normalizedId))
    .limit(1);

  if (!credential) {
    // Equalize response timing.
    await verifyPassword(normalizedPassword, await hashPassword("timing-equalization-placeholder"));
    return { ok: false, error: "Invalid Member ID or password." };
  }

  const passwordValid = await verifyPassword(normalizedPassword, credential.passwordHash);
  if (!passwordValid) {
    return { ok: false, error: "Invalid Member ID or password." };
  }

  const now = new Date();
  const token = randomBytes(SESSION_KEY_LENGTH).toString("base64url");
  const expiresAt = new Date(now.getTime() + MEMBER_SESSION_TTL_SECONDS * 1000);

  await db
    .delete(memberSessions)
    .where(and(eq(memberSessions.credentialId, credential.id), lt(memberSessions.expiresAt, now)));

  await db.insert(memberSessions).values({
    credentialId: credential.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    ok: true,
    token,
    user: {
      credentialId: credential.id,
      memberPk: credential.memberPk,
      memberId: credential.memberId,
    },
  };
}

export async function setMemberSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_SESSION_TTL_SECONDS,
  });
}

export async function clearMemberSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_SESSION_COOKIE_NAME);
}

export async function getMemberSessionUser(): Promise<MemberSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const [row] = await db
    .select({
      credentialId: memberCredentials.id,
      memberPk: memberCredentials.memberPk,
      memberId: memberCredentials.memberId,
      expiresAt: memberSessions.expiresAt,
    })
    .from(memberSessions)
    .innerJoin(memberCredentials, eq(memberSessions.credentialId, memberCredentials.id))
    .where(eq(memberSessions.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt <= new Date()) {
    await destroyMemberSession();
    return null;
  }

  return {
    credentialId: row.credentialId,
    memberPk: row.memberPk,
    memberId: row.memberId,
  };
}

export async function destroyMemberSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEMBER_SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(memberSessions).where(eq(memberSessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(MEMBER_SESSION_COOKIE_NAME);
}
