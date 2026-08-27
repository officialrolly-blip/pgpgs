import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = { title: "Our Alumni" };

const alumniMembers = [
  {
    name: "Name to be updated",
    memberedSince: "1975",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    memberedSince: "1978",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    memberedSince: "1982",
    status: "Inactive",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    memberedSince: "1987",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    memberedSince: "1991",
    status: "Inactive",
    image:
      "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    memberedSince: "1996",
    status: "Active",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
  },
];

export default function AlumniPage() {
  return (
    <PageShell title="Our Alumni">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          This directory honors the alumni of the PGPGS Roxas City Capiz
          Chapter and their enduring connection to the brotherhood. This
          directory provides a lasting record of their membership and continued
          connection to the organization.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {alumniMembers.map((member) => (
          <article
            key={`${member.memberedSince}-${member.status}`}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              <Image
                src={member.image}
                alt={`${member.name}, alumni member`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <span
                  className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${member.status === "Active" ? "text-[var(--gold-light)]" : "text-white/65"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${member.status === "Active" ? "bg-[var(--gold)]" : "bg-white/50"}`}
                  />
                  {member.status}
                </span>
              </div>
            </div>
            <div className="px-5 py-5">
              <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                {member.name}
              </h2>
              <div className="mt-4 border-t border-black/10 pt-4">
                <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                  Membered since
                </p>
                <p className="mt-1 font-semibold text-[var(--green-dark)]">
                  {member.memberedSince}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
