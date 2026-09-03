import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers, registrations } from "@/db/schema";
import PageHeading from "@/components/admin/page-heading";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Overview" };

type Metric = {
  label: string;
  value: number;
  detail: string;
  href: string;
  tone: "green" | "gold" | "amber" | "slate";
  icon: "users" | "badge" | "grad" | "inbox" | "pin";
};

export default async function AdminOverviewPage() {
  const admin = await requireAdmin();

  const [memberCounts, applicationCounts, chapterCounts, pendingApplications, recentMembers] = await Promise.all([
    db.execute<{ total: number; officers: number; alumni: number }>(
      `select
         count(*)::int as total,
         count(*) filter (where status = 'PGP-GS Roxas City Chapter Officer')::int as officers,
         count(*) filter (where status = 'Alumni')::int as alumni
       from pgpmembers
       where status <> 'Neophyte'`,
    ),
    db.execute<{ pending: number }>(
      `select count(*)::int as pending from registrations where application_status = 'pending'`,
    ),
    db.execute<{ pending: number; published: number }>(
      `select
         count(*) filter (where status <> 'published')::int as pending,
         count(*) filter (where status = 'published')::int as published
       from chapters`,
    ),
    db
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
      .limit(5),
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
      .where(ne(pgpmembers.status, "Neophyte"))
      .orderBy(desc(pgpmembers.createdAt))
      .limit(5),
  ]);

  const memberStats = memberCounts.rows[0];
  const pending = Number(applicationCounts.rows[0]?.pending ?? 0);
  const pendingChapters = Number(chapterCounts.rows[0]?.pending ?? 0);
  const publishedChapters = Number(chapterCounts.rows[0]?.published ?? 0);
  const metrics: Metric[] = [
    { label: "Members", value: Number(memberStats?.total ?? 0), detail: "Chapter directory", href: "/admin/members", tone: "green", icon: "users" },
    { label: "Officers", value: Number(memberStats?.officers ?? 0), detail: "Active appointments", href: "/admin/officials", tone: "gold", icon: "badge" },
    { label: "Alumni", value: Number(memberStats?.alumni ?? 0), detail: "Former members", href: "/admin/members?status=Alumni", tone: "slate", icon: "grad" },
    { label: "To review", value: pending, detail: pending === 1 ? "Application pending" : "Applications pending", href: "/admin/registrations", tone: "amber", icon: "inbox" },
    { label: "Chapters", value: pendingChapters, detail: `${pendingChapters === 1 ? "Chapter" : "Chapters"} awaiting review · ${publishedChapters} published`, href: "/admin/chapters", tone: "gold", icon: "pin" },
  ];

  return (
    <>
      <PageHeading
        title="Overview"
        description={`Signed in as ${admin.name}. Here is the current chapter activity.`}
        actions={
          <Link href="/admin/members/new" className="a-btn a-btn-primary">
            Add member
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Chapter totals">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="a-card a-card-hover group p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-a-muted">{metric.label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${toneChips[metric.tone]}`}>
                <MetricIcon name={metric.icon} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-a-text">{metric.value}</p>
            <p className="mt-1.5 text-xs leading-4 text-a-muted">
              {metric.detail}
              <span className="ml-1 inline-block opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100">→</span>
            </p>
          </Link>
        ))}
      </section>

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
                      <td className="a-td"><p className="font-semibold text-a-text">{personName(application)}</p><p className="mt-0.5 text-xs text-a-muted">{application.email}</p></td>
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
            <QuickLink href="/admin/members/new" title="Add a member" description="Create a chapter directory record." />
            <QuickLink href="/admin/officials" title="Manage officers" description="Assign or update chapter positions." />
            <QuickLink href="/admin/chapters" title="Review chapters" description="Publish PGPGS Across Capiz registrations." />
            <QuickLink href="/admin/settings" title="Account settings" description="Manage administrator access." />
          </div>
          <Link href="/admin/registrations" className="a-btn a-btn-gold mt-5 w-full">
            Review {pending} pending {pending === 1 ? "application" : "applications"}
          </Link>
        </aside>
      </div>

      <section className="a-card mt-6 overflow-hidden" aria-labelledby="members-heading">
        <PanelHeader title="Recently added members" href="/admin/members" action="Open directory" />
        {recentMembers.length === 0 ? (
          <EmptyState message="The member directory is empty." href="/admin/members/new" action="Add the first member" />
        ) : (
          <div className="grid divide-y divide-a-border-soft md:grid-cols-2 md:divide-x">
            {recentMembers.map((member) => (
              <Link key={member.id} href={`/admin/members/${member.id}`} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[var(--a-bg)]">
                <div className="min-w-0"><p className="truncate font-semibold text-a-text">{personName(member)}</p><p className="mt-0.5 font-mono text-xs text-a-muted">{member.memberId} · added {formatDate(member.createdAt)}</p></div>
                <span className="a-badge a-badge-green shrink-0">{member.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function PanelHeader({ title, href, action }: { title: string; href: string; action: string }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-a-border px-5 py-4">
      <h2 className="a-card-title">{title}</h2>
      <Link href={href} className="shrink-0 text-sm font-medium text-a-brand transition hover:text-a-brand-dark">
        {action} →
      </Link>
    </header>
  );
}

function EmptyState({ message, href, action }: { message: string; href: string; action: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-a-muted">{message}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-medium text-a-brand transition hover:text-a-brand-dark">
        {action} →
      </Link>
    </div>
  );
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="group -mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3.5 transition hover:bg-[var(--a-bg)]">
      <span>
        <span className="block text-sm font-semibold text-a-text">{title}</span>
        <span className="mt-0.5 block text-xs text-a-muted">{description}</span>
      </span>
      <span className="text-a-muted transition group-hover:translate-x-0.5 group-hover:text-a-brand">→</span>
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
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

function personName(person: { firstName: string; middleInitial: string | null; lastName: string }) {
  return `${person.firstName}${person.middleInitial ? ` ${person.middleInitial}.` : ""} ${person.lastName}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" });
}
