import type { Metadata } from "next";
import Link from "next/link";
import RegistrationStatusLogin from "@/components/registration-status-login";
import NeophyteWelcomeModal from "@/components/neophyte-welcome-modal";
import { registrationLogoutAction } from "@/lib/actions/registration-status-actions";
import { getRegistrationStatus } from "@/lib/neophyte-auth";
import { NEOPHYTE_STATUSES, NEOPHYTE_STATUS_LABELS } from "@/lib/member-constants";

export const metadata: Metadata = { title: "Check Application Status" };
export const dynamic = "force-dynamic";

const stages = [
  { key: "orientation", label: "Orientation", icon: "◎" },
  { key: "baptism", label: "Baptism", icon: "✦" },
  { key: "baptism_confirmed", label: "Confirmation of Baptism", icon: "✓" },
  { key: "passed_member", label: "Welcome as a new member", icon: "★" },
] as const;

function currentStage(registration: Awaited<ReturnType<typeof getRegistrationStatus>>) {
  if (!registration) return "orientation";
  if (registration.memberStatus && registration.memberStatus !== "Neophyte") return "passed_member";
  return NEOPHYTE_STATUSES.includes(registration.neophyteStatus as (typeof NEOPHYTE_STATUSES)[number])
    ? registration.neophyteStatus!
    : "orientation";
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
}

export default async function RegistrationStatusPage() {
  const registration = await getRegistrationStatus();
  if (!registration) return <main className="min-h-screen bg-[var(--a-bg)] px-4 py-8 text-a-text sm:px-8 sm:py-12"><div className="mx-auto max-w-5xl"><PortalBrand /><div className="mt-14 grid gap-8 lg:grid-cols-[1fr_0.7fr]"><section className="a-card p-6 sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.2em] text-a-gold">Applicant access</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-a-brand-dark">Track your journey</h1><p className="mt-3 text-sm leading-7 text-a-secondary">Sign in with the email and password you used during registration to see your latest neophyte formation stage.</p><RegistrationStatusLogin /></section><aside className="rounded-2xl bg-a-brand p-6 text-white sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-a-gold-light">Your path</p><h2 className="mt-2 font-serif text-2xl font-semibold">From orientation to membership</h2><p className="mt-3 text-sm leading-7 text-white/65">Your chapter officers update each stage as you complete the formation process.</p><Link href="/join" className="mt-7 inline-flex rounded-lg bg-a-gold px-5 py-3 text-sm font-bold text-a-brand-dark">Register as a neophyte</Link></aside></div></div></main>;
  const stage = currentStage(registration);
  const stageIndex = stages.findIndex((item) => item.key === stage);
  return <main className="min-h-screen bg-[var(--a-bg)] px-4 py-8 text-a-text sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><div className="flex items-center justify-between gap-4"><PortalBrand /><form action={registrationLogoutAction}><button className="a-btn a-btn-secondary a-btn-sm">Sign out</button></form></div><section className="mt-12"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-a-gold">Formation dashboard</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-a-brand-dark">Welcome, {registration.firstName}</h1><p className="mt-2 text-sm text-a-muted">Your neophyte formation progress is shown below.</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-a-muted sm:text-right">Date applied</p><p className="mt-1 text-sm font-semibold text-a-brand-dark sm:text-right">{dateLabel(registration.createdAt)}</p></div></div><div className="a-card mt-8 overflow-hidden"><div className="border-b border-a-border-soft px-5 py-5 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-a-muted">Full name of neophyte</p><p className="mt-1 text-xl font-semibold text-a-text">{registration.firstName} {registration.lastName}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-a-muted sm:text-right">Application ID</p><p className="mt-1 font-mono text-sm font-semibold text-a-brand sm:text-right">{registration.memberId}</p></div></div></div><div className="px-5 py-8 sm:px-8 sm:py-10"><div className="mb-8 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-a-brand">Formation stages</p><h2 className="mt-1 text-lg font-semibold text-a-text">{stage === "passed_member" ? "Welcome as a new member" : NEOPHYTE_STATUS_LABELS[stage as keyof typeof NEOPHYTE_STATUS_LABELS]}</h2></div><span className="a-badge a-badge-green">Stage {stageIndex + 1} of {stages.length}</span></div><div className="grid gap-6 md:grid-cols-4">{stages.map((item, index) => { const complete = index <= stageIndex; const active = index === stageIndex; return <div key={item.key} className="relative"><div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold ${complete ? "bg-a-brand text-white" : "bg-a-bg text-a-muted"} ${active ? "ring-4 ring-a-brand-soft" : ""}`}>{item.icon}</div>{index < stages.length - 1 ? <div className={`absolute left-14 top-7 hidden h-px w-[calc(100%-2rem)] md:block ${index < stageIndex ? "bg-a-brand" : "bg-a-border"}`} /> : null}<p className={`mt-3 max-w-44 text-sm font-semibold ${complete ? "text-a-brand-dark" : "text-a-muted"}`}>{item.label}</p><p className="mt-1 text-xs text-a-muted">{index < stageIndex ? "Completed" : active ? "Current stage" : "Upcoming"}</p></div>; })}</div></div><div className="border-t border-a-border-soft bg-[var(--a-bg)] px-5 py-5 sm:px-8"><p className="text-sm leading-6 text-a-secondary">{stage === "passed_member" ? "Congratulations. You are now welcomed as a new member of Pi Gamma Phi Gamma Sigma. Please coordinate with your chapter officers for your next membership details." : "Your chapter officers will update this dashboard as you complete each formation stage."}</p>{registration.reviewedAt ? <p className="mt-2 text-xs text-a-muted">Application last reviewed {dateLabel(registration.reviewedAt)}</p> : null}</div></div></section></div>{stage === "passed_member" ? <NeophyteWelcomeModal certificateHref="/join/status/certificate" /> : null}</main>;
}

function PortalBrand() { return <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-a-brand text-sm font-bold text-white">PG</span><div><p className="font-bold tracking-tight">PGPGS <span className="text-a-gold">/</span> Neophyte portal</p><p className="text-xs text-a-muted">Roxas City · Capiz</p></div></div>; }