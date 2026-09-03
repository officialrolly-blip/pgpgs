import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { alias } from "drizzle-orm/pg-core";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, pgpmembers } from "@/db/schema";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "PGPGS Across Capiz",
};

export const dynamic = "force-dynamic";

const chapterPresident = alias(pgpmembers, "chapter_president");
const chapterVicePresident = alias(pgpmembers, "chapter_vice_president");
const chapterSecretary = alias(pgpmembers, "chapter_secretary");
const chapterTreasurer = alias(pgpmembers, "chapter_treasurer");
const chapterMasterInitiator = alias(pgpmembers, "chapter_master_initiator");
const chapterLadyInitiator = alias(pgpmembers, "chapter_lady_initiator");

function personName(person: {
  first: string | null;
  middle: string | null;
  last: string | null;
}) {
  return [person.first, person.middle, person.last].filter(Boolean).join(" ");
}

export default async function PgpgsAcrossCapizPage() {
  const publishedChapters = await db
    .select({
      id: chapters.id,
      chapterName: chapters.chapterName,
      chapterAddress: chapters.chapterAddress,
      chapterOrganizer: chapters.chapterOrganizer,
      logoUrl: chapters.logoUrl,
      presidentFirst: chapterPresident.firstName,
      presidentMiddle: chapterPresident.middleInitial,
      presidentLast: chapterPresident.lastName,
      vicePresidentFirst: chapterVicePresident.firstName,
      vicePresidentMiddle: chapterVicePresident.middleInitial,
      vicePresidentLast: chapterVicePresident.lastName,
      vicePresidentRole: chapters.vicePresidentRole,
      secretaryFirst: chapterSecretary.firstName,
      secretaryMiddle: chapterSecretary.middleInitial,
      secretaryLast: chapterSecretary.lastName,
      treasurerFirst: chapterTreasurer.firstName,
      treasurerMiddle: chapterTreasurer.middleInitial,
      treasurerLast: chapterTreasurer.lastName,
      masterInitiatorFirst: chapterMasterInitiator.firstName,
      masterInitiatorMiddle: chapterMasterInitiator.middleInitial,
      masterInitiatorLast: chapterMasterInitiator.lastName,
      masterInitiatorRole: chapters.masterInitiatorRole,
      ladyInitiatorFirst: chapterLadyInitiator.firstName,
      ladyInitiatorMiddle: chapterLadyInitiator.middleInitial,
      ladyInitiatorLast: chapterLadyInitiator.lastName,
      ladyInitiatorRole: chapters.ladyInitiatorRole,
    })
    .from(chapters)
    .leftJoin(chapterPresident, eq(chapters.presidentId, chapterPresident.id))
    .leftJoin(chapterVicePresident, eq(chapters.vicePresidentId, chapterVicePresident.id))
    .leftJoin(chapterSecretary, eq(chapters.secretaryId, chapterSecretary.id))
    .leftJoin(chapterTreasurer, eq(chapters.treasurerId, chapterTreasurer.id))
    .leftJoin(chapterMasterInitiator, eq(chapters.masterInitiatorId, chapterMasterInitiator.id))
    .leftJoin(chapterLadyInitiator, eq(chapters.ladyInitiatorId, chapterLadyInitiator.id))
    .where(eq(chapters.status, "published"))
    .orderBy(asc(chapters.chapterName));

  return (
    <PageShell title="PGPGS Across Capiz">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
            Chapters in Capiz
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold text-[var(--green-dark)]">
            PGPGS Across Capiz
          </h2>
        </div>

        <Link
          href="/about/pgpgs-across-capiz/register"
          className="inline-flex items-center justify-center rounded-full bg-[var(--green-dark)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,61,38,0.2)] transition hover:bg-[var(--green)]"
        >
          Register a Chapter
        </Link>
      </div>

      <p className="max-w-3xl text-[1.05rem] leading-8 text-black/75">
        Discover active PGPGS chapters across Capiz, from their official logos to
        the chapter organizers behind each local community.
      </p>

      <section className="mt-10" aria-label="Registered chapters">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
            Published chapters
          </p>
        </div>

        {publishedChapters.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {publishedChapters.map((chapter) => {
              const officials = [
                chapter.presidentLast
                  ? { role: "President", name: personName({ first: chapter.presidentFirst, middle: chapter.presidentMiddle, last: chapter.presidentLast }) }
                  : null,
                chapter.vicePresidentLast
                  ? { role: chapter.vicePresidentRole ?? "Vice President", name: personName({ first: chapter.vicePresidentFirst, middle: chapter.vicePresidentMiddle, last: chapter.vicePresidentLast }) }
                  : null,
                chapter.secretaryLast
                  ? { role: "Secretary", name: personName({ first: chapter.secretaryFirst, middle: chapter.secretaryMiddle, last: chapter.secretaryLast }) }
                  : null,
                chapter.treasurerLast
                  ? { role: "Treasurer", name: personName({ first: chapter.treasurerFirst, middle: chapter.treasurerMiddle, last: chapter.treasurerLast }) }
                  : null,
                chapter.masterInitiatorLast
                  ? { role: `Master Initiator ${chapter.masterInitiatorRole ?? ""}`.trim(), name: personName({ first: chapter.masterInitiatorFirst, middle: chapter.masterInitiatorMiddle, last: chapter.masterInitiatorLast }) }
                  : null,
                chapter.ladyInitiatorLast
                  ? { role: `Lady Initiator ${chapter.ladyInitiatorRole ?? ""}`.trim(), name: personName({ first: chapter.ladyInitiatorFirst, middle: chapter.ladyInitiatorMiddle, last: chapter.ladyInitiatorLast }) }
                  : null,
              ].filter((official) => official !== null);

              return (
                <article
                  key={chapter.id}
                  className="overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_14px_28px_rgba(15,61,38,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_35px_rgba(15,61,38,0.12)]"
                >
                  <div className="flex h-52 items-center justify-center overflow-hidden bg-[var(--green-soft)]">
                    {chapter.logoUrl ? (
                      <Image
                        src={chapter.logoUrl}
                        alt={`${chapter.chapterName} logo`}
                        width={220}
                        height={220}
                        unoptimized
                        className="h-full w-full object-contain p-6"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[var(--green)]/25 bg-white text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green-dark)]">
                        PGPGS
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-5">
                    <h3 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                      {chapter.chapterName}
                    </h3>

                    <div className="space-y-2 text-sm text-black/65">
                      <p>
                        <span className="font-semibold text-[var(--green-dark)]">Address:</span>{" "}
                        {chapter.chapterAddress}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--green-dark)]">Organizer:</span>{" "}
                        {chapter.chapterOrganizer}
                      </p>
                    </div>

                    {officials.length > 0 ? (
                      <dl className="divide-y divide-black/10 border-t border-black/10 pt-1">
                        {officials.map((official) => (
                          <div
                            key={official.role}
                            className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                          >
                            <dt className="text-xs text-black/50">{official.role}</dt>
                            <dd className="text-sm font-semibold text-[var(--green-dark)]">
                              {official.name}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-black/15 bg-white px-5 py-8 text-sm text-black/55">
            No chapters have been published yet. Register yours below — it will
            appear here once the council reviews it.
          </div>
        )}
      </section>
    </PageShell>
  );
}