"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/actions/auth-actions";

const initialState: AuthFormState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="a-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="a-input"
          placeholder="admin@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="a-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="a-input"
          placeholder="••••••••••••"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-[#fecdca] bg-a-danger-soft px-3.5 py-2.5 text-sm font-medium text-a-danger"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="a-btn a-btn-primary w-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-a-brand"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
