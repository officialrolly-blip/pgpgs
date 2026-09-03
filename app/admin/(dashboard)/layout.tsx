import type { ReactNode } from "react";
import { count, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { chapters, registrations } from "@/db/schema";
import AdminShell from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  const [pendingApplications, pendingChapters] = await Promise.all([
    db
      .select({ value: count() })
      .from(registrations)
      .where(eq(registrations.applicationStatus, "pending")),
    db
      .select({ value: count() })
      .from(chapters)
      .where(ne(chapters.status, "published")),
  ]);

  const pendingCount =
    Number(pendingApplications[0]?.value ?? 0) + Number(pendingChapters[0]?.value ?? 0);

  return (
    <div className="admin-shell flex min-h-screen">
      <AdminShell
        user={{ name: user.name, email: user.email, role: user.role }}
        pendingCount={pendingCount}
      >
        {children}
      </AdminShell>
    </div>
  );
}

