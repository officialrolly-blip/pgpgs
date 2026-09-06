"use client";

import { useFormStatus } from "react-dom";

export default function LogoutButton({
  className,
  children = "Sign out",
  role,
}: {
  className?: string;
  children?: React.ReactNode;
  role?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      role={role}
      disabled={pending}
      className={className}
      aria-disabled={pending}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Signing out…
        </span>
      ) : (
        children
      )}
    </button>
  );
}