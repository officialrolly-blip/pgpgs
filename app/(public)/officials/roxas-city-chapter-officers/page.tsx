import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const metadata: Metadata = {
  title: "PGPGS Roxas City Capiz Chapter Officers",
};

export const dynamic = "force-dynamic";

const officerPositions = [
  "President",
  "Vice President Internal",
  "Vice President External",
  "Treasurer",
  "Secretary",
  "Auditor",
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
] as const;

export default async function Page() {
  const registeredOfficers = await db
    .select({
      id: pgpmembers.id,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      position: pgpmembers.officerPosition,
      photoUrl: pgpmembers.photoUrl,
    })
    .from(pgpmembers)
    .where(eq(pgpmembers.status, "PGP-GS Roxas City Chapter Officer"))
    .orderBy(asc(pgpmembers.createdAt));

  const chapterOfficers = officerPositions.map((position) => ({
    position,
    member: registeredOfficers.find((officer) => officer.position === position),
  }));

  return (
    <PageShell title="PGPGS Roxas City Capiz Chapter Officers">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          Meet the elected officers of the PGPGS Roxas City Capiz Chapter.
          Registered officers and their portraits appear here automatically from
          the chapter member directory.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {chapterOfficers.map((officer) => (
          <article
            key={officer.position}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              {officer.member?.photoUrl ? (
                <Image
                  src={officer.member.photoUrl}
                  alt={`${officer.member.firstName} ${officer.member.lastName}, ${officer.position}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-top"
                />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                  {officer.position}
                </p>
              </div>
            </div>
            <div className="px-5 py-5">
              <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                {officer.member
                  ? `${officer.member.firstName} ${officer.member.middleInitial ? `${officer.member.middleInitial}. ` : ""}${officer.member.lastName}`
                  : ""}
              </h2>
              <p className="mt-1 text-sm text-black/55">
                {officer.member ? "Elected officer" : ""}
              </p>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
