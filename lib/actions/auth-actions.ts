"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import {
  authenticateAdmin,
  destroySession,
  hashPassword,
  isPasswordStrongEnough,
  requireAdmin,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";

export type AuthFormState = {
  error?: string;
  success?: string;
};

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = typeof value === "string" ? value : "";
  // Only allow redirects within the admin area (open-redirect guard).
  return target.startsWith("/admin") ? target : "/admin";
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectTarget(formData.get("next"));

  if (!email.trim() || !password) {
    return { error: "Please enter your email and password." };
  }

  const result = await authenticateAdmin(email, password);
  if (!result.ok) {
    return { error: result.error };
  }

  await setSessionCookie(result.token);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireAdmin();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }
  if (!isPasswordStrongEnough(newPassword)) {
    return { error: "New password must be at least 12 characters long." };
  }

  const [account] = await db
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, user.id))
    .limit(1);

  if (!account || !(await verifyPassword(currentPassword, account.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  revalidatePath("/admin/settings");
  return { success: "Password updated successfully." };
}
