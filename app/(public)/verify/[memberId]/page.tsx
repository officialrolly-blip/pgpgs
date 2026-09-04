import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { ilike } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { PublicIdCardFront, PublicIdCardBack, type PublicIdMember } from "@/components/public-id-card";

export const metadata: Metadata = { title: "Verify Membership ID" };
export const dynamic = "force-dynamic";

export default async function VerifyMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const cleanId = decodeURIComponent(memberId).trim().toUpperCase();

  const [member] = await db
    .select()
    .from(pgpmembers)
    .where(ilike(pgpmembers.memberId, cleanId))
    .limit(1);

  if (!member) notFound();

  const isVerified = member.status !== "Neophyte";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const verifyUrl = `${baseUrl}/verify/${member.memberId}`;

  const qrCode = await QRCode.toDataURL(verifyUrl, {
    width: 256,
    margin: 1,
    color: { dark: "#0f3d26", light: "#ffffff" },
  });

  const fullName = [member.firstName, member.middleInitial, member.lastName]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const address = [member.street, member.barangay, member.municipality, member.province]
    .filter(Boolean)
    .join(", ");

  const idMember: PublicIdMember = {
    id: member.id,
    memberId: member.memberId,
    fullName,
    status: member.status,
    chapter: member.memberChapter || "—",
    dateOfBirth: member.dateOfBirth,
    placeOfBirth: member.placeOfBirth,
    address,
    dateSurvived: member.dateSurvived,
    baptizedName: member.baptizedName,
    photoUrl: member.photoUrl,
    hasPhoto: member.hasPhoto,
    guardianName: member.guardianName,
    guardianAddress: member.guardianAddress,
    guardianContact: member.guardianContact,
    contactNumber: member.contactNumber,
    qrCode,
  };

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
            {isVerified ? (
              <div className="flex items-start gap-4 rounded-2xl border border-[#d9e8de] bg-[#eef6f0] px-5 py-4">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b5c38] text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0f3d26]">
                    Verified membership
                  </p>
                  <p className="mt-1 text-sm text-[#1c2c22]">
                    This digital ID belongs to a registered member of the Pi Gamma
                    Phi 1975 Gamma Sigma, Roxas City Capiz Chapter.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-2xl border border-[#e8d9c4] bg-[#fdf6ec] px-5 py-4">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#b8860b] text-white">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 9v4M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#7a5a1a]">
                    Not yet verified
                  </p>
                  <p className="mt-1 text-sm text-[#1c2c22]">
                    This member&apos;s status is &quot;Neophyte&quot; — membership has not yet been confirmed by the chapter administration.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
                Digital ID card
              </p>
              <div className="mx-auto w-full max-w-[430px]">
                <div style={{ aspectRatio: "85.6 / 53.98" }} className="overflow-hidden rounded-2xl border border-white/70 shadow-[0_14px_34px_rgba(15,61,38,0.22)]">
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                      <PublicIdCardFront member={idMember} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[10px] text-[#8a7b52]">
                Front of the official PGPGS digital membership ID
              </p>
            </div>

            <div className="mt-7">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
                Back of ID card
              </p>
              <div className="mx-auto w-full max-w-[430px]">
                <div style={{ aspectRatio: "85.6 / 53.98" }} className="overflow-hidden rounded-2xl border border-white/70 shadow-[0_14px_34px_rgba(15,61,38,0.22)]">
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                      <PublicIdCardBack member={idMember} />
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[10px] text-[#8a7b52]">
                Back of the official PGPGS digital membership ID
              </p>
            </div>

            <div className="mt-7 rounded-2xl bg-[#0f3d26]/[0.05] px-5 py-4">
              <p className="text-xs leading-6 text-[#0f3d26]">
                This page is the official verification result for the
                QR-encoded membership ID on the PGPGS ID card. If you scanned
                this QR code from a physical or digital ID, the card belongs to a
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