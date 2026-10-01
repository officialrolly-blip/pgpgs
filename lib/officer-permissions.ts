// Role-based access for Provincial Council + Chapter officer logins.
//
// Roles stored in `admin_users.role`:
// - "superadmin" | "admin" .............. full access (existing accounts)
// - "provincial_secretary" .............. all members (read + edit), contributions read-only
// - "provincial_treasurer" .............. all members read-only, contributions read + record payments
// - "chapter_secretary" ................. assigned-chapter members (read + edit), chapter contributions read-only
// - "chapter_treasurer" ................. assigned-chapter members read-only, chapter contributions read + record
//
// Chapter-scoped roles carry `assignedChapter` (a chapter name from the
// chapters table). Provincial roles have `assignedChapter = null` and see
// the entire directory.
//
export const OFFICER_ROLES = [
  "provincial_secretary",
  "provincial_treasurer",
  "chapter_secretary",
  "chapter_treasurer",
] as const;

export type OfficerRole = (typeof OFFICER_ROLES)[number];

export const ADMIN_ROLES = ["superadmin", "admin"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number] | OfficerRole | string;

export type SessionOfficer = {
  id: string;
  email: string;
  name: string;
  role: string;
  assignedChapter?: string | null;
  officerTitle?: string | null;
};

export const OFFICER_ROLE_LABELS: Record<OfficerRole, string> = {
  provincial_secretary: "Provincial Secretary",
  provincial_treasurer: "Provincial Treasurer",
  chapter_secretary: "Chapter Secretary",
  chapter_treasurer: "Chapter Treasurer",
};

export const OFFICER_ROLE_OPTIONS: { value: string; label: string; hint: string }[] = [
  {
    value: "admin",
    label: "Admin (full access)",
    hint: "Can manage everything, all chapters.",
  },
  {
    value: "superadmin",
    label: "Superadmin (full access)",
    hint: "Full access + can create officer accounts.",
  },
  {
    value: "provincial_secretary",
    label: "Provincial Secretary",
    hint: "All members + contributions view; can add / edit members.",
  },
  {
    value: "provincial_treasurer",
    label: "Provincial Treasurer",
    hint: "All members + contributions view-only for members; can record payments.",
  },
  {
    value: "chapter_secretary",
    label: "Chapter Secretary",
    hint: "Only their chapter's members; can add / edit those members.",
  },
  {
    value: "chapter_treasurer",
    label: "Chapter Treasurer",
    hint: "Only their chapter's members (view-only); can record chapter payments.",
  },
];

export function isOfficerRole(role: string): role is OfficerRole {
  return (OFFICER_ROLES as readonly string[]).includes(role);
}

export function isChapterScopedRole(role: string): boolean {
  return role === "chapter_secretary" || role === "chapter_treasurer";
}

export function isProvincialRole(role: string): boolean {
  return role === "provincial_secretary" || role === "provincial_treasurer";
}

export function isFullAdmin(role: string): boolean {
  return role === "superadmin" || role === "admin";
}

export function isSuperadmin(role: string): boolean {
  return role === "superadmin";
}

/** Chapter scope: null = whole directory (provincial / full admin). */
export function scopeChapterFor(user: SessionOfficer): string | null {
  if (isChapterScopedRole(user.role)) return user.assignedChapter?.trim() || null;
  return null;
}

/** Secretary side: allowed to create / edit / delete member records. */
export function canEditMembers(user: SessionOfficer): boolean {
  return (
    isFullAdmin(user.role) ||
    user.role === "provincial_secretary" ||
    user.role === "chapter_secretary"
  );
}

/**
 * Everyone who can sign in to /admin can open the member directory and the
 * contributions ledger. The restriction is on editing, not on viewing: the rows
 * a scoped officer sees are narrowed to their chapter by the page's chapter
 * scope filter, not by a permission gate.
 */

/** Treasurer side (plus full admins) may record / generate payments. */
export function canRecordContributions(user: SessionOfficer): boolean {
  return (
    isFullAdmin(user.role) ||
    user.role === "provincial_treasurer" ||
    user.role === "chapter_treasurer"
  );
}

/** Only full admins may change dues settings or delete ledger rows. */
export function canManageContributionSettings(user: SessionOfficer): boolean {
  return isFullAdmin(user.role);
}

export function canDeleteContributions(user: SessionOfficer): boolean {
  return isFullAdmin(user.role);
}

/** Only full admins may touch applications, chapters, inbox, news, IDs, officers. */
export function canAccessAdminOnlySection(user: SessionOfficer): boolean {
  return isFullAdmin(user.role);
}

export function canManageOfficerAccounts(user: SessionOfficer): boolean {
  return isSuperadmin(user.role);
}

/** Human label for badges / headings. */
export function roleLabel(role: string): string {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return OFFICER_ROLE_LABELS[role as OfficerRole] ?? role;
}

/** Short scope description, e.g. "All chapters" or "Roxas City Chapter". */
export function scopeLabel(user: SessionOfficer): string {
  const scoped = scopeChapterFor(user);
  if (scoped) return scoped;
  if (isProvincialRole(user.role)) return "All chapters (Provincial)";
  return "All chapters";
}
