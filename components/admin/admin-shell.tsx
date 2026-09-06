"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import LogoutButton from "@/components/admin/logout-button";
import { logoutAction } from "@/lib/actions/auth-actions";

type NavLink = { label: string; href: string; icon: string; badge?: "pending" | "unread" };

const navSections: { caption: string; links: NavLink[] }[] = [
  {
    caption: "Overview",
    links: [{ label: "Overview", href: "/admin", icon: "grid" }],
  },
  {
    caption: "Community",
    links: [
      { label: "Members", href: "/admin/members", icon: "users" },
      { label: "Applications", href: "/admin/registrations", icon: "inbox", badge: "pending" },
      { label: "Inbox", href: "/admin/inbox", icon: "mail", badge: "unread" },
      { label: "Neophyte status", href: "/admin/neophytes", icon: "spark" },
    ],
  },
  {
    caption: "Organization",
    links: [
      { label: "Officers", href: "/admin/officials", icon: "badge" },
      { label: "Chapters", href: "/admin/chapters", icon: "pin" },
    ],
  },
  {
    caption: "Content & tools",
    links: [
      { label: "PGPGS ID", href: "/admin/ids", icon: "id" },
      { label: "News & Events", href: "/admin/news", icon: "news" },
    ],
  },
  {
    caption: "System",
    links: [{ label: "Settings", href: "/admin/settings", icon: "gear" }],
  },
];

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-a-gold text-sm font-bold text-[#241b03] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    inbox: "M4 4h16v13H4zM4 13h4l2 3h4l2-3h4M8 8h8",
    mail: "M3 5h18v14H3zM3 7l9 6 9-6",
    spark: "m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z",
    badge: "M12 3 4 6v5c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6zM9 12l2 2 4-4",
    pin: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
    news: "M4 5h16v14H4zM4 9h16M8 13h8M8 17h5",
    id: "M3 5h18v14H3zM3 10h18M7 14h5",
    gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.5 1.5-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.1v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.5-1.5.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H7v-2.1h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.1v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.5 1.5-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2v2.1h-.2a1.7 1.7 0 0 0-1.5 1Z",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

type ShellUser = { name: string; email: string; role: string };

export default function AdminShell({
  user,
  pendingCount,
  unreadInboxCount,
  children,
}: {
  user: ShellUser;
  pendingCount: number;
  unreadInboxCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const allLinks = navSections.flatMap((section) => section.links);
  const pageTitle =
    allLinks.find((link) => isActive(link.href))?.label ?? "Dashboard";
  const badgeFor = (link: NavLink) =>
    link.badge === "pending" ? pendingCount : link.badge === "unread" ? unreadInboxCount : 0;

  const nav = (
    <nav aria-label="Admin" className="a-scroll flex-1 overflow-y-auto px-3 pb-4">
      {navSections.map((section) => (
        <div key={section.caption}>
          <p className="a-sidebar-caption">{section.caption}</p>
          {section.links.map((link) => {
            const active = isActive(link.href);
            const badge = badgeFor(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  setDrawerOpen(false);
                  setProfileOpen(false);
                }}
                className={`a-sidebar-link ${active ? "a-sidebar-link-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
                {badge > 0 ? (
                  <span className="a-sidebar-badge">{badge > 99 ? "99+" : badge}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-[var(--a-sidebar-border)] p-3">
      <div className="flex items-center gap-3 rounded-xl bg-[var(--a-sidebar-raised)] px-3 py-2.5">
        <Avatar name={user.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-xs capitalize text-white/50">{user.role}</p>
        </div>
        <form action={logoutAction}>
          <LogoutButton className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span className="sr-only">Sign out</span>
          </LogoutButton>
        </form>
      </div>
    </div>
  );

  const logo = (
    <div className="flex items-center gap-3 border-b border-[var(--a-sidebar-border)] px-5 py-5">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/15">
        PG
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0f3d26] bg-a-gold" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-white">
          PGPGS <span className="text-a-gold">Admin</span>
        </p>
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
          Roxas City · Capiz
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="a-sidebar sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-r border-[var(--a-sidebar-border)] lg:flex">
        {logo}
        {nav}
        {account}
      </aside>

      {/* Content column: header + page */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-a-border bg-white/95 px-4 backdrop-blur sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-a-border text-a-secondary transition hover:bg-[var(--a-bg)] lg:hidden"
            aria-label="Open admin menu"
            aria-expanded={drawerOpen}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <form action="/admin/members" method="get" className="relative hidden w-full max-w-xs sm:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-a-muted">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              name="q"
              placeholder="Search members…"
              className="w-full rounded-lg border border-a-border bg-[var(--a-bg)] py-2 pl-9 pr-3 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:bg-white focus:shadow-[var(--a-ring)]"
            />
          </form>

          {/* Breadcrumb */}
          <p aria-label="Breadcrumb" className="ml-1 hidden min-w-0 items-center gap-2 text-sm md:flex">
            <span className="font-medium text-a-muted">Admin</span>
            <span className="text-a-muted/50" aria-hidden="true">/</span>
            <span className="truncate font-semibold text-a-text">{pageTitle}</span>
          </p>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/admin/registrations"
              title="Pending applications"
              aria-label={`Pending applications${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-a-secondary transition hover:bg-[var(--a-bg)] hover:text-a-text"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {pendingCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-a-danger px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/admin/inbox"
              title="Inbox — unread messages"
              aria-label={`Inbox, ${unreadInboxCount} unread messages`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-a-secondary transition hover:bg-[var(--a-bg)] hover:text-a-text"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h18v14H3zM3 7l9 6 9-6" />
              </svg>
              {unreadInboxCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-a-brand px-1 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {unreadInboxCount > 99 ? "99+" : unreadInboxCount}
                </span>
              ) : null}
            </Link>

            <span className="hidden h-6 w-px bg-a-border sm:block" aria-hidden="true" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2.5 rounded-lg border border-transparent p-1 pr-2 transition hover:bg-[var(--a-bg)]"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <Avatar name={user.name} />
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-semibold leading-4 text-a-text">{user.name}</span>
                  <span className="block text-xs capitalize text-a-muted">{user.role}</span>
                </span>
                <svg viewBox="0 0 24 24" className="hidden h-4 w-4 text-a-muted md:block" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {profileOpen ? (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} aria-hidden="true" />
                  <div
                    role="menu"
                    className="a-card absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl p-1.5 shadow-[var(--a-shadow-lg)]"
                  >
                    <div className="border-b border-a-border-soft px-3 py-3">
                      <p className="truncate text-sm font-semibold text-a-text">{user.name}</p>
                      <p className="truncate text-xs text-a-muted">{user.email}</p>
                      <span className="a-badge a-badge-green a-badge-plain mt-2 capitalize">{user.role}</span>
                    </div>
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-a-secondary transition hover:bg-[var(--a-bg)] hover:text-a-text"
                    >
                      Account settings
                    </Link>
                    <form action={logoutAction}>
                      <LogoutButton
                        role="menuitem"
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-a-danger transition hover:bg-a-danger-soft disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile drawer */}
      <aside
        className={`a-sidebar fixed inset-y-0 left-0 z-50 flex w-[300px] max-w-[85vw] flex-col shadow-2xl transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between pr-3">
          <div className="min-w-0 flex-1">{logo}</div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close admin menu"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {nav}
        {account}
      </aside>
    </>
  );
}
