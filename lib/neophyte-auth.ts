import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers, registrationSessions, registrations } from "@/db/schema";
import { verifyPassword } from "@/lib/auth";

export const REGISTRATION_SESSION_COOKIE = "pgpgs_registration_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

export type RegistrationStatus = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus: string;
  createdAt: Date;
  reviewedAt: Date | null;
  neophyteStatus: string | null;
  memberStatus: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateRegistration(email: string, password: string) {
  const [registration] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.email, email.trim().toLowerCase()))
    .limit(1);

  if (!registration || !(await verifyPassword(password, registration.passwordHash))) {
    return { ok: false as const, error: "Invalid email or password." };
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  await db.delete(registrationSessions).where(
    and(eq(registrationSessions.registrationId, registration.id), lt(registrationSessions.expiresAt, new Date())),
  );
  await db.insert(registrationSessions).values({
    registrationId: registration.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return { ok: true as const, token };
}

export async function setRegistrationSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(REGISTRATION_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getRegistrationStatus(): Promise<RegistrationStatus | null> {
  const token = (await cookies()).get(REGISTRATION_SESSION_COOKIE)?.value;
  if (!token) return null;
  const [registration] = await db
    .select({
      id: registrations.id,
      memberId: pgpmembers.memberId,
      applicationMemberId: registrations.memberId,
      firstName: registrations.firstName,
      lastName: registrations.lastName,
      email: registrations.email,
      applicationStatus: registrations.applicationStatus,
      createdAt: registrations.createdAt,
      reviewedAt: registrations.reviewedAt,
      sessionExpiresAt: registrationSessions.expiresAt,
      neophyteStatus: pgpmembers.neophyteStatus,
      memberStatus: pgpmembers.status,
    })
    .from(registrationSessions)
    .innerJoin(registrations, eq(registrationSessions.registrationId, registrations.id))
    .leftJoin(pgpmembers, eq(registrations.email, pgpmembers.email))
    .where(eq(registrationSessions.tokenHash, hashToken(token)))
    .limit(1);

  if (!registration || registration.sessionExpiresAt <= new Date()) {
    await clearRegistrationSession();
    return null;
  }
  return {
    ...registration,
    memberId: registration.memberId ?? registration.applicationMemberId,
  };
}

export async function clearRegistrationSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(REGISTRATION_SESSION_COOKIE)?.value;
  if (token) await db.delete(registrationSessions).where(eq(registrationSessions.tokenHash, hashToken(token)));
  cookieStore.delete(REGISTRATION_SESSION_COOKIE);
}