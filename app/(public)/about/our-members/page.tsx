import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const metadata: Metadata = { title: "Our Members" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

type MemberBadge = {
  label: string;
  variant: "officer" | "former" | "status";
};

/**
 * Officers, former officers, and other special memberships are surfaced as
 * badges on the member's photo card. Plain "Member" records stay badge-free.
 */
function getMemberBadges(
  status: string,
  officerPosition: string | null,
): MemberBadge[] {
  if (status === "PGP-GS Roxas City Chapter Officer") {
    return [
      {
        label: officerPosition
          ? `Officer · ${officerPosition}`
          : "Chapter Officer",
        variant: "officer",
      },
    ];
  }
  if (status.startsWith("Former")) {
    return [{ label: status, variant: "former" }];
  }
  if (status !== "Member") {
    return [{ label: status, variant: "status" }];
  }
  return [];
}

const BADGE_STYLES: Record<MemberBadge["variant"], string> = {
  officer:
    "bg-[var(--gold)] text-black shadow-[0_6px_14px_rgba(201,162,39,0.45)]",
  former: "bg-[var(--army-green-dark)] text-white",
  status: "bg-[var(--green-soft)] text-[var(--green-dark)]",
};

function StarIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="h-3 w-3 fill-current">
      <path d="M6 .5l1.66 3.36 3.71.54-2.68 2.62.63 3.7L6 8.94 2.68 10.72l.63-3.7L.63 4.4l3.71-.54L6 .5z" />
    </svg>
  );
}

export default async function Page() {
  const members = await db
    .select({
      id: pgpmembers.id,
      firstName: pgpmembers.firstName,
      lastName: pgpmembers.lastName,
      middleInitial: pgpmembers.middleInitial,
      chapter: pgpmembers.memberChapter,
      dateSurvived: pgpmembers.dateSurvived,
      status: pgpmembers.status,
      officerPosition: pgpmembers.officerPosition,
      photoUrl: pgpmembers.photoUrl,
    })
    .from(pgpmembers)
    .orderBy(asc(pgpmembers.dateSurvived), asc(pgpmembers.createdAt));

  return (
    <PageShell title="Our Members">
      <div className="mb-10 max-w-2xl">
        <p className="text-base leading-7">
          This directory honors every registered member of the Pi Gamma Phi
          Gamma Sigma Roxas City Capiz Chapter — the brothers and sisters whose
          commitment to fellowship, leadership, and service keeps our
          organization strong. Each card carries the name they survived the
          trials under, the chapter they belong to, and the date they were
          welcomed into the brotherhood.
        </p>
      </div>
      {members.length === 0 ? (
        <p className="border border-black/10 bg-white px-6 py-8 text-sm text-black/60">
          No member records have been added yet.
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-black/55">
            Showing {members.length} registered{" "}
            {members.length === 1 ? "member" : "members"}.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => {
              const fullName = `${member.firstName.trim()} ${
                member.middleInitial ? `${member.middleInitial.trim()}. ` : ""
              }${member.lastName.trim()}`.replace(/\s+/g, " ");
              const badges = getMemberBadges(
                member.status,
                member.officerPosition,
              );
              return (
                <article
                  key={member.id}
                  className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
                >
                  <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt={`${fullName}, PGPGS member`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[var(--green-soft)] px-6 text-center font-serif text-2xl font-semibold text-[var(--green-dark)]">
                        {fullName}
                      </div>
                    )}
                    {badges.length > 0 ? (
                      <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                        {badges.map((badge) => (
                          <span
                            key={badge.label}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${BADGE_STYLES[badge.variant]}`}
                          >
                            {badge.variant === "officer" ? (
                              <StarIcon />
                            ) : null}
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="px-5 py-5">
                    <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
                      {fullName}
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/10 pt-4 text-sm">
                      <div className="col-span-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                          Chapter name
                        </p>
                        <p className="mt-1 font-semibold text-[var(--green-dark)]">
                          {member.chapter?.trim() || "Not recorded"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-black/45">
                          Date survived
                        </p>
                        <p className="mt-1 font-semibold text-[var(--green-dark)]">
                          {formatDate(member.dateSurvived)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}

