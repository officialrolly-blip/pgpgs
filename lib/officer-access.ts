// Server-side guards for officer-scoped access.
//
// - Full admins (superadmin/admin): everything.
// - Provincial secretary: all members read + write, contributions read-only.
// - Provincial treasurer: all members read-only, contributions read + record.
// - Chapter secretary: assigned-chapter members read + write, chapter contributions read-only.
// - Chapter treasurer: assigned-chapter members read-only, chapter contributions read + record.
import { redirect } from "next/navigation";
import { getSessionUser, requireAdmin, type AdminUser } from "@/lib/auth";
import {
  canEditMembers,
  isChapterScopedRole,
  isFullAdmin,
  scopeChapterFor,
  type SessionOfficer,
} from "@/lib/officer-permissions";

export type OfficerSession = AdminUser;

function asOfficer(user: AdminUser): SessionOfficer {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    assignedChapter: user.assignedChapter ?? null,
    officerTitle: user.officerTitle ?? null,
  };
}

/** Signed-in user (any role) or redirect to login. */
export async function requireOfficer(): Promise<OfficerSession> {
  return requireAdmin();
}

/** Full-admin-only pages (applications, chapters, inbox, news, IDs, …). */
export async function requireFullAdminPage(): Promise<OfficerSession> {
  const user = await requireAdmin();
  if (!isFullAdmin(user.role)) redirect("/admin/members");
  return user;
}

/** Superadmin-only pages (officer account management). */
export async function requireOfficerManager(): Promise<OfficerSession> {
  const user = await requireAdmin();
  if (user.role !== "superadmin") redirect("/admin");
  return user;
}

/**
 * Full-admin-only guard for server actions that back the admin-only sections
 * (chapters, news, applications, inbox). Throws instead of redirecting so a
 * direct POST from a scoped officer is rejected rather than bounced.
 */
export async function requireFullAdminAction(): Promise<OfficerSession> {
  const user = await requireAdmin();
  if (!isFullAdmin(user.role)) {
    throw new Error("Only administrators can perform this action.");
  }
  return user;
}

/** Chapter scope for the current user: null = whole directory. */
export async function currentChapterScope(): Promise<string | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return scopeChapterFor(asOfficer(user));
}

/** True when the signed-in user may open the member edit form. */
export async function canCurrentUserEditMembers(): Promise<boolean> {
  const user = await getSessionUser();
  if (!user) return false;
  return canEditMembers(asOfficer(user));
}

/** True when the signed-in user is chapter-scoped (for banners/filters). */
export async function currentOfficerLabel(): Promise<{ role: string; scope: string | null }> {
  const user = await getSessionUser();
  if (!user) return { role: "admin", scope: null };
  const officer = asOfficer(user);
  if (isChapterScopedRole(officer.role)) {
    return { role: officer.role, scope: officer.assignedChapter ?? null };
  }
  return { role: officer.role, scope: null };
}
