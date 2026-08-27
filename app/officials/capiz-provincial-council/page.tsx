import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = { title: "Capiz Provincial Council" };

const councilMembers = [
  {
    name: "Name to be updated",
    position: "Provincial Council President",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    position: "Vice President",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    position: "Secretary",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    position: "Treasurer",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    position: "Auditor",
    image:
      "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    position: "Public Relations Officer",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
  },
];

export default function Page() {
  return (
    <PageShell title="Capiz Provincial Council">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          Meet the elected officers serving the Capiz Provincial Council. Their
          names and official portraits can be updated below as the complete
          council directory is confirmed.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {councilMembers.map((member) => (
          <article
            key={member.position}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              <Image
                src={member.image}
                alt={`${member.name}, ${member.position}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                  {member.position}
                </p>
              </div>
            </div>
            <div className="px-5 py-5">
              <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                {member.name}
              </h2>
              <p className="mt-1 text-sm text-black/55">Elected official</p>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
