import type { Metadata } from "next";
import Image from "next/image";
import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Message of the Chapter President",
};

export default function ChapterPresidentMessagePage() {
  return (
    <PageShell title="Message of the Chapter President">
      <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div className="relative min-h-[360px] overflow-hidden bg-[var(--green-soft)]">
          <Image
            src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=85"
            alt="Temporary portrait placeholder for the newly elected chapter president"
            fill
            sizes="(max-width: 1024px) 100vw, 35vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-5 leading-8 text-black/70">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter
          </p>
          <p>To our brothers, alumni, and friends in the community,</p>
          <p>
            It is an honor to serve as the newly elected Chapter President. I
            look forward to building on the work of those who came before us
            and creating more opportunities for fellowship, leadership, and
            meaningful service.
          </p>
          <p>
            Together, let us continue to live out the values that unite our
            brotherhood and make a positive difference in Roxas City and
            beyond.
          </p>
          <p className="pt-3 font-serif text-2xl font-semibold text-[var(--green-dark)]">
            In brotherhood and service,
            <br />
            The Chapter President
          </p>
        </div>
      </div>
    </PageShell>
  );
}