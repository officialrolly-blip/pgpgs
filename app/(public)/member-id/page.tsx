"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type SearchMember = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
};

type IdMember = {
  id: string;
  memberId: string;
  fullName: string;
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
  qrCode: string;
};

type Phase = "search" | "verify-modal" | "verifying" | "credentials-created" | "login" | "id";

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]!).slice(0, 2).join("").toUpperCase();
}

function formatFullName(m: SearchMember): string {
  return [m.firstName, m.middleInitial, m.lastName].filter(Boolean).join(" ").toUpperCase();
}

const GREEN_DARK = "#0f3d26";
const GREEN = "#1b5c38";
const GOLD = "#e8c96a";

export default function MemberIdPage() {
  const [phase, setPhase] = useState<Phase>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<SearchMember | null>(null);
  const [dateSurvived, setDateSurvived] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdMemberId, setCreatedMemberId] = useState("");
  const [idMember, setIdMember] = useState<IdMember | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [loginMemberId, setLoginMemberId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      if (query.trim().length < 2 || cancelled) { setResults([]); setSearchLoading(false); return; }
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/member-id/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (!cancelled) setResults(data.members ?? []);
      } catch { if (!cancelled) setResults([]); }
      if (!cancelled) setSearchLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setResults([]);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const pickMember = useCallback((m: SearchMember) => {
    setSelectedMember(m);
    setQuery(formatFullName(m));
    setResults([]);
    setDateSurvived("");
    setError("");
    setPhase("verify-modal");
  }, []);

  const verifyDate = useCallback(async () => {
    if (!selectedMember || !dateSurvived) return;
    setLoading(true);
    setError("");
    setPhase("verifying");
    try {
      const res = await fetch("/api/member-id/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMember.id, dateSurvived }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Verification failed."); setPhase("verify-modal"); return; }
      setCreatedMemberId(data.memberId);
      setLoginMemberId(data.memberId);
      setPhase("credentials-created");
    } catch {
      setError("Something went wrong. Please try again.");
      setPhase("verify-modal");
    } finally { setLoading(false); }
  }, [selectedMember, dateSurvived]);

  const login = useCallback(async () => {
    if (!loginMemberId || !loginPassword) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/member-id/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: loginMemberId.trim().toUpperCase(), password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed."); setLoading(false); return; }
      const meRes = await fetch("/api/member-id/me");
      const meData = await meRes.json();
      if (!meRes.ok) { setError(meData.error ?? "Failed to load your ID."); setLoading(false); return; }
      setIdMember(meData.member);
      setPhase("id");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }, [loginMemberId, loginPassword]);

  const logout = useCallback(async () => {
    await fetch("/api/member-id/logout", { method: "POST" });
    setPhase("search");
    setQuery("");
    setIdMember(null);
    setFlipped(false);
    setLoginMemberId("");
    setLoginPassword("");
    setCreatedMemberId("");
  }, []);

  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: "linear-gradient(180deg,#f7f3ea 0%,#fdfbf5 100%)" }}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-1 flex justify-center">
            <Image src="/logo3.png" alt="PGPGS logo" width={360} height={80} className="h-10 w-auto object-contain" priority />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-[0.18em] sm:text-3xl" style={{ color: GREEN_DARK }}>Digital Membership ID</h1>
          <p className="mt-2 text-sm text-[#5a6b5f]">Search your name, verify your identity, and access your official PGPGS digital ID.</p>
        </div>
        {phase === "search" && (
          <div className="rounded-2xl border border-[#e6dcc4] bg-white/80 p-6 shadow-lg backdrop-blur">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">Search your name</label>
            <div ref={searchRef} className="relative">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type your first or last name…" className="w-full rounded-lg border border-[#d9ceb3] bg-[#fdfbf7] px-4 py-3 text-sm text-[#1c2c22] outline-none transition focus:border-[#1b5c38] focus:ring-2 focus:ring-[#1b5c38]/15" />
              {searchLoading && query.trim().length >= 2 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[#e6dcc4] bg-white px-4 py-3 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#d9ceb3] border-t-[#1b5c38]"></div>
                    <span className="text-sm text-[#8a7b52]">Searching members...</span>
                  </div>
                </div>
              )}
              {!searchLoading && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#e6dcc4] bg-white shadow-xl">
                  {results.map((m) => (
                    <button key={m.id} type="button" onClick={() => pickMember(m)} className="flex w-full items-center gap-3 border-b border-[#f0e9d8] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f7f2e6]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f0ea] text-xs font-bold" style={{ color: GREEN }}>{initialsOf(formatFullName(m))}</div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1c2c22]">{formatFullName(m)}</p>
                        <p className="truncate text-xs text-[#8a7b52]">{m.memberId}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!searchLoading && query.trim().length >= 2 && results.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[#e6dcc4] bg-white px-4 py-3 shadow-xl">
                  <p className="text-sm text-[#8a7b52]">No members found matching "{query.trim()}"</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-[#8a7b52]">Your name must match the official PGPGS records. Only full members can access a digital ID.</p>
          </div>
        )}
        {phase === "verify-modal" && selectedMember && (
          <div className="rounded-2xl border border-[#e6dcc4] bg-white/90 p-6 shadow-xl backdrop-blur">
            <div className="mb-4 flex items-center gap-3 rounded-lg bg-[#f7f2e6] px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f0ea] text-xs font-bold" style={{ color: GREEN }}>{initialsOf(formatFullName(selectedMember))}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#1c2c22]">{formatFullName(selectedMember)}</p>
                <p className="truncate text-xs text-[#8a7b52]">{selectedMember.memberId}</p>
              </div>
              <button type="button" onClick={() => { setPhase("search"); setQuery(""); setSelectedMember(null); }} className="ml-auto rounded-md px-2 py-1 text-xs font-semibold text-[#8a7b52] transition hover:bg-[#e6dcc4]">Change</button>
            </div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">Enter your Date of Survive</label>
            <input type="date" value={dateSurvived} onChange={(e) => setDateSurvived(e.target.value)} className="w-full rounded-lg border border-[#d9ceb3] bg-[#fdfbf7] px-4 py-3 text-sm text-[#1c2c22] outline-none transition focus:border-[#1b5c38] focus:ring-2 focus:ring-[#1b5c38]/15" />
            <p className="mt-2 text-xs text-[#8a7b52]">This is the date recorded in your PGPGS membership profile.</p>
            {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => { setPhase("search"); setSelectedMember(null); }} className="flex-1 rounded-lg border border-[#d9ceb3] px-4 py-2.5 text-sm font-semibold text-[#5a6b5f] transition hover:bg-[#f7f2e6]">Cancel</button>
              <button type="button" onClick={verifyDate} disabled={!dateSurvived} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>Verify & Create Account</button>
            </div>
          </div>
        )}
        {phase === "verifying" && (
          <div className="flex flex-col items-center rounded-2xl border border-[#e6dcc4] bg-white/90 px-6 py-12 shadow-xl">
            <div className="mb-5 h-14 w-14 animate-spin rounded-full border-4 border-[#e6dcc4]" style={{ borderTopColor: GREEN }} />
            <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: GREEN_DARK }}>Verifying your identity…</p>
            <p className="mt-1 text-xs text-[#8a7b52]">Confirming your membership details</p>
          </div>
        )}
        {(phase === "credentials-created" || phase === "login") && (
          <div className="rounded-2xl border border-[#e6dcc4] bg-white/90 p-6 shadow-xl backdrop-blur">
            {phase === "credentials-created" && (
              <div className="mb-5 rounded-lg border border-[#d4e8d6] bg-[#f0f7f1] px-4 py-3">
                <p className="text-sm font-bold" style={{ color: GREEN_DARK }}>Your digital-ID account has been created!</p>
                <p className="mt-1 text-xs text-[#5a6b5f]">Use your PGPGS Member ID as both your username and password to log in.</p>
              </div>
            )}
            <div className="mb-4 rounded-lg px-4 py-3 text-center" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
              <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: GOLD }}>Your Login Credentials</p>
              <p className="mt-1 font-mono text-lg font-bold text-white">{createdMemberId || loginMemberId}</p>
              <p className="mt-0.5 text-[10px] text-white/70">Username & Password are the same</p>
            </div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">Username</label>
            <input type="text" value={loginMemberId} onChange={(e) => setLoginMemberId(e.target.value)} placeholder="PGPGS-XXXX-XXXX" className="mb-3 w-full rounded-lg border border-[#d9ceb3] bg-[#fdfbf7] px-4 py-2.5 text-sm text-[#1c2c22] outline-none transition focus:border-[#1b5c38] focus:ring-2 focus:ring-[#1b5c38]/15" />
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.16em] text-[#8a7b52]">Password</label>
            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Same as your Member ID" className="mb-1 w-full rounded-lg border border-[#d9ceb3] bg-[#fdfbf7] px-4 py-2.5 text-sm text-[#1c2c22] outline-none transition focus:border-[#1b5c38] focus:ring-2 focus:ring-[#1b5c38]/15" />
            {error && <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <button type="button" onClick={login} disabled={loading || !loginMemberId || !loginPassword} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>}
              <span>{loading ? "Signing in…" : "Sign In to View My ID"}</span>
            </button>
          </div>
        )}
        {phase === "id" && idMember && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => setFlipped((p) => !p)} className="rounded-lg border border-[#d9ceb3] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#5a6b5f] transition hover:bg-[#f7f2e6]">{flipped ? "View Front" : "View Back"}</button>
              <button type="button" onClick={logout} className="rounded-lg border border-red-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition hover:bg-red-50">Sign Out</button>
            </div>
            <DigitalIdCard member={idMember} flipped={flipped} />
            <p className="mt-4 text-center text-[10px] text-[#8a7b52]">This is your official PGPGS digital membership ID. You may be asked to present it for verification.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function DigitalIdCard({ member, flipped }: { member: IdMember; flipped: boolean }) {
  return (
    <div className="id-card-perspective mx-auto w-full max-w-[430px] select-none" style={{ aspectRatio: "85.6 / 53.98" }}>
      <div className="id-card-inner relative h-full w-full transition-transform duration-700" style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div className="id-card-front absolute inset-0 overflow-hidden rounded-2xl shadow-xl select-none" style={{ backfaceVisibility: "hidden", userSelect: "none", WebkitUserSelect: "none" }} onCopy={(e) => e.preventDefault()}>
          <IdCardFront member={member} />
        </div>
        <div className="id-card-back absolute inset-0 overflow-hidden rounded-2xl shadow-xl select-none" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", userSelect: "none", WebkitUserSelect: "none" }} onCopy={(e) => e.preventDefault()}>
          <IdCardBack member={member} />
        </div>
      </div>
    </div>
  );
}

function DetailCard({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="px-1 py-1">
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#8a7b52]">{label}</p>
      {large ? (
        <p className="text-[13px] font-bold uppercase leading-tight" style={{ color: GREEN_DARK }}>{value}</p>
      ) : (
        <p className="text-[10px] font-semibold leading-tight text-[#1c2c22]">{value}</p>
      )}
    </div>
  );
}

function IdCardFront({ member }: { member: IdMember }) {
  return (
    <div className="flex h-full flex-col" style={{ color: GREEN_DARK }}>
      <header className="relative z-10 flex h-[56px] shrink-0 items-center pl-3 pr-4" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
        <Image src="/logo2.png" alt="Pi Gamma Phi Gamma Sigma logo" width={360} height={80} className="h-[44px] w-[280px] object-contain" />
      </header>
      <div className="watermark-container pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <Image src="/LOGOS.png" alt="" width={400} height={400} unoptimized className="w-1/2 object-contain opacity-[0.08]" />
      </div>
      <div className="relative z-10 flex flex-1 gap-3 px-3 py-2">
        <div className="flex shrink-0 flex-col items-center gap-1">
          {member.hasPhoto && member.photoUrl ? (
            <Image src={member.photoUrl} unoptimized width={192} height={256} alt="" className="h-[140px] w-[110px] rounded-[8px] border-2 border-[#e0d6bf] bg-white object-cover object-top shadow-[0_2px_6px_rgba(15,61,38,0.12)]" style={{ objectPosition: "center 15%" }} />
          ) : (
            <div className="flex h-[140px] w-[110px] items-center justify-center rounded-[8px] border-2 border-[#e0d6bf] text-3xl font-bold shadow-[0_2px_6px_rgba(15,61,38,0.12)]" style={{ background: "#e7f0ea", color: GREEN }}>{initialsOf(member.fullName)}</div>
          )}
          <span className="text-[7px] font-semibold uppercase tracking-[0.1em] text-[#8a7b52]">Member photo</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <DetailCard label="Full name" value={member.fullName} large />
          <div className="grid grid-cols-2 gap-1.5">
            <DetailCard label="Date of birth" value={member.dateOfBirth} />
            <DetailCard label="Place of birth" value={member.placeOfBirth} />
          </div>
          <div className="flex-1"><DetailCard label="Complete address" value={member.address} /></div>
        </div>
      </div>
      <footer className="relative z-10 flex h-[28px] shrink-0 items-center justify-between px-3" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
        <p className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: GOLD }}>PGPGS Membership ID number</p>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-white">{member.memberId}</p>
      </footer>
    </div>
  );
}

function IdCardBack({ member }: { member: IdMember }) {
  return (
    <div className="flex h-full flex-col" style={{ color: GREEN_DARK }}>
      <header className="relative z-10 flex h-[36px] shrink-0 items-center gap-2 px-3" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
        <p className="min-w-0 text-[9px] font-bold uppercase leading-tight tracking-[0.18em] text-white">In case of <span style={{ color: GOLD }}>emergency</span></p>
        <div className="ml-auto h-7 w-7 shrink-0 rounded-full bg-white/15 p-0.5">
          <Image src="/logo2.png" alt="PGPGS" width={36} height={36} className="h-full w-full object-contain" />
        </div>
      </header>
      <div className="watermark-container pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ transform: 'rotate(-30deg) scale(1.8)' }}>
          {[...Array(12)].map((_, row) => (
            <div key={row} className="flex justify-around" style={{ marginTop: row * 30 }}>
              {[...Array(8)].map((_, col) => (
                <p key={col} className="text-sm font-bold uppercase tracking-[0.1em] text-[#1b5c38]" style={{ opacity: 0.06 }}>
                  PGPGS
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="relative z-10 flex flex-1 gap-2 px-3 py-2">
        <div className="flex min-w-0 flex-[2] flex-col gap-1.5">
          <div className="px-1 py-1">
            <p className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#8a7b52]">Emergency Contact Details</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase leading-3.5" style={{ color: GREEN_DARK }}>{member.guardianName}</p>
            <p className="mt-0.5 text-[8px] leading-3.5 text-[#37473c]">{member.guardianAddress}</p>
            <p className="mt-0.5 font-mono text-[11px] font-bold tracking-[0.04em]" style={{ color: GREEN }}>{member.guardianContact}</p>
          </div>
          <div className="flex-1 px-1 py-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">Chapter</p>
                <p className="text-[9px] font-semibold leading-tight text-[#1c2c22]">{member.chapter}</p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">Member Contact</p>
                <p className="font-mono text-[9px] font-semibold text-[#1c2c22]">{member.contactNumber}</p>
              </div>
            </div>
            <div className="mt-1.5 pt-1.5">
              <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#8a7b52]">Date Survive</p>
              <p className="font-mono text-[9px] font-semibold text-[#1c2c22]">{member.dateSurvived}</p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center justify-center gap-2">
          <Image src={member.qrCode} alt="Scan to verify membership" width={130} height={130} unoptimized className="h-[130px] w-[130px] object-contain" />
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a7b52]">Scan to verify</p>
        </div>
      </div>
      <footer className="relative z-10 flex h-[24px] shrink-0 items-center justify-center px-3" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
        <p className="text-center text-[7px] font-bold uppercase leading-tight tracking-[0.18em]" style={{ color: GOLD }}>Pi Gamma Phi 1975 Gamma Sigma · Roxas City Capiz Chapter</p>
      </footer>
    </div>
  );
}

