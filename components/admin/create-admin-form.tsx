"use client";

import { useActionState, useState } from "react";
import { createAdminUserAction, type AdminUserFormState } from "@/lib/actions/admin-user-actions";
import { OFFICER_ROLE_OPTIONS } from "@/lib/officer-permissions";

const inputClass = "a-input";

export default function CreateAdminForm({ chapters }: { chapters: string[] }) {
  const [state, formAction, isPending] = useActionState<AdminUserFormState, FormData>(
    createAdminUserAction,
    {},
  );
  const [role, setRole] = useState("admin");
  const needsChapter = role === "chapter_secretary" || role === "chapter_treasurer";

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
        <input name="name" required className={inputClass} placeholder="e.g. Juan Dela Cruz" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Email</span>
        <input name="email" type="email" required className={inputClass} placeholder="officer@example.com" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">
          Password (min. 12 characters)
        </span>
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className={inputClass} />
      </label>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">Role</span>
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className={inputClass}
        >
          {OFFICER_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-a-muted">
          {OFFICER_ROLE_OPTIONS.find((option) => option.value === role)?.hint}
        </span>
      </label>
      {needsChapter ? (
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">
            Assigned chapter (this officer will only see this chapter)
          </span>
          <select name="assignedChapter" required={needsChapter} className={inputClass} defaultValue="">
            <option value="">Select a chapter…</option>
            {chapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="a-btn a-btn-primary"
        >
          {isPending ? "Creating…" : "Create officer account"}
        </button>
      </div>
    </form>
  );
}

