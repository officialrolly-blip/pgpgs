"use client";

import Image from "next/image";

export type HomepageOfficer = {
  id: string;
  firstName: string;
  middleInitial: string | null;
  lastName: string;
  position: string | null;
  photoUrl: string | null;
};

function getInitials(officer: HomepageOfficer) {
  return `${officer.firstName[0] ?? ""}${officer.lastName[0] ?? ""}`.toUpperCase();
}

function OfficerCard({ officer }: { officer: HomepageOfficer }) {
  const fullName = `${officer.firstName} ${officer.middleInitial ? `${officer.middleInitial}. ` : ""}${officer.lastName}`;

  return (
    <article className="w-[min(82vw,300px)] shrink-0 overflow-hidden border border-[var(--gold)]/30 bg-[var(--green-dark)] shadow-[0_16px_30px_rgba(15,61,38,0.2)] sm:w-[300px]">
      <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
        {officer.photoUrl ? (
          <Image
            src={officer.photoUrl}
            alt={`${fullName}, ${officer.position ?? "chapter officer"}`}
            fill
            sizes="300px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[var(--green-soft)] font-serif text-6xl font-semibold text-[var(--green-dark)]">
            {getInitials(officer)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.9))] px-5 pb-5 pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-light)]">
            {officer.position ?? "Chapter Officer"}
          </p>
        </div>
      </div>
      <div className="px-5 py-5">
        <h3 className="font-serif text-2xl font-semibold text-white">{fullName}</h3>
        <p className="mt-1 text-sm text-white/55">Newly elected officer</p>
      </div>
    </article>
  );
}

export default function OfficerMarquee({ officers }: { officers: HomepageOfficer[] }) {
  if (officers.length === 0) {
    return (
      <p className="border border-white/15 bg-[var(--green-dark)] px-6 py-8 text-sm text-white/60">
        Newly elected officer profiles will appear here after they are registered.
      </p>
    );
  }

  const cards = [...officers, ...officers];

  return (
    <div className="relative overflow-hidden" aria-label="Newly elected chapter officers">
      <div className="officer-marquee-track flex w-max gap-5 pr-5 hover:[animation-play-state:paused]">
        {cards.map((officer, index) => (
          <OfficerCard key={`${officer.id}-${index}`} officer={officer} />
        ))}
      </div>
    </div>
  );
}
