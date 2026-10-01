"use client";

import { useActionState, useRef, useState } from "react";
import MemberCombobox, {
  type MemberOption,
} from "@/components/admin/member-combobox";
import { createAdminUserAction, type AdminUserFormState } from "@/lib/actions/admin-user-actions";
import {
  OFFICER_ROLE_OPTIONS,
  isChapterScopedRole,
} from "@/lib/officer-permissions";

const inputClass = "a-input";
const fieldLabelClass = "text-xs font-semibold uppercase tracking-wide text-a-muted";

export default function CreateAdminForm({ chapters }: { chapters: string[] }) {
  const [state, formAction, isPending] = useActionState<AdminUserFormState, FormData>(
    createAdminUserAction,
    {},
  );
  const [role, setRole] = useState("admin");
  const [member, setMember] = useState<MemberOption | null>(null);
  // null = follow the member's chapter; a string = the super admin overrode it.
  const [chapterOverride, setChapterOverride] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const needsChapter = isChapterScopedRole(role);

  // The chapter is read straight from the member record the super admin picks.
  const memberChapter = member?.chapter?.trim() ?? "";
  const matchedChapter = chapters.find(
    (chapter) => chapter.toLowerCase() === memberChapter.toLowerCase(),
  ) ?? "";
  const assignedChapter = chapterOverride ?? (needsChapter ? matchedChapter : "");

  function handleRoleChange(nextRole: string) {
    setRole(nextRole);
    // Re-align the scope with the member's chapter for the new role.
    setChapterOverride(null);
  }

  function handleMemberSelect(next: MemberOption | null) {
    setMember(next);
    setChapterOverride(null);
    // Prefill the login email from the member record while it is still empty.
    const emailInput = emailRef.current;
    if (next?.email && emailInput && !emailInput.value.trim()) {
      emailInput.value = next.email;
    }
  }

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
      <input type="hidden" name="memberId" value={member?.id ?? ""} />
      <div className="sm:col-span-2">
        <MemberCombobox
          label="Member (officer)"
          selected={member}
          onSelect={handleMemberSelect}
          endpoint="/api/admin/member-search"
          placeholder="Search a member by name or ID…"
          hint="Search the member directory — the officer's name and chapter are filled in automatically."
          wrapperClassName="relative"
        />
      </div>
      <label className="block">
        <span className={fieldLabelClass}>Chapter (from the member record)</span>
        <input
          type="text"
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          value={memberChapter}
          placeholder="Select a member first"
          className={`${inputClass} cursor-not-allowed bg-black/[0.03] text-a-muted`}
        />
        <span className="mt-1 block text-xs text-a-muted">
          {memberChapter
            ? matchedChapter
              ? "Identified from the member record — not editable."
              : "This chapter is not in the chapter list yet; ask an admin to add it."
            : "Chapter is identified once a member is selected."}
        </span>
      </label>
      <label className="block">
        <span className={fieldLabelClass}>Email</span>
        <input
          ref={emailRef}
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="officer@example.com"
        />
      </label>
      <label className="block">
        <span className={fieldLabelClass}>
          Password (min. 12 characters)
        </span>
        <input name="password" type="password" autoComplete="new-password" required minLength={12} className={inputClass} />
      </label>
      <label className="block">
        <span className={fieldLabelClass}>Role</span>
        <select
          name="role"
          value={role}
          onChange={(event) => handleRoleChange(event.target.value)}
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
          <span className={fieldLabelClass}>
            Assigned chapter (this officer will only see this chapter)
          </span>
          <select
            name="assignedChapter"
            required={needsChapter}
            className={inputClass}
            value={assignedChapter}
            onChange={(event) => setChapterOverride(event.target.value)}
          >
            <option value="">Select a chapter…</option>
            {chapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-a-muted">
            {assignedChapter && assignedChapter === matchedChapter
              ? "Auto-selected from the member's chapter — change it only if they serve another chapter."
              : "Choose the chapter this officer is responsible for."}
          </span>
        </label>
      ) : null}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending || !member}
          className="a-btn a-btn-primary"
        >
          {isPending
            ? "Creating…"
            : member
              ? "Create officer account"
              : "Select a member first"}
        </button>
      </div>
    </form>
  );
}

