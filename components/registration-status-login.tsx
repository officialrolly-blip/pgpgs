"use client";

import { useActionState } from "react";
import { registrationLoginAction, type RegistrationLoginState } from "@/lib/actions/registration-status-actions";

const initialState: RegistrationLoginState = {};

export default function RegistrationStatusLogin() {
  const [state, formAction, isPending] = useActionState(registrationLoginAction, initialState);
  return (
    <form action={formAction} className="mt-7 space-y-5">
      <label className="block text-sm font-semibold text-[var(--green-dark)]">
        Email address
        <input className="mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      <label className="block text-sm font-semibold text-[var(--green-dark)]">
        Password
        <input className="mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? <p className="border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center rounded-sm bg-[var(--green)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--green-dark)] disabled:opacity-60">
        {isPending ? "Checking..." : "View my status"}
      </button>
    </form>
  );
}