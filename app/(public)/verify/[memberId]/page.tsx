import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ilike } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

export const metadata: Metadata = { title: "Verify Membership ID" };
export const dynamic = "force-dynamic";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function VerifyMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const cleanId = decodeURIComponent(memberId).trim().toUpperCase();

  const [member] = await db
    .select({
      memberId: pgpmembers.memberId,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      status: pgpmembers.status,
      memberChapter: pgpmembers.memberChapter,
      dateSurvived: pgpmembers.dateSurvived,
      photoUrl: pgpmembers.photoUrl,
      hasPhoto: pgpmembers.hasPhoto,
    })
    .from(pgpmembers)
    .where(ilike(pgpmembers.memberId, cleanId))
    .limit(1);

  if (!member) notFound();

  const isVerified = member.status !== "Neophyte";
  const fullName = `${member.firstName}${
    member.middleInitial ? ` ${member.middleInitial}.` : ""
  } ${member.lastName}`;
  const chapter = member.memberChapter ?? "Roxas City Capiz Chapter";

  return (
    <main className="bg-[#fbf7ee] px-4 py-12 text-[#111111] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-3xl border border-[#e6dcc4] bg-white shadow-[0_24px_60px_rgba(15,61,38,0.14)]">
          <header className="flex items-center gap-4 bg-[linear-gradient(135deg,#0f3d26,#1b5c38)] px-6 py-6 sm:px-10">
            <Image
              src="/LOGOS.png"
              alt="Pi Gamma Phi 1975 Gamma Sigma logo"
              width={72}
              height={72}
              className="h-16 w-16 rounded-full border-2 border-white/60 bg-white/95 object-contain p-0.5"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f0e3b3]">
                Membership verification
              </p>
              <h1 className="mt-0.5 text-xl font-bold uppercase leading-tight tracking-tight text-white sm:text-2xl">
                Pi Gamma Phi 1975 Gamma Sigma
              </h1>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-white/75">
                Roxas City Capiz Chapter · Official record
              </p>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-10">
            <div className="flex items-start gap-4 rounded-2xl border border-[#d9e8de] bg-[#eef6f0] px-5 py-4">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b5c38] text-white">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0f3d26]">
                  {isVerified ? "Verified PGPGS member" : "Record found"}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#37473c]">
                  {isVerified
                    ? "This ID number matches an active, legitimate member in the official PGPGS Roxas City chapter database."
                    : "This ID number belongs to a neophyte record. It is not yet a certified full membership ID."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row">
              <div className="shrink-0">
                {member.hasPhoto && member.photoUrl ? (
                  <Image
                    src={member.photoUrl}
                    unoptimized
                    width={132}
                    height={176}
                    alt=""
                    className="h-[176px] w-[132px] rounded-2xl border border-[#e0d6bf] bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-[176px] w-[132px] items-center justify-center rounded-2xl border border-[#e0d6bf] bg-[#e7f0ea] text-4xl font-bold text-[#1b5c38]">
                    {initialsOf(fullName)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
                  Name of member
                </p>
                <p className="mt-0.5 font-serif text-2xl font-bold uppercase text-[#0f3d26]">
                  {fullName}
                </p>
                <p className="mt-0.5 font-mono text-base font-bold uppercase tracking-[0.06em] text-[#1b5c38]">
                  {member.memberId.toUpperCase()}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
                      Status
                    </p>
                    <p className="mt-0.5 text-sm font-semibold capitalize text-[#1c2c22]">
                      {member.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
                      Chapter
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1c2c22]">
                      {chapter}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
                      Date survived
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[#1c2c22]">
                      {member.dateSurvived}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
                      Verified ID
                    </p>
                    <p className="mt-0.5 text-sm font-semibold uppercase text-[#1c2c22]">
                      {member.memberId.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-7 rounded-2xl bg-[#0f3d26]/[0.05] px-5 py-4">
              <p className="text-xs leading-6 text-[#0f3d26]">
                This page is the official verification result for the
                QR-encoded membership ID on your PGPGS ID card. If you scanned
                this QR code from a physical ID, the card belongs to a
                legitimate member of the Pi Gamma Phi 1975 Gamma Sigma, Roxas
                City Capiz Chapter.
              </p>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <a
                href="https://www.pgpgsroxascity.org"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1b5c38] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f3d26]"
              >
                Visit PGPGS website
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </a>
              <Link
                href="/"
                className="text-sm font-semibold text-[#1b5c38] transition hover:text-[#0f3d26]"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#8a7b52]">
          Official record · Pi Gamma Phi 1975 Gamma Sigma · Roxas City Capiz
          Chapter
        </p>
      </div>
    </main>
  );
}