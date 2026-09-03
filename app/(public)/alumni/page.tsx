import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";
import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const metadata: Metadata = { title: "Our Alumni" };
export const dynamic = "force-dynamic";

// All of these are considered alumni of the chapter.
const ALUMNI_STATUSES = [
  "Alumni",
  "Former Chapter President",
  "Former Chapter Vice President",
  "Former Chapter Master Initiator",
  "Former Chapter Lady Initiator",
  "Grand Knights",
] as const;

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function AlumniPage() {
  const alumniMembers = await db
    .select({
      id: pgpmembers.id,
      firstName: pgpmembers.firstName,
      lastName: pgpmembers.lastName,
      middleInitial: pgpmembers.middleInitial,
      memberedSince: pgpmembers.dateSurvived,
      status: pgpmembers.status,
      photoUrl: pgpmembers.photoUrl,
    })
    .from(pgpmembers)
    .where(inArray(pgpmembers.status, [...ALUMNI_STATUSES]))
    .orderBy(asc(pgpmembers.dateSurvived), asc(pgpmembers.createdAt));

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
      {alumniMembers.length === 0 ? (
        <p className="border border-black/10 bg-white px-6 py-8 text-sm text-black/60">
          No alumni records have been added yet.
        </p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {alumniMembers.map((member) => {
          const fullName = `${member.firstName} ${member.middleInitial ? `${member.middleInitial}. ` : ""}${member.lastName}`;
          return (
            <article
              key={member.id}
              className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
            >
              <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
                {member.photoUrl ? (
                  <Image
                    src={member.photoUrl}
                    alt={`${fullName}, alumni member`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[var(--green-soft)] px-6 text-center font-serif text-2xl font-semibold text-[var(--green-dark)]">
                    {fullName}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full bg-[var(--gold)]"
                    />
                    Active
                  </span>
                </div>
              </div>
              <div className="px-5 py-5">
                <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                  {fullName}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm">
                  <div className="col-span-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                      Member status
                    </p>
                    <p className="mt-1 font-semibold text-[var(--green-dark)]">
                      {member.status}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                      Membered since
                    </p>
                    <p className="mt-1 font-semibold text-[var(--green-dark)]">
                      {formatDate(member.memberedSince)}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}

