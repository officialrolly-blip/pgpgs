import type { Metadata } from "next";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Former Chapter Vice President",
};

const vicePresidentRoles = ["For Internal", "For External"];

export default function Page() {
  return (
    <PageShell title="Former Chapter Vice President">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          Honoring the brothers and sisters who have served as Vice President
          for Internal and External Affairs. Their leadership and service have
          helped strengthen the chapter and carry its mission forward.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {vicePresidentRoles.map((role) => (
          <article
            key={role}
            className="border border-black/10 bg-white px-6 py-8 shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold)]">
              Former Chapter Vice President
            </p>
            <h2 className="mt-3 font-serif text-2xl font-semibold text-[var(--green-dark)]">
              {role}
            </h2>
            <p className="mt-4 text-sm leading-6 text-black/55">
              No former vice president records have been added yet.
            </p>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
