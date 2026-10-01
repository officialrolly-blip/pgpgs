"use server";

import { revalidatePath } from "next/cache";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { hashPassword, isPasswordStrongEnough, requireSuperadmin } from "@/lib/auth";
import { getAllChapterNames } from "@/lib/chapters";
import {
  OFFICER_ROLES,
  isChapterScopedRole,
  type OfficerRole,
} from "@/lib/officer-permissions";

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
  const assignedChapter = String(formData.get("assignedChapter") ?? "").trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (!name) return { error: "Please enter a display name." };
  if (!isPasswordStrongEnough(password)) {
    return { error: "Password must be at least 12 characters long." };
  }
  const OFFICER_ROLE_SET = new Set<string>([...OFFICER_ROLES]);
  if (role !== "admin" && role !== "superadmin" && !OFFICER_ROLE_SET.has(role)) {
    return { error: "Please choose a valid role." };
  }

  let chapterScope: string | null = null;
  if (isChapterScopedRole(role)) {
    if (!assignedChapter) {
      return { error: "Please choose the chapter this officer belongs to." };
    }
    const validChapters = await getAllChapterNames();
    const match = validChapters.find(
      (chapter) => chapter.toLowerCase() === assignedChapter.toLowerCase(),
    );
    if (!match) {
      return { error: "That chapter was not found. Please choose a valid chapter." };
    }
    chapterScope = match;
  }

  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);
  if (existing) {
    return { error: "An admin with this email already exists." };
  }

  try {
    await db.insert(adminUsers).values({
      email,
      name,
      passwordHash: await hashPassword(password),
      role,
      assignedChapter: chapterScope,
      officerTitle: OFFICER_ROLE_SET.has(role) ? officerTitleFor(role as OfficerRole) : null,
    });
  } catch {
    if (OFFICER_ROLE_SET.has(role)) {
      return {
        error:
          "Officer roles need a database update first — run `npm run db:migrate-officers`, then try again.",
      };
    }
    return { error: "Unable to create that account right now. Please try again." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/officer-accounts");
  const scopeSuffix = chapterScope ? ` for ${chapterScope}` : "";
  return { success: `Account created for ${email} (${officerTitleFor(role)}${scopeSuffix}).` };
}

function officerTitleFor(role: string): string {
  switch (role) {
    case "provincial_secretary":
      return "Provincial Secretary";
    case "provincial_treasurer":
      return "Provincial Treasurer";
    case "chapter_secretary":
      return "Chapter Secretary";
    case "chapter_treasurer":
      return "Chapter Treasurer";
    case "superadmin":
      return "Superadmin";
    default:
      return "Admin";
  }
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
  revalidatePath("/admin/officer-accounts");
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
  revalidatePath("/admin/officer-accounts");
}
