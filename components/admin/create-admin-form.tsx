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

const GENERATED_PASSWORD_PREFIX = "pgpgs";
// Visually ambiguous glyphs (0/O, 1/l/I) are excluded so the password can be
// read aloud or copied over chat without confusion. 32 symbols means the
// `byte % 32` pick below stays perfectly uniform (no modulo bias).
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Builds a throwaway password like `pgpgs-7KQF-M3XZ`: a recognisable prefix
 * plus 8 random symbols (15 characters total, above the 12-character minimum).
 * Uses the Web Crypto RNG rather than Math.random so it is not guessable.
 */
function generatePassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const chars = Array.from(
    bytes,
    (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length],
  );
  return `${GENERATED_PASSWORD_PREFIX}-${chars.slice(0, 4).join("")}-${chars
    .slice(4)
    .join("")}`;
}

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
  const passwordRef = useRef<HTMLInputElement>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [didCopyPassword, setDidCopyPassword] = useState(false);
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

  function handleGeneratePassword() {
    const passwordInput = passwordRef.current;
    if (!passwordInput) return;
    passwordInput.value = generatePassword();
    setDidCopyPassword(false);
    // Reveal it so the super admin can read it out / copy it to the officer.
    setIsPasswordVisible(true);
  }

  async function handleCopyPassword() {
    const passwordInput = passwordRef.current;
    if (!passwordInput?.value) return;
    try {
      await navigator.clipboard.writeText(passwordInput.value);
      setDidCopyPassword(true);
    } catch {
      // Clipboard can be blocked (insecure context / permissions); the field is
      // revealed anyway so the password can still be selected and copied.
      setDidCopyPassword(false);
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
          placeholder={member ? "Not recorded on this member" : "Select a member first"}
          className={`${inputClass} cursor-not-allowed bg-black/[0.03] text-a-muted`}
        />
        <span className="mt-1 block text-xs text-a-muted">
          {!member
            ? "Chapter is identified once a member is selected."
            : !memberChapter
              ? "This member has no chapter saved yet — set it on their member profile first."
              : matchedChapter
                ? "Identified from the member record — not editable."
                : `“${memberChapter}” is not in the chapter list. Add the chapter, or pick it manually below.`}
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
      <div className="block">
        <span className={fieldLabelClass}>Password (min. 12 characters)</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={passwordRef}
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={12}
            className={`${inputClass} flex-1`}
            placeholder="Generate one or type your own"
          />
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="a-btn a-btn-secondary a-btn-sm shrink-0"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            className="a-btn a-btn-ghost a-btn-sm shrink-0"
          >
            {isPasswordVisible ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={handleCopyPassword}
            className="a-btn a-btn-ghost a-btn-sm shrink-0"
          >
            {didCopyPassword ? "Copied" : "Copy"}
          </button>
        </div>
        <span className="mt-1 block text-xs text-a-muted">
          Starts with <code className="font-mono">pgpgs-</code> and adds random
          characters. Share it with the officer securely — they can change it later
          from Settings.
        </span>
      </div>
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

