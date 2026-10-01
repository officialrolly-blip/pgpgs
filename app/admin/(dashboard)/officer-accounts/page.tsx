import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import CreateAdminForm from "@/components/admin/create-admin-form";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { deleteAdminUserAction, setAdminActiveAction } from "@/lib/actions/admin-user-actions";
import { requireOfficerManager } from "@/lib/officer-access";
import { getAllChapterNames } from "@/lib/chapters";
import { roleLabel } from "@/lib/officer-permissions";

export const metadata: Metadata = { title: "Officer Accounts" };
export const dynamic = "force-dynamic";
type OfficerRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  assignedChapter: string | null;
  officerTitle: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  lockedUntil: Date | null;
};

export default async function OfficerAccountsPage() {
  const admin = await requireOfficerManager();
  const chapters = await getAllChapterNames().catch(() => [] as string[]);
  let officers: OfficerRow[] = [];
  try {
    officers = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        assignedChapter: adminUsers.assignedChapter,
        officerTitle: adminUsers.officerTitle,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        lockedUntil: adminUsers.lockedUntil,
      })
      .from(adminUsers)
      .orderBy(asc(adminUsers.name));
  } catch {
    const legacy = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        lockedUntil: adminUsers.lockedUntil,
      })
      .from(adminUsers)
      .orderBy(asc(adminUsers.name));
    officers = legacy.map((row) => ({ ...row, assignedChapter: null, officerTitle: null }));
  }
  const provincials = officers.filter((o) =>
    ["provincial_secretary", "provincial_treasurer"].includes(o.role),
  );
  const scoped = officers.filter((o) =>
    ["chapter_secretary", "chapter_treasurer"].includes(o.role),
  );
  const fullAdmins = officers.filter((o) => ["superadmin", "admin"].includes(o.role));
  return (
    <>
      <PageHeading
        title="Officer accounts"
        description="Create logins for Provincial Council and Chapter secretaries / treasurers."
        actions={
          <Link href="/admin/settings" className="a-btn a-btn-secondary">
            Settings
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Account overview">
        <SummaryCard label="Provincial officers" value={provincials.length} detail="See the whole directory" />
        <SummaryCard label="Chapter officers" value={scoped.length} detail="Scoped to one chapter" />
        <SummaryCard label="Full admins" value={fullAdmins.length} detail="Superadmin + admin" />
      </section>
      <section className="a-card mt-6 p-5 sm:p-6">
        <h2 className="a-card-title mb-1">Create a new officer account</h2>
        <p className="mb-4 text-sm leading-6 text-a-muted">
          Secretaries can add/edit members in scope. Treasurers are view-only on members
          but can record contributions. Chapter officers only see their assigned chapter.
        </p>
        <CreateAdminForm chapters={chapters} />
      </section>
      <section className="a-card mt-6 overflow-hidden">
        <header className="border-b border-a-border px-5 py-4 sm:px-6">
          <h2 className="a-card-title">All accounts</h2>
          <p className="mt-1 text-xs text-a-muted">Signed in as {admin.name} (superadmin).</p>
        </header>
        <ul className="divide-y divide-a-border-soft">
          {officers.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-a-text">
                  {account.name}
                  {account.id === admin.id ? (
                    <span className="a-badge a-badge-green a-badge-plain ml-2">You</span>
                  ) : null}
                  {!account.isActive ? (
                    <span className="a-badge a-badge-gray a-badge-plain ml-2">Deactivated</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-a-muted">
                  {account.email} · {account.officerTitle || roleLabel(account.role)}
                  {account.assignedChapter ? ` · ${account.assignedChapter}` : ""}
                </p>
                <p className="mt-1 text-[11px] text-a-muted/80">{permissionHint(account.role)}</p>
              </div>
              {account.id === admin.id ? null : (
                <div className="flex items-center gap-2">
                  <form action={setAdminActiveAction}>
                    <input type="hidden" name="adminId" value={account.id} />
                    <input type="hidden" name="isActive" value={account.isActive ? "false" : "true"} />
                    <ConfirmSubmitButton
                      message={account.isActive ? `Deactivate ${account.name}?` : `Reactivate ${account.name}?`}
                      className={`a-btn a-btn-sm ${account.isActive ? "a-btn-secondary" : "a-btn-primary"}`}
                    >
                      {account.isActive ? "Deactivate" : "Reactivate"}
                    </ConfirmSubmitButton>
                  </form>
                  <form action={deleteAdminUserAction}>
                    <input type="hidden" name="adminId" value={account.id} />
                    <ConfirmSubmitButton
                      message={`Permanently delete ${account.name}'s account?`}
                      className="a-btn a-btn-danger a-btn-sm"
                    >
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="a-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-a-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-a-text">{value}</p>
      <p className="mt-0.5 text-xs text-a-muted">{detail}</p>
    </div>
  );
}

function permissionHint(role: string): string {
  if (role === "provincial_secretary" || role === "chapter_secretary")
    return "Can add/edit members in scope · view contributions";
  if (role === "provincial_treasurer" || role === "chapter_treasurer")
    return "View-only members in scope · can record contributions";
  return "Full access";
}


