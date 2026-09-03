import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import ChangePasswordForm from "@/components/admin/change-password-form";
import CreateAdminForm from "@/components/admin/create-admin-form";
import ConfirmSubmitButton from "@/components/admin/confirm-submit-button";
import { deleteAdminUserAction, setAdminActiveAction } from "@/lib/actions/admin-user-actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const isSuperadmin = admin.role === "superadmin";

  const admins = isSuperadmin
    ? await db
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
        .orderBy(asc(adminUsers.name))
    : [];

  return (
    <>
      <PageHeading
        title="Settings"
        description="Manage your account security and, for superadmins, the admin team."
      />

      <section className="a-card p-5 sm:p-6">
        <h2 className="a-card-title mb-4">Account</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">Name</dt>
            <dd className="text-a-secondary">{admin.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">Email</dt>
            <dd className="text-a-secondary">{admin.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-a-muted">Role</dt>
            <dd className="capitalize text-a-secondary">{admin.role}</dd>
          </div>
        </dl>
      </section>

      <section className="a-card mt-6 p-5 sm:p-6">
        <h2 className="a-card-title mb-4">Change password</h2>
        <ChangePasswordForm />
      </section>

      {isSuperadmin ? <AdminAccountsSection currentAdminId={admin.id} admins={admins} /> : null}
    </>
  );
}

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  lockedUntil: Date | null;
};

function AdminAccountsSection({
  currentAdminId,
  admins,
}: {
  currentAdminId: string;
  admins: AdminRow[];
}) {
  return (
    <>
      <section className="a-card">
        <header className="border-b border-a-border px-5 py-4">
          <h2 className="a-card-title">Admin accounts</h2>
        </header>
        <ul className="divide-y divide-a-border-soft">
          {admins.map((account) => (
            <AdminRowItem key={account.id} account={account} currentAdminId={currentAdminId} />
          ))}
        </ul>
        <p className="border-t border-a-border-soft px-5 py-3 text-xs text-a-muted">
          Deactivated admins are signed out immediately and cannot sign in. At least one active superadmin
          must remain.
        </p>
      </section>

      <section className="a-card mt-6 p-5 sm:p-6">
        <h2 className="a-card-title mb-4">
          Create a new admin account
        </h2>
        <CreateAdminForm />
      </section>
    </>
  );
}

function AdminRowItem({
  account,
  currentAdminId,
}: {
  account: AdminRow;
  currentAdminId: string;
}) {
  const isSelf = account.id === currentAdminId;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-a-text">
          {account.name}
          {isSelf ? (
            <span className="a-badge a-badge-green a-badge-plain ml-2">You</span>
          ) : null}
        </p>
        <p className="text-xs text-a-muted">
          {account.email} · <span className="capitalize">{account.role}</span>
          {account.lastLoginAt
            ? ` · last signed in ${account.lastLoginAt.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
            : " · never signed in"}
          {account.lockedUntil && account.lockedUntil > new Date() ? " · temporarily locked" : ""}
        </p>
      </div>
      {isSelf ? null : (
        <div className="flex items-center gap-2">
          <form action={setAdminActiveAction}>
            <input type="hidden" name="adminId" value={account.id} />
            <input type="hidden" name="isActive" value={account.isActive ? "false" : "true"} />
            <ConfirmSubmitButton
              message={
                account.isActive
                  ? `Deactivate ${account.name}? They will be signed out and unable to sign in.`
                  : `Reactivate ${account.name}?`
              }
              className={`a-btn a-btn-sm ${
                account.isActive ? "a-btn-secondary" : "a-btn-primary"
              }`}
            >
              {account.isActive ? "Deactivate" : "Reactivate"}
            </ConfirmSubmitButton>
          </form>
          <form action={deleteAdminUserAction}>
            <input type="hidden" name="adminId" value={account.id} />
            <ConfirmSubmitButton
              message={`Permanently delete ${account.name}'s admin account?`}
              className="a-btn a-btn-danger a-btn-sm"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      )}
    </li>
  );
}

