import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = { title: "Former Chapter President" };

const formerPresidents = [
  {
    name: "Name to be updated",
    from: "1973",
    until: "1975",
    image:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    from: "1976",
    until: "1978",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    from: "1979",
    until: "1981",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    from: "1982",
    until: "1984",
    image:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    from: "1985",
    until: "1987",
    image:
      "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=85",
  },
  {
    name: "Name to be updated",
    from: "1988",
    until: "1990",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=85",
  },
];

export default function Page() {
  return (
    <PageShell title="Former Chapter President">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          Honoring the brothers who have served as Chapter President. Names,
          portraits, and service years below are temporary placeholders awaiting
          confirmation from the official chapter records.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {formerPresidents.map((president) => (
          <article
            key={`${president.from}-${president.until}`}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              <Image
                src={president.image}
                alt={`${president.name}, former Chapter President`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                  Chapter President
                </p>
              </div>
            </div>
            <div className="px-5 py-5">
              <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                {president.name}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                    Served from
                  </p>
                  <p className="mt-1 font-semibold text-[var(--green-dark)]">
                    {president.from}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                    Served until
                  </p>
                  <p className="mt-1 font-semibold text-[var(--green-dark)]">
                    {president.until}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
