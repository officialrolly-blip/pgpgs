"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthFormState } from "@/lib/actions/auth-actions";

const inputClass = "a-input";

export default function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    changePasswordAction,
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
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Current password</span>
        <input name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">New password</span>
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Confirm new password</span>
        <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} className={inputClass} />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={isPending}
          className="a-btn a-btn-primary"
        >
          {isPending ? "Updating…" : "Update password"}
        </button>
      </div>
      <p className="text-xs text-a-muted sm:col-span-2">Passwords must be at least 12 characters long.</p>
    </form>
  );
}
