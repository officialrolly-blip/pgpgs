"use client";

import { useActionState } from "react";
import { createAdminUserAction, type AdminUserFormState } from "@/lib/actions/admin-user-actions";

const inputClass = "a-input";

export default function CreateAdminForm() {
  const [state, formAction, isPending] = useActionState<AdminUserFormState, FormData>(
    createAdminUserAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-[#fecdca] bg-a-danger-soft px-3.5 py-2.5 text-sm font-medium text-a-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-[#a6f4c5] bg-a-success-soft px-3.5 py-2.5 text-sm font-medium text-a-success sm:col-span-2">
          {state.success}
        </p>
      ) : null}
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Full name</span>
        <input name="name" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Email</span>
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">
          Password (min. 12 characters)
        </span>
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Role</span>
        <select name="role" defaultValue="admin" className={inputClass}>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="a-btn a-btn-primary"
        >
          {isPending ? "Creating…" : "Create admin account"}
        </button>
      </div>
    </form>
  );
}
