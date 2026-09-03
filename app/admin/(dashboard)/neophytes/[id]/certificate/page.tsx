import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import PrintButton from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Neophyte Certification" };

export default async function NeophyteCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [neophyte] = await db.select().from(pgpmembers).where(eq(pgpmembers.id, id)).limit(1);
  if (!neophyte?.neophyteCertificationIssuedAt) notFound();

  const name = `${neophyte.firstName}${neophyte.middleInitial ? ` ${neophyte.middleInitial}.` : ""} ${neophyte.lastName}`;
  const issuedDate = neophyte.neophyteCertificationIssuedAt.toLocaleDateString("en-PH", { day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-[#f1eee4] px-4 py-8 text-[var(--green-dark)] sm:px-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl print:max-w-none">
        <div className="mb-4 flex items-center justify-between print:hidden"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/45">PGPGS Admin · Certification</p><PrintButton /></div>
        <article className="border-[10px] border-double border-[var(--green-dark)] bg-white px-7 py-10 text-center shadow-[0_18px_45px_rgba(15,61,38,0.12)] sm:px-16 sm:py-14 print:min-h-screen print:border-[10px] print:shadow-none">
          <Image src="/PI GAMMA PHI.png" width={90} height={90} alt="Pi Gamma Phi logo" className="mx-auto h-20 w-20 object-contain" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">Pi Gamma Phi 1975 · Gamma Sigma</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/50">Roxas City Capiz Chapter</p>
          <div className="mx-auto mt-9 max-w-2xl border-y border-[var(--gold)]/60 py-6"><h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--green-dark)] sm:text-5xl">Certificate of Membership</h1><p className="mt-3 text-sm leading-6 text-black/65">This is to certify that</p><p className="mt-3 text-3xl font-semibold text-[var(--green)] sm:text-4xl">{name}</p><p className="mt-4 text-sm leading-6 text-black/65">has completed the required neophyte formation stages and is hereby declared an official member of Pi Gamma Phi 1975 Gamma Sigma, Roxas City Capiz Chapter.</p></div>
          <div className="mx-auto mt-8 max-w-lg text-left"><p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Requirements completed</p><ul className="mt-4 grid gap-2 sm:grid-cols-2">{["Orientation", "Baptism", "Confirmation of Baptism", "Passed as a Member"].map((requirement) => <li key={requirement} className="flex items-center gap-2 text-sm text-black/70"><span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--green-soft)] text-xs font-bold text-[var(--green)]">✓</span>{requirement}</li>)}</ul></div>
          <div className="mt-12 grid gap-8 text-left text-xs text-black/55 sm:grid-cols-2"><div className="border-t border-black/30 pt-2"><p>Issued {issuedDate}</p><p className="mt-1">Certificate holder · {neophyte.memberId}</p></div><div className="border-t border-black/30 pt-2"><p>Issued by</p><p className="mt-1">{neophyte.neophyteCertificationIssuedBy ?? "Chapter administration"}</p></div></div>
          <p className="mt-12 text-[10px] uppercase tracking-[0.18em] text-black/35">Official chapter record · Verify with the PGPGS Roxas City administration</p>
        </article>
      </div>
    </main>
  );
}
