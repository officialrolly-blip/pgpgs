import type { ReactNode } from "react";
import { count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { chapters, contactMessages, registrations } from "@/db/schema";
import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";
import { scopeChapterFor } from "@/lib/officer-permissions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  // Pending applications / unpublished chapters / unread inbox messages are
  // province-wide workflow numbers, and the sections they belong to are
  // full-admin only. Chapter-scoped officers cannot open those sections, so we
  // neither query nor show their badges — otherwise the sidebar would leak
  // aggregates from across the province.
  const seesProvinceWide = scopeChapterFor(user) === null;

  const [pendingApplications, pendingChapters, unreadMessages] = await Promise.all([
    seesProvinceWide
      ? db
          .select({ value: count() })
          .from(registrations)
          .where(eq(registrations.applicationStatus, "pending"))
      : Promise.resolve([]),
    seesProvinceWide
      ? db
          .select({ value: count() })
          .from(chapters)
          .where(ne(chapters.status, "published"))
      : Promise.resolve([]),
    seesProvinceWide
      ? db
          .select({ value: count() })
          .from(contactMessages)
          .where(eq(contactMessages.status, "unread"))
      : Promise.resolve([]),
  ]);

  const pendingCount =
    Number(pendingApplications[0]?.value ?? 0) + Number(pendingChapters[0]?.value ?? 0);

  return (
    <div className="admin-shell flex min-h-screen">
      <AdminShell
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          assignedChapter: user.assignedChapter ?? null,
          officerTitle: user.officerTitle ?? null,
        }}
        pendingCount={pendingCount}
        unreadInboxCount={Number(unreadMessages[0]?.value ?? 0)}
      >
        {children}
      </AdminShell>
    </div>
  );
}

