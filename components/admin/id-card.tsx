"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

/**
 * PGPGS membership ID card (front / back flip card).
 * - Royal green + milky white palette, PGPGS logo in the header,
 * - LOGOS.png used as a 50%-sized, low-opacity watermark,
 * - front carries the member photo, personal details, all-caps ID and a QR
 *   code that opens the public verification page,
 * - back carries the emergency contact (guardian) information.
 */

export type IdCardMember = {
  id: string;
  memberId: string; // stored uppercase, e.g. PGPGS-2024-0001
  fullName: string; // uppercase
  status: string;
  chapter: string;
  dateOfBirth: string;
  placeOfBirth: string;
  address: string;
  dateSurvived: string;
  baptizedName: string;
  photoUrl: string | null;
  hasPhoto: boolean;
  guardianName: string;
  guardianAddress: string;
  guardianContact: string;
  contactNumber: string;
  qrCode: string; // data:image/png;base64,... generated server-side
};

export default function IdCardGrid({ members }: { members: IdCardMember[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<IdCardMember | null>(null);

  const statuses = useMemo(
    () => Array.from(new Set(members.map((member) => member.status))).sort(),
    [members],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      if (!q) return true;
      return (
        member.fullName.toLowerCase().includes(q) ||
        member.memberId.toLowerCase().includes(q.replace(/\s+/g, "-")) ||
        member.chapter.toLowerCase().includes(q)
      );
    });
  }, [members, query, statusFilter]);

  useEffect(() => {
    if (!selectedMember) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedMember(null);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedMember]);

  return (
    <div>
      <div className="id-print-toolbar mb-6 flex flex-col gap-3 rounded-2xl border border-a-border bg-a-card p-4 shadow-[var(--a-shadow-sm)] sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-a-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or ID…"
            className="w-full rounded-lg border border-a-border bg-[var(--a-bg)] py-2 pl-9 pr-3 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:bg-white focus:ring-2 focus:ring-a-brand/15"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="a-select sm:w-64"
          aria-label="Filter by member status"
        >
          <option value="all">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => window.print()}
          className="a-btn a-btn-primary shrink-0"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v7H6z" />
          </svg>
          Print all IDs
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="a-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-a-text">No member IDs match your search.</p>
          <p className="mt-1 text-xs text-a-muted">Try a different name, member ID, or status.</p>
        </div>
      ) : (
        <div className="id-card-grid grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((member) => (
            <IdCard key={member.id} member={member} onOpen={() => setSelectedMember(member)} />
          ))}
        </div>
      )}

      {selectedMember ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-a-brand-dark/75 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={() => setSelectedMember(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="id-preview-title"
            className="w-full max-w-3xl rounded-2xl border border-white/20 bg-white p-4 shadow-[0_24px_80px_rgba(16,24,40,0.35)] sm:p-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-a-gold">Membership ID preview</p>
                <h2 id="id-preview-title" className="mt-1 text-lg font-semibold text-a-text">{selectedMember.fullName}</h2>
                <p className="mt-0.5 font-mono text-xs text-a-muted">{selectedMember.memberId}</p>
              </div>
              <button type="button" onClick={() => setSelectedMember(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-a-border text-xl leading-none text-a-muted transition hover:bg-[var(--a-bg)] hover:text-a-text" aria-label="Close ID preview">×</button>
            </div>
            <IdCard member={selectedMember} />
            <p className="mt-3 text-center text-xs text-a-muted">Click the card to flip between the membership details and emergency contact.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single flip card                                                    */
/* ------------------------------------------------------------------ */

function IdCard({ member, onOpen }: { member: IdCardMember; onOpen?: () => void }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${member.fullName} membership ID ${member.memberId}; activate to turn the card and show the emergency contact on the back`}
      aria-pressed={flipped}
      onClick={() => (onOpen ? onOpen() : setFlipped((value) => !value))}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (onOpen) onOpen();
          else setFlipped((value) => !value);
        }
      }}
      className="id-card-print id-card-container mx-auto w-full max-w-[440px] cursor-pointer outline-none [perspective:1600px] focus-visible:ring-2 focus-visible:ring-a-brand focus-visible:ring-offset-2"
    >
      <div
        className={`id-card-inner relative aspect-[85.6/54] w-full transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* FRONT */}
        <div className="id-front-face absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 shadow-[0_14px_34px_rgba(15,61,38,0.22)] [backface-visibility:hidden]">
          <IdHeader />
          <IdFrontBody member={member} />
          <IdFooter memberId={member.memberId} />
        </div>

        {/* BACK */}
        <div className="id-back-face absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 shadow-[0_14px_34px_rgba(15,61,38,0.22)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <BackHeader />
          <IdBackBody member={member} qrCode={member.qrCode} />
          <BackFooter />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] font-medium text-a-muted">
        {onOpen ? "Click to preview" : "Click to flip"}
        <svg viewBox="0 0 24 24" className="ml-1 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3a9 9 0 0 1 9 9M12 3v3M12 3H9M12 21a9 9 0 0 0 9-9M12 21v-3M12 21h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/LOGOS.png"
      alt="Pi Gamma Phi Gamma Sigma logo"
      width={84}
      height={84}
      className={`rounded-full border-2 border-white/60 bg-white/95 object-contain ${className ?? ""}`}
    />
  );
}

function Watermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
    >
      <Image
        src="/LOGOS.png"
        alt=""
        width={627}
        height={627}
        className="h-auto w-1/2 object-contain opacity-[0.08]"
      />
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Front face                                                          */
/* ------------------------------------------------------------------ */

function IdHeader() {
  return (
    <header className="relative z-10 flex h-[52px] shrink-0 items-center bg-[linear-gradient(135deg,#0f3d26,#1b5c38)] pl-2 pr-4">
      <Image
        src="/logo2.png"
        alt="Pi Gamma Phi Gamma Sigma logo"
        width={360}
        height={80}
        className="h-[38px] w-[260px] object-contain"
      />
    </header>
  );
}

function IdFrontBody({ member }: { member: IdCardMember }) {
  return (
    <div className="relative flex-1 overflow-hidden bg-[#fbf7ee]">
      <Watermark />
      <div className="relative z-10 flex h-full gap-3 px-3.5 py-2.5">
        {/* Left column — member photo (2x2 inch, head to shoulder) */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {member.hasPhoto && member.photoUrl ? (
            <Image
              src={member.photoUrl}
              unoptimized
              width={192}
              height={256}
              alt=""
              className="h-[150px] w-[120px] rounded-[10px] border-2 border-[#e0d6bf] bg-white object-cover object-top shadow-[0_2px_6px_rgba(15,61,38,0.12)]"
            />
          ) : (
            <div className="flex h-[150px] w-[120px] items-center justify-center rounded-[10px] border-2 border-[#e0d6bf] bg-[#e7f0ea] text-3xl font-bold text-[var(--green)] shadow-[0_2px_6px_rgba(15,61,38,0.12)]">
              {initialsOf(member.fullName)}
            </div>
          )}
          <span className="text-[7px] font-semibold uppercase tracking-[0.12em] text-[#8a7b52]">
            Member photo
          </span>
        </div>

        {/* Right column — personal details */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="rounded-[10px] border border-[#e6dcc4] bg-white/80 px-2.5 py-1.5 backdrop-blur-[1px]">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
              Full name
            </p>
            <p className="text-[12.5px] font-bold uppercase leading-tight text-[var(--green-dark)]">
              {member.fullName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-[10px] border border-[#e6dcc4] bg-white/80 px-2.5 py-1.5 backdrop-blur-[1px]">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
                Date of birth
              </p>
              <p className="text-[11px] font-semibold leading-tight text-[#1c2c22]">
                {member.dateOfBirth}
              </p>
            </div>
            <div className="rounded-[10px] border border-[#e6dcc4] bg-white/80 px-2.5 py-1.5 backdrop-blur-[1px]">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
                Place of birth
              </p>
              <p className="text-[11px] font-semibold leading-tight text-[#1c2c22]">
                {member.placeOfBirth}
              </p>
            </div>
          </div>

          <div className="flex-1 rounded-[10px] border border-[#e6dcc4] bg-white/80 px-2.5 py-1.5 backdrop-blur-[1px]">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">
              Complete address
            </p>
            <p className="text-[10.5px] font-medium leading-[1.35] text-[#1c2c22]">
              {member.address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdFooter({ memberId }: { memberId: string }) {
  return (
    <footer className="relative z-10 flex h-[38px] shrink-0 items-center justify-between bg-[linear-gradient(135deg,#0f3d26,#1b5c38)] px-4">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#f0e3b3]">
        PGPGS Membership ID number
      </p>
      <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.08em] text-white">
        {memberId}
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Back face                                                           */
/* ------------------------------------------------------------------ */

function BackHeader() {
  return (
    <header className="relative z-10 flex h-[48px] shrink-0 items-center gap-2.5 bg-[linear-gradient(135deg,#0f3d26,#1b5c38)] px-3">
      <p className="min-w-0 text-[11px] font-bold uppercase leading-tight tracking-[0.2em] text-white">
        In case of <span className="text-[#e8c96a]">emergency</span>
      </p>
      <LogoMark className="ml-auto h-9 w-9 shrink-0 p-0.5" />
    </header>
  );
}

function IdBackBody({ member, qrCode }: { member: IdCardMember; qrCode: string }) {
  return (
    <div className="relative flex-1 overflow-hidden bg-[#fbf7ee]">
      <Watermark />
      <div className="relative z-10 flex h-full gap-3 px-3.5 py-2.5">
        {/* Left column — Emergency contact + membership details (wider) */}
        <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
          <div className="rounded-[10px] border border-[#e6dcc4] bg-white/85 px-3 py-2 backdrop-blur-[1px]">
            <p className="text-[7.5px] font-bold uppercase tracking-[0.18em] text-[#8a7b52]">
              Emergency Contact Details
            </p>
            <p className="mt-1 text-[12px] font-bold uppercase leading-4 text-[var(--green-dark)]">
              {member.guardianName}
            </p>
            <p className="mt-0.5 text-[9.5px] leading-4 text-[#37473c]">
              {member.guardianAddress}
            </p>
            <p className="mt-1 font-mono text-[14px] font-bold tracking-[0.04em] text-[var(--green)]">
              {member.guardianContact}
            </p>
          </div>

          <div className="flex-1 rounded-[10px] border border-[#e6dcc4] bg-white/80 px-3 py-2 backdrop-blur-[1px]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#8a7b52]">
                  Chapter
                </p>
                <p className="text-[10px] font-semibold leading-tight text-[#1c2c22]">
                  {member.chapter}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#8a7b52]">
                  Member Contact
                </p>
                <p className="font-mono text-[10px] font-semibold text-[#1c2c22]">
                  {member.contactNumber}
                </p>
              </div>
            </div>
            <div className="mt-1.5 border-t border-[#e6dcc4] pt-1.5">
              <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#8a7b52]">
                Date Survive
              </p>
              <p className="font-mono text-[10px] font-semibold text-[#1c2c22]">
                {member.dateSurvived}
              </p>
            </div>
          </div>
        </div>

        {/* Right column — QR code only */}
        <div className="flex shrink-0 flex-col items-center justify-center gap-1">
          <Image
            src={qrCode}
            alt="Scan to verify membership"
            width={72}
            height={72}
            unoptimized
            className="h-[72px] w-[72px] object-contain"
          />
          <p className="text-[6.5px] font-bold uppercase tracking-[0.1em] text-[#8a7b52]">
            Scan to verify
          </p>
        </div>
      </div>
    </div>
  );
}

function BackFooter() {
  return (
    <footer className="relative z-10 flex h-[30px] shrink-0 items-center justify-center bg-[linear-gradient(135deg,#0f3d26,#1b5c38)] px-3.5">
      <p className="text-center text-[7.5px] font-bold uppercase leading-tight tracking-[0.2em] text-[#f0e3b3]">
        Pi Gamma Phi 1975 Gamma Sigma · Roxas City Capiz Chapter
      </p>
    </footer>
  );
}