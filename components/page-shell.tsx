import type { ReactNode } from "react";

export default function PageShell({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex-1 bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold tracking-[0.28em] text-[var(--gold)] uppercase">
          Pi Gamma Phi Gamma Sigma
        </p>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-[var(--green-dark)] sm:text-4xl">
          {title}
        </h1>
        <div className="mt-4 h-px w-24 bg-[var(--gold)]" />
        {children ? (
          <div className="mt-8 text-black/70">{children}</div>
        ) : (
          <p className="mt-8 text-black/65">
            Content for this section will be published soon.
          </p>
        )}
      </div>
    </main>
  );
}
