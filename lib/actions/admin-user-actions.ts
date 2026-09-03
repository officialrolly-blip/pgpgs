"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword, isPasswordStrongEnough, requireSuperadmin } from "@/lib/auth";

export type AdminUserFormState = {
  error?: string;
  success?: string;
};

export async function createAdminUserAction(
  _prevState: AdminUserFormState,
  formData: FormData,
): Promise<AdminUserFormState> {
  await requireSuperadmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "admin");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!name) return { error: "Please enter a display name." };
  if (!isPasswordStrongEnough(password)) {
    return { error: "Password must be at least 12 characters long." };
  }
  if (role !== "admin" && role !== "superadmin") {
    return { error: "Role must be admin or superadmin." };
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    return { error: "An admin with this email already exists." };
  }

  await db.insert(adminUsers).values({
    email,
    name,
    passwordHash: await hashPassword(password),
    role,
  });

  revalidatePath("/admin/settings");
  return { success: `Admin account created for ${email}.` };
}

export async function setAdminActiveAction(formData: FormData): Promise<void> {
  const actingAdmin = await requireSuperadmin();

  const targetId = String(formData.get("adminId") ?? "");
  const nextActive = String(formData.get("isActive") ?? "") === "true";
  if (!targetId || targetId === actingAdmin.id) return;

  if (!nextActive) {
    // Keep at least one active superadmin at all times.
    const [{ value: activeSuperadmins }] = await db
      .select({ value: count() })
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.role, "superadmin"),
          eq(adminUsers.isActive, true),
          ne(adminUsers.id, targetId),
        ),
      );
    const [target] = await db
      .select({ role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, targetId))
      .limit(1);
    if (target?.role === "superadmin" && Number(activeSuperadmins) < 1) return;
  }

  await db
    .update(adminUsers)
    .set({ isActive: nextActive, failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(adminUsers.id, targetId));

  revalidatePath("/admin/settings");
}

export async function deleteAdminUserAction(formData: FormData): Promise<void> {
  const actingAdmin = await requireSuperadmin();

  const targetId = String(formData.get("adminId") ?? "");
  if (!targetId || targetId === actingAdmin.id) return;

  const [target] = await db
    .select({ role: adminUsers.role })
    .from(adminUsers)
    .where(eq(adminUsers.id, targetId))
    .limit(1);
  if (!target) return;

  if (target.role === "superadmin") {
    const [{ value: otherActiveSuperadmins }] = await db
      .select({ value: count() })
      .from(adminUsers)
      .where(
        and(
          eq(adminUsers.role, "superadmin"),
          eq(adminUsers.isActive, true),
          ne(adminUsers.id, targetId),
        ),
      );
    if (Number(otherActiveSuperadmins) < 1) return;
  }

  // Sessions cascade-delete, signing the user out everywhere.
  await db.delete(adminUsers).where(eq(adminUsers.id, targetId));
  revalidatePath("/admin/settings");
}
