"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth-actions";

const navLinks = [
  { label: "Overview", href: "/admin", icon: "grid" },
  { label: "Members", href: "/admin/members", icon: "users" },
  { label: "Applications", href: "/admin/registrations", icon: "inbox" },
  { label: "Neophyte status", href: "/admin/neophytes", icon: "spark" },
  { label: "Officers", href: "/admin/officials", icon: "badge" },
  { label: "PGPGS ID", href: "/admin/ids", icon: "id" },
  { label: "Chapters", href: "/admin/chapters", icon: "pin" },
  { label: "News & Events", href: "/admin/news", icon: "news" },
  { label: "Settings", href: "/admin/settings", icon: "gear" },
];

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-a-brand-soft text-sm font-bold text-a-brand">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    inbox: "M4 4h16v13H4zM4 13h4l2 3h4l2-3h4M8 8h8",
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
  children,
}: {
  user: ShellUser;
  pendingCount: number;
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

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      <p className="px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-a-muted">
        Menu
      </p>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => {
            setDrawerOpen(false);
            setProfileOpen(false);
          }}
          className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm transition ${
            isActive(link.href)
              ? "bg-a-brand-soft font-semibold text-a-brand"
              : "font-medium text-a-secondary hover:bg-[var(--a-bg)] hover:text-a-text"
          }`}
          aria-current={isActive(link.href) ? "page" : undefined}
        >
          <NavIcon name={link.icon} />
          <span>{link.label}</span>
          {link.href === "/admin/registrations" && pendingCount > 0 ? (
            <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-a-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
              {pendingCount}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-a-border p-4">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={user.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-a-text">{user.name}</p>
          <p className="truncate text-xs text-a-muted">{user.email}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="a-btn a-btn-secondary a-btn-sm w-full">
          Sign out
        </button>
      </form>
    </div>
  );

  const logo = (
    <div className="flex items-center gap-2.5 border-b border-a-border px-6 py-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-a-brand text-sm font-bold text-white">
        PG
      </span>
      <span>
        <span className="block text-base font-bold leading-5 tracking-tight text-a-text">
          PGPGS <span className="text-a-gold">/</span> Admin
        </span>
        <span className="block text-[11px] uppercase tracking-[0.14em] text-a-muted">
          Roxas City · Capiz
        </span>
      </span>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[290px] shrink-0 flex-col border-r border-a-border bg-a-card lg:flex">
        {logo}
        {nav}
        {account}
      </aside>

      {/* Content column: header + page */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-a-border bg-white/95 px-4 backdrop-blur sm:px-6">
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
              className="w-full rounded-lg border border-a-border bg-[var(--a-bg)] py-2 pl-9 pr-3 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:bg-white focus:ring-2 focus:ring-a-brand/15"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/registrations"
              title="Pending reviews"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-a-border text-a-secondary transition hover:bg-[var(--a-bg)] hover:text-a-text"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
              {pendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-a-danger px-1 py-0.5 text-[10px] font-bold leading-none text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </Link>

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
                    className="a-card absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl p-1.5 shadow-[var(--a-shadow-md)]"
                  >
                    <div className="border-b border-a-border-soft px-3 py-2.5">
                      <p className="truncate text-sm font-semibold text-a-text">{user.name}</p>
                      <p className="truncate text-xs text-a-muted">{user.email}</p>
                    </div>
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-a-secondary transition hover:bg-[var(--a-bg)] hover:text-a-text"
                    >
                      Account settings
                    </Link>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-a-danger transition hover:bg-a-danger-soft"
                      >
                        Sign out
                      </button>
                    </form>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-7 lg:px-8">{children}</main>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[290px] flex-col bg-a-card shadow-2xl transition-transform duration-200 lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between pr-3">
          <div className="min-w-0 flex-1">{logo}</div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-a-border text-a-secondary"
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
