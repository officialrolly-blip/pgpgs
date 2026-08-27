import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const metadata: Metadata = { title: "Former Chapter President" };

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function Page() {
  const formerPresidents = await db
    .select({
      id: pgpmembers.id,
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      lastName: pgpmembers.lastName,
      middleInitial: pgpmembers.middleInitial,
      dateStarted: pgpmembers.formerPresidentStart,
      dateEnded: pgpmembers.formerPresidentEnd,
      photoUrl: pgpmembers.photoUrl,
    })
    .from(pgpmembers)
    .where(eq(pgpmembers.status, "Former Chapter President"))
    .orderBy(asc(pgpmembers.formerPresidentStart), asc(pgpmembers.createdAt));

  return (
    <PageShell title="Former Chapter President">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          Honoring the brothers who have served as Chapter President.
        </p>
      </div>
      {formerPresidents.length === 0 ? (
        <p className="border border-black/10 bg-white px-6 py-8 text-sm text-black/60">
          No former chapter president records have been added yet.
        </p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {formerPresidents.map((president) => (
          <article
            key={president.id}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              {president.photoUrl ? (
                <Image
                  src={president.photoUrl}
                  alt={`${president.firstName} ${president.lastName}, former Chapter President`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[var(--green-soft)] px-6 text-center font-serif text-2xl font-semibold text-[var(--green-dark)]">
                  {president.firstName} {president.lastName}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                  Chapter President
                </p>
              </div>
            </div>
            <div className="px-5 py-5">
              <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                {president.firstName} {president.middleInitial ? `${president.middleInitial}. ` : ""}{president.lastName}
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                    Served from
                  </p>
                  <p className="mt-1 font-semibold text-[var(--green-dark)]">
                    {formatDate(president.dateStarted)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                    Served until
                  </p>
                  <p className="mt-1 font-semibold text-[var(--green-dark)]">
                    {formatDate(president.dateEnded)}
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
