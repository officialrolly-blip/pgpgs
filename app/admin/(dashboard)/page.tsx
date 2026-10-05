import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers, registrations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { chapterMatches } from "@/lib/chapters";
import { getMonthSummary } from "@/lib/contribution-service";
import { currentBillingMonth } from "@/lib/contributions";
import { NEOPHYTE_STATUS_LABELS, NEOPHYTE_STATUSES } from "@/lib/member-constants";
import {
  canEditMembers,
  canManageNeophytes,
  roleLabel,
  scopeChapterFor,
  scopeLabel,
} from "@/lib/officer-permissions";

export const metadata: Metadata = { title: "Overview" };

type Metric = {
  label: string;
  value: number;
  detail: string;
  href: string;
  tone: "green" | "gold" | "amber" | "slate";
  icon: "users" | "badge" | "grad" | "inbox" | "pin" | "mail";
};

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();

  // Chapter-scoped officers (chapter secretary / treasurer) are pinned to their
  // own chapter: every count, breakdown, list and total below is filtered by
  // `chapterScope`, and province-wide workflow panels are not rendered for them.
  const chapterScope = scopeChapterFor(admin);
  const seesProvinceWide = chapterScope === null;
  const chapterFilter = chapterMatches(pgpmembers.memberChapter, chapterScope);

  const [
    memberCounts,
    applicationCounts,
    chapterCounts,
    unreadMessages,
    directoryBreakdown,
    neophyteStages,
    monthlyRegistrations,
    pendingApplications,
    recentMembers,
  ] = await Promise.all([
    db.execute<{ total: number; officers: number; alumni: number }>(sql`
      select
        count(*)::int as total,
        count(*) filter (where status = 'PGP-GS Roxas City Chapter Officer')::int as officers,
        count(*) filter (where status = 'Alumni')::int as alumni
      from pgpmembers
      where status <> 'Neophyte' ${chapterFilter ? sql`and ${chapterFilter}` : sql``}
    `),
    seesProvinceWide
      ? db.execute<{ pending: number }>(
          `select count(*)::int as pending from registrations where application_status = 'pending'`,
        )
      : Promise.resolve({ rows: [] as { pending: number }[] }),
    seesProvinceWide
      ? db.execute<{ pending: number; published: number }>(
          `select
             count(*) filter (where status <> 'published')::int as pending,
             count(*) filter (where status = 'published')::int as published
           from chapters`,
        )
      : Promise.resolve({ rows: [] as { pending: number; published: number }[] }),
    seesProvinceWide
      ? db.execute<{ unread: number }>(
          `select count(*)::int as unread from contact_messages where status = 'unread'`,
        )
      : Promise.resolve({ rows: [] as { unread: number }[] }),
    db.execute<{ neophytes: number; officers: number; alumni: number; regular: number }>(sql`
      select
        count(*) filter (where status = 'Neophyte')::int as neophytes,
        count(*) filter (where status = 'PGP-GS Roxas City Chapter Officer')::int as officers,
        count(*) filter (where status = 'Alumni')::int as alumni,
        count(*) filter (where status not in ('Neophyte', 'PGP-GS Roxas City Chapter Officer', 'Alumni'))::int as regular
      from pgpmembers
      ${chapterFilter ? sql`where ${chapterFilter}` : sql``}
    `),
    db.execute<{ stage: string; total: number }>(sql`
      select coalesce(neophyte_status, 'orientation') as stage, count(*)::int as total
      from pgpmembers
      where status = 'Neophyte' ${chapterFilter ? sql`and ${chapterFilter}` : sql``}
      group by 1
    `),
    seesProvinceWide
      ? db.execute<{ month: string; total: number }>(
          `select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)::int as total
           from registrations
           where created_at >= date_trunc('month', now()) - interval '11 months'
           group by 1
           order by 1`,
        )
      : Promise.resolve({ rows: [] as { month: string; total: number }[] }),
    seesProvinceWide
      ? db
          .select({
            id: registrations.id,
            firstName: registrations.firstName,
            middleInitial: registrations.middleInitial,
            lastName: registrations.lastName,
            email: registrations.email,
            contactNumber: registrations.contactNumber,
            createdAt: registrations.createdAt,
          })
          .from(registrations)
          .where(eq(registrations.applicationStatus, "pending"))
          .orderBy(desc(registrations.createdAt))
          .limit(5)
      : Promise.resolve([]),
    db
      .select({
        id: pgpmembers.id,
        memberId: pgpmembers.memberId,
        firstName: pgpmembers.firstName,
        middleInitial: pgpmembers.middleInitial,
        lastName: pgpmembers.lastName,
        status: pgpmembers.status,
        createdAt: pgpmembers.createdAt,
      })
      .from(pgpmembers)
      .where(
        chapterFilter
          ? and(ne(pgpmembers.status, "Neophyte"), chapterFilter)
          : ne(pgpmembers.status, "Neophyte"),
      )
      .orderBy(desc(pgpmembers.createdAt))
      .limit(5),
  ]);

  const memberStats = memberCounts.rows[0];
  const pending = Number(applicationCounts.rows[0]?.pending ?? 0);
  const pendingChapters = Number(chapterCounts.rows[0]?.pending ?? 0);
  const publishedChapters = Number(chapterCounts.rows[0]?.published ?? 0);
  const unread = Number(unreadMessages.rows[0]?.unread ?? 0);
  let duesCollected = 0;
  let duesExpected = 0;
  let duesUnpaidCount = 0;
  try {
    // Scoped summary: a chapter officer only ever sees their own chapter's dues.
    const summary = await getMonthSummary(currentBillingMonth(), chapterScope);
    duesCollected = summary.collectedCents;
    duesExpected = summary.expectedCents;
    duesUnpaidCount = summary.unpaid + summary.partial;
  } catch { /* tables not migrated yet — overview stays clean */ }
  const directoryMetrics: Metric[] = [
    { label: "Members", value: Number(memberStats?.total ?? 0), detail: chapterScope ?? "Chapter directory", href: "/admin/members", tone: "green", icon: "users" },
    { label: "Officers", value: Number(memberStats?.officers ?? 0), detail: "Active appointments", href: seesProvinceWide ? "/admin/officials" : "/admin/members?status=PGP-GS+Roxas+City+Chapter+Officer", tone: "gold", icon: "badge" },
    { label: "Alumni", value: Number(memberStats?.alumni ?? 0), detail: "Former members", href: "/admin/members?status=Alumni", tone: "slate", icon: "grad" },
  ];
  const workflowMetrics: Metric[] = seesProvinceWide
    ? [
        { label: "To review", value: pending, detail: pending === 1 ? "Application pending" : "Applications pending", href: "/admin/registrations", tone: "amber", icon: "inbox" },
        { label: "Inbox", value: unread, detail: unread === 1 ? "Unread message" : "Unread messages", href: "/admin/inbox", tone: unread > 0 ? "amber" : "slate", icon: "mail" },
        { label: "Chapters", value: pendingChapters, detail: `${pendingChapters === 1 ? "Chapter" : "Chapters"} awaiting review · ${publishedChapters} published`, href: "/admin/chapters", tone: "gold", icon: "pin" },
      ]
    : [];
  const duesRate = duesExpected > 0 ? Math.round((duesCollected / duesExpected) * 100) : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLabel = now.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const directory = directoryBreakdown.rows[0] ?? { neophytes: 0, officers: 0, alumni: 0, regular: 0 };
  // Chapter officers can open the Neophyte Status module (scoped to their own
  // chapter), but the Officers page stays full-admin only — so only that segment
  // links back into the scoped directory.
  const composition = [
    { label: "Members", value: Number(directory.regular ?? 0), color: "#1b5c38", href: "/admin/members" },
    { label: "Officers", value: Number(directory.officers ?? 0), color: "#c9a227", href: seesProvinceWide ? "/admin/officials" : "/admin/members?status=PGP-GS+Roxas+City+Chapter+Officer" },
    { label: "Neophytes", value: Number(directory.neophytes ?? 0), color: "#175cd3", href: "/admin/neophytes" },
    { label: "Alumni", value: Number(directory.alumni ?? 0), color: "#98a2b3", href: "/admin/members?status=Alumni" },
  ];

  // Neophyte formation pipeline — every stage is shown even when empty so a
  // stall (or an unexpected value) is visible at a glance.
  const stageCount = new Map(neophyteStages.rows.map((row) => [row.stage, Number(row.total ?? 0)]));
  const knownStageValues = new Set<string>(NEOPHYTE_STATUSES);
  const pipeline = NEOPHYTE_STATUSES.map((stage) => ({
    stage,
    label: NEOPHYTE_STATUS_LABELS[stage],
    value: stageCount.get(stage) ?? 0,
  }));
  const unexpectedStages = [...stageCount.entries()].filter(([stage]) => !knownStageValues.has(stage));
  const pendingItems = [
    pending > 0 ? `${pending} ${pending === 1 ? "application" : "applications"} to review` : null,
    unread > 0 ? `${unread} unread ${unread === 1 ? "message" : "messages"}` : null,
    pendingChapters > 0 ? `${pendingChapters} ${pendingChapters === 1 ? "chapter" : "chapters"} awaiting review` : null,
    unexpectedStages.length > 0
      ? `${unexpectedStages.reduce((sum, [, total]) => sum + total, 0)} neophyte ${unexpectedStages.length === 1 ? "record" : "records"} with an unexpected stage`
      : null,
  ].filter(Boolean);
  const monthlyByKey = new Map(monthlyRegistrations.rows.map((row) => [row.month, Number(row.total ?? 0)]));
  const trend: { key: string; label: string; value: number; full: string }[] = [];
  // Roll the clock back by 11 months while keeping the day pinned to the 1st,
  // so month boundaries stay exact regardless of month lengths.
  const cursor = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  for (let index = 0; index < 12; index += 1) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    trend.push({
      key,
      label: cursor.toLocaleDateString("en-PH", { month: "short" }),
      value: monthlyByKey.get(key) ?? 0,
      full: cursor.toLocaleDateString("en-PH", { month: "long", year: "numeric" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const summaryLine = !seesProvinceWide
    ? chapterScope
      ? `Showing records for ${chapterScope} only.${unexpectedStages.length > 0 ? ` ${pendingItems.join(" · ")}.` : ""}`
      : "Showing records for your assigned chapter only."
    : pendingItems.length === 0
      ? "Everything is up to date — no pending applications, unread messages, or chapter reviews."
      : `${pendingItems.join(" · ")}.`;
  const scopeNotice = chapterScope
    ? `${roleLabel(admin.role)} · ${chapterScope}`
    : scopeLabel(admin);

  return (
    <>
      <section
        className="relative mb-6 overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0f3d26_0%,#1b5c38_58%,#14532d_100%)] p-6 text-white shadow-[var(--a-shadow-md)] sm:p-7"
        aria-label="Overview summary"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[rgba(201,162,39,0.16)] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gold-light)]">
              {todayLabel}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting}, {admin.name.split(" ")[0]}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{summaryLine}</p>
            <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">
              {scopeNotice}
            </p>
          </div>
          {canEditMembers(admin) ? (
            <Link href="/admin/members/new" className="a-btn a-btn-gold shrink-0 self-start sm:self-center">
              Add member
            </Link>
          ) : null}
        </div>
      </section>

      <MetricCardRow label="Directory totals" metrics={directoryMetrics} />
      {workflowMetrics.length > 0 ? (
        <MetricCardRow label="Workflows needing attention" metrics={workflowMetrics} className="mt-4" />
      ) : null}

      <section className="a-card mt-4 overflow-hidden" aria-label="This month's dues collection">
        <Link href="/admin/contributions" className="group flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="a-icon-tile bg-a-gold-soft text-[#8a6d10]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4H6v16h3v-6h4l2 2v4h3v-6l-2.5-2L18 10V4zM9 7h3v4H9z" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-a-text transition group-hover:text-a-brand">Monthly contributions · {now.toLocaleDateString("en-PH", { month: "long" })}{chapterScope ? ` · ${chapterScope}` : ""}</span>
              <span className="mt-0.5 block text-xs text-a-muted">
                ₱{(duesCollected / 100).toFixed(2)} of ₱{(duesExpected / 100).toFixed(2)} collected ({duesRate}%){duesUnpaidCount > 0 ? ` · ${duesUnpaidCount} unpaid` : " · all settled"}
              </span>
            </span>
          </div>
          <span className="flex items-center gap-3">
            <span className="h-2 w-40 overflow-hidden rounded-full bg-[var(--a-border-soft)]" role="img" aria-label={`${duesRate}% collected`}>
              <span className="block h-full rounded-full bg-a-brand" style={{ width: `${Math.min(100, duesRate)}%` }} />
            </span>
            <span className="text-sm font-medium text-a-brand transition group-hover:text-a-brand-dark">Open ledger →</span>
          </span>
        </Link>
      </section>

      <div className="mt-6 flex flex-col gap-5">
        {seesProvinceWide ? <MonthlyTrendChart months={trend} /> : null}
        <DirectoryDonutChart segments={composition} />
        <NeophytePipelineChart
          stages={pipeline}
          unexpected={unexpectedStages}
          href="/admin/neophytes"
          canManage={canManageNeophytes(admin)}
        />
      </div>

      {seesProvinceWide ? (
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.8fr)]">
        <section className="a-card overflow-hidden" aria-labelledby="review-heading">
          <PanelHeader title="Applications awaiting review" href="/admin/registrations" action="Open applications" />
          {pendingApplications.length === 0 ? (
            <EmptyState message="There are no applications awaiting review." href="/admin/registrations" action="View all applications" />
          ) : (
            <div className="overflow-x-auto">
              <table className="a-table min-w-[600px]">
                <thead>
                  <tr>
                    <th className="a-th">Applicant</th>
                    <th className="a-th">Contact</th>
                    <th className="a-th">Submitted</th>
                    <th className="a-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="[&>tr:last-child>td]:border-b-0">
                  {pendingApplications.map((application) => (
                    <tr key={application.id} className="a-tr">
                      <td className="a-td">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={personName(application)} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-a-text">{personName(application)}</p>
                            <p className="truncate text-xs text-a-muted">{application.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="a-td">{application.contactNumber}</td>
                      <td className="a-td text-a-muted"><time dateTime={application.createdAt.toISOString()}>{formatDate(application.createdAt)}</time></td>
                      <td className="a-td text-right"><Link href="/admin/registrations" className="a-btn a-btn-secondary a-btn-sm">Review</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="a-card p-5 sm:p-6" aria-labelledby="workspace-heading">
          <h2 id="workspace-heading" className="a-card-title">Common tasks</h2>
          <p className="mt-1.5 text-sm leading-6 text-a-muted">Keep chapter records current from one place.</p>
          <div className="mt-4 divide-y divide-a-border-soft border-y border-a-border-soft">
            {canEditMembers(admin) ? (
              <QuickLink href="/admin/members/new" icon="plus" title="Add a member" description="Create a chapter directory record." />
            ) : null}
            <QuickLink href="/admin/contributions" icon="peso" title="Monthly contributions" description="Review your chapter's dues ledger." />
            <QuickLink href="/admin/settings" icon="gear" title="Account settings" description="Manage your account access." />
          </div>
          <Link href="/admin/registrations" className="a-btn a-btn-gold mt-5 w-full">
            Review {pending} pending {pending === 1 ? "application" : "applications"}
          </Link>
        </aside>
      </div>
      ) : null}

      <section className="a-card mt-6 overflow-hidden" aria-labelledby="members-heading">
        <PanelHeader title={chapterScope ? `Recently added members · ${chapterScope}` : "Recently added members"} href="/admin/members" action="Open directory" />
        {recentMembers.length === 0 ? (
          <EmptyState
            message={chapterScope ? `No members recorded under ${chapterScope} yet.` : "The member directory is empty."}
            href={canEditMembers(admin) ? "/admin/members/new" : "/admin/members"}
            action={canEditMembers(admin) ? "Add the first member" : "Open the directory"}
          />
        ) : (
          <div className="grid divide-y divide-a-border-soft md:grid-cols-2 md:divide-x">
            {recentMembers.map((member) => (
              <Link key={member.id} href={`/admin/members/${member.id}`} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[var(--a-bg)]">
                <InitialsAvatar name={personName(member)} tone={member.status === "Alumni" ? "slate" : "brand"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-a-text">{personName(member)}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-a-muted">{member.memberId} · added {formatDate(member.createdAt)}</p>
                </div>
                <span className="a-badge a-badge-green shrink-0">{member.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Overview charts — hand-rendered SVG/divs, no extra dependencies      */
/* ------------------------------------------------------------------ */

function MonthlyTrendChart({ months }: { months: { key: string; label: string; value: number; full: string }[] }) {
  const max = Math.max(1, ...months.map((month) => month.value));
  const total = months.reduce((sum, month) => sum + month.value, 0);
  return (
    <section className="a-card overflow-hidden" aria-labelledby="trend-heading">
      <PanelHeader title="Applications · last 12 months" href="/admin/registrations" action="All applications" />
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="text-sm text-a-muted">Monthly submissions across the last year.</p>
        <div
          className="mt-5 flex h-44 items-end gap-2 sm:h-52 sm:gap-3"
          role="img"
          aria-label={`Monthly applications for the last 12 months, ${total} in total.`}
        >
          {months.map((month) => (
            <div key={month.key} className="group relative flex min-w-0 flex-1 flex-col items-center self-stretch" title={`${month.full}: ${month.value}`}>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition ${month.value > 0 ? "bg-a-brand group-hover:bg-a-brand-dark" : "bg-[var(--a-border-soft)]"}`}
                  style={{ height: `${Math.max(month.value > 0 ? 8 : 3, Math.round((month.value / max) * 100))}%` }}
                />
              </div>
              <span className="mt-2 w-full truncate text-center text-[10px] font-medium uppercase tracking-wide text-a-muted">{month.label}</span>
              <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-md bg-[var(--a-text)] px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-md transition group-hover:opacity-100 sm:block" aria-hidden="true">
                {month.value}
              </span>
            </div>
          ))}
        </div>
        <ul className="sr-only">
          {months.map((month) => (
            <li key={month.key}>{month.full}: {month.value} {month.value === 1 ? "application" : "applications"}</li>
          ))}
        </ul>
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-a-border-soft px-5 py-4 sm:px-6">
        <p className="text-sm text-a-muted">Total in the last year</p>
        <p className="text-sm text-a-muted">
          <span className="text-2xl font-bold tracking-tight text-a-text">{total}</span>{" "}
          {total === 1 ? "application" : "applications"}
        </p>
      </div>
    </section>
  );
}

function DirectoryDonutChart({ segments }: { segments: { label: string; value: number; color: string; href: string }[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const RADIUS = 54;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  // Cumulative offsets computed up-front (no reassignment during render).
  const boundaries: number[] = [0];
  for (const segment of segments) {
    const fraction = total === 0 ? 0 : segment.value / total;
    boundaries.push(boundaries[boundaries.length - 1]! - fraction * CIRCUMFERENCE);
  }
  const arcs = segments.map((segment, index) => ({
    ...segment,
    fraction: total === 0 ? 0 : segment.value / total,
    dashOffset: boundaries[index]!,
  }));
  return (
    <section className="a-card overflow-hidden" aria-labelledby="composition-heading">
      <PanelHeader title="Directory composition" href="/admin/members" action="Directory" />
      <div className="flex flex-col gap-6 px-5 pt-6 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
        <div
          className="relative h-44 w-44 shrink-0 self-center sm:self-auto"
          role="img"
          aria-label={total === 0 ? "The member directory is empty." : `Directory composition: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}.`}
        >
          <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="var(--a-border-soft)" strokeWidth="16" />
            {arcs.map((arc) =>
              arc.fraction > 0 ? (
                <circle
                  key={arc.label}
                  cx="64"
                  cy="64"
                  r={RADIUS}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth="16"
                  strokeDasharray={`${arc.fraction * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={arc.dashOffset}
                />
              ) : null,
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-a-text">{total}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-a-muted">records</span>
          </div>
        </div>
        <ul className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {segments.map((segment) => (
            <li key={segment.label}>
              <Link href={segment.href} className="group flex items-center gap-3 rounded-xl border border-a-border-soft px-4 py-3.5 transition hover:border-a-brand/40 hover:bg-[var(--a-bg)]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-a-secondary transition group-hover:text-a-brand">{segment.label}</span>
                  <span className="mt-0.5 block text-xs text-a-muted">
                    {total === 0 ? "0%" : `${Math.round((segment.value / total) * 100)}%`} of directory
                  </span>
                </span>
                <span className="text-lg font-bold tabular-nums text-a-text">{segment.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-a-border-soft px-5 py-4 sm:px-6">
        <p className="text-sm text-a-muted">Total directory records</p>
        <p className="text-sm text-a-muted">
          <span className="text-2xl font-bold tracking-tight text-a-text">{total}</span>{" "}
          {total === 1 ? "record" : "records"}
        </p>
      </div>
    </section>
  );
}

function NeophytePipelineChart({
  stages,
  unexpected,
  href,
  canManage,
}: {
  stages: { stage: string; label: string; value: number }[];
  unexpected: [string, number][];
  /** Chapter officers are scoped by the module itself, so the drill-down is always available. */
  href: string | null;
  canManage: boolean;
}) {
  const max = Math.max(1, ...stages.map((stage) => stage.value));
  const total = stages.reduce((sum, stage) => sum + stage.value, 0);
  return (
    <section className="a-card overflow-hidden" aria-labelledby="pipeline-heading">
      <PanelHeader title="Neophyte pipeline" href={href} action="Neophytes" />
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <p className="text-sm text-a-muted">Formation stages from orientation to full membership.</p>
        <ol className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {stages.map((stage, index) => (
            <li key={stage.stage}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-a-secondary">
                  <span className="mr-1.5 font-mono text-[11px] text-a-muted">{String(index + 1).padStart(2, "0")}</span>
                  {stage.label}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-a-text">{stage.value}</span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--a-border-soft)]"
                role="img"
                aria-label={`${stage.label}: ${stage.value} ${stage.value === 1 ? "neophyte" : "neophytes"}`}
              >
                <div
                  className="h-full rounded-full bg-a-brand"
                  style={{ width: `${Math.max(stage.value > 0 ? 6 : 0, Math.round((stage.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
        {unexpected.length > 0 ? (
          <p className="mt-5 rounded-lg bg-a-warning-soft px-3 py-2 text-xs font-medium leading-5 text-a-warning">
            {unexpected.reduce((sum, [, count]) => sum + count, 0)} {unexpected.length === 1 ? "record has" : "records have"} an
            unexpected stage ({unexpected.map(([stage]) => stage).join(", ")}).
            {canManage ? " Open a neophyte to reset it." : ""}
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-a-border-soft px-5 py-4 sm:px-6">
        <p className="text-sm text-a-muted">Total in formation</p>
        <p className="text-sm text-a-muted">
          <span className="text-2xl font-bold tracking-tight text-a-text">{total}</span>{" "}
          {total === 1 ? "neophyte" : "neophytes"}
        </p>
      </div>
    </section>
  );
}

function PanelHeader({ title, href, action }: { title: string; href?: string | null; action?: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-a-border px-5 py-4">
      <h2 className="a-card-title">{title}</h2>
      {href ? (
        <Link href={href} className="shrink-0 text-sm font-medium text-a-brand transition hover:text-a-brand-dark">
          {action} →
        </Link>
      ) : null}
    </header>
  );
}

function InitialsAvatar({ name, tone = "brand" }: { name: string; tone?: "brand" | "slate" | "gold" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
  const tones: Record<string, string> = {
    brand: "bg-a-brand-soft text-a-brand",
    slate: "bg-gray-100 text-a-secondary",
    gold: "bg-a-gold-soft text-[#8a6d10]",
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tones[tone]}`} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

function EmptyState({ message, href, action }: { message: string; href: string; action: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-a-brand-soft text-a-brand" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 7H4l1 13h14l1-13ZM4 7l2-3h12l2 3M9 11a3 3 0 0 0 6 0" />
        </svg>
      </span>
      <p className="mt-3 text-sm text-a-muted">{message}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-a-brand transition hover:text-a-brand-dark">
        {action} →
      </Link>
    </div>
  );
}

const taskIcons = {
  plus: "M12 5v14M5 12h14",
  badge: "M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6zM9 12l2 2 4-4",
  pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  peso: "M15 4H6v16h3v-6h4l2 2v4h3v-6l-2.5-2L18 10V4zM9 7h3v4H9z",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.1v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H7v-2.1h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.1v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.1h-.2a1.7 1.7 0 0 0-1.5 1Z",
};

function QuickLink({ href, icon, title, description }: { href: string; icon: keyof typeof taskIcons; title: string; description: string }) {
  return (
    <Link href={href} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3.5 transition hover:bg-[var(--a-bg)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-a-brand-soft text-a-brand transition group-hover:bg-a-brand group-hover:text-white">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={taskIcons[icon]} />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-a-text">{title}</span>
        <span className="mt-0.5 block text-xs text-a-muted">{description}</span>
      </span>
      <span className="text-a-muted transition group-hover:translate-x-0.5 group-hover:text-a-brand" aria-hidden="true">→</span>
    </Link>
  );
}

const toneChips: Record<Metric["tone"], string> = {
  green: "bg-a-brand-soft text-a-brand",
  gold: "bg-a-gold-soft text-[#8a6d10]",
  amber: "bg-a-warning-soft text-a-warning",
  slate: "bg-gray-100 text-a-muted",
};

function MetricIcon({ name }: { name: Metric["icon"] }) {
  const paths: Record<Metric["icon"], string> = {
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    badge: "M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6zM9 12l2 2 4-4",
    grad: "m12 3 10 5-10 5L2 8ZM6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5",
    inbox: "M4 4h16v13H4zM4 13h4l2 3h4l2-3h4M8 8h8",
    mail: "M3 5h18v14H3zM3 7l9 6 9-6",
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function MetricCardRow({ label, metrics, className = "" }: { label: string; metrics: Metric[]; className?: string }) {
  return (
    <section className={`grid gap-4 sm:grid-cols-3 ${className}`} aria-label={label}>
      {metrics.map((metric) => (
        <Link
          key={metric.label}
          href={metric.href}
          className={`a-card a-card-hover group p-5 ${metric.tone === "amber" && metric.value > 0 ? "border-a-warning/40 ring-1 ring-a-warning/20" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className={`a-icon-tile ${toneChips[metric.tone]}`}>
              <MetricIcon name={metric.icon} />
            </span>
            <span className="text-lg text-a-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true">
              →
            </span>
          </div>
          <p className="mt-4 text-3xl font-bold tracking-tight text-a-text">{metric.value}</p>
          <p className="mt-1 text-sm font-semibold text-a-text">{metric.label}</p>
          <p className="mt-0.5 text-xs leading-4 text-a-muted">{metric.detail}</p>
        </Link>
      ))}
    </section>
  );
}

function personName(person: { firstName: string; middleInitial: string | null; lastName: string }) {
  return `${person.firstName}${person.middleInitial ? ` ${person.middleInitial}.` : ""} ${person.lastName}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}
