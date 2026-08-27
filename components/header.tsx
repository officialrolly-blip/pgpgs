"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cta, isNavGroup, navigation, type NavItem } from "@/lib/navigation";

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setOpenMenu(null);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-[var(--gold)]/35 bg-[var(--army-green)] text-white shadow-[0_8px_24px_rgba(58,65,24,0.28)]"
    >
      <div className="h-1.5 bg-[linear-gradient(90deg,var(--green)_0%,var(--gold)_50%,var(--green-dark)_100%)]" />
      <div className="mx-auto flex h-[4.75rem] max-w-[1440px] items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0"
          aria-label="Pi Gamma Phi Gamma Sigma home"
        >
          <Image
            src="/logo.png"
            alt="Pi Gamma Phi Gamma Sigma official header"
            width={330}
            height={65}
            priority
            sizes="330px"
            className="h-auto w-[min(330px,58vw)]"
          />
        </Link>

        <nav
          className="hidden items-center gap-1 xl:flex"
          aria-label="Primary"
        >
          {navigation.map((item) => (
            <DesktopItem
              key={item.label}
              item={item}
              pathname={pathname}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              align={item.label === "Community Services" ? "right" : "left"}
            />
          ))}
          <Link
            href={cta.href}
            className="ml-3 inline-flex items-center rounded-full bg-[var(--gold)] px-5 py-2 text-sm font-semibold tracking-wide text-black shadow-[0_8px_18px_rgba(201,162,39,0.28)] transition hover:bg-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {cta.label}
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/25 text-white transition hover:border-[var(--gold)] hover:text-[var(--gold)] xl:hidden"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-3.5 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition ${mobileOpen ? "top-1.5 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-current transition ${mobileOpen ? "opacity-0" : "opacity-100"}`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 bg-current transition ${mobileOpen ? "top-1.5 -rotate-45" : "top-3"}`}
            />
          </span>
        </button>
      </div>

      <div
        id={menuId}
        className={`border-t border-white/15 bg-[var(--army-green)] xl:hidden ${mobileOpen ? "block" : "hidden"}`}
      >
        <nav
          className="mx-auto flex max-h-[calc(100dvh-4.75rem)] max-w-[1440px] flex-col gap-1 overflow-y-auto px-4 py-4 sm:px-6"
          aria-label="Mobile"
        >
          {navigation.map((item) => (
            <MobileItem
              key={item.label}
              item={item}
              pathname={pathname}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          ))}
          <Link
            href={cta.href}
            className="mt-3 inline-flex items-center justify-center rounded-full bg-[var(--gold)] px-5 py-3 text-sm font-semibold tracking-wide text-black"
          >
            {cta.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function DesktopItem({
  item,
  pathname,
  openMenu,
  setOpenMenu,
  align,
}: {
  item: NavItem;
  pathname: string;
  openMenu: string | null;
  setOpenMenu: (label: string | null) => void;
  align: "left" | "right";
}) {
  if (!isNavGroup(item)) {
    const active = pathname === item.href;
    return (
      <Link
        href={item.href}
        className={`rounded-md px-3 py-2 text-[13px] font-medium tracking-[0.04em] transition ${
          active
            ? "text-[var(--gold)]"
            : "text-white hover:text-[var(--gold)]"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  const isOpen = openMenu === item.label;
  const childActive = item.children.some((child) => hasActiveRoute(child, pathname));

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpenMenu(item.label)}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <button
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium tracking-[0.04em] transition ${
          childActive || isOpen
            ? "text-[var(--gold)]"
            : "text-white hover:text-[var(--gold)]"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setOpenMenu(isOpen ? null : item.label)}
      >
        {item.label}
        <Chevron open={isOpen} />
      </button>
      <div
        className={`absolute top-full min-w-[280px] pt-2 ${align === "right" ? "right-0" : "left-0"} ${isOpen ? "visible" : "invisible"}`}
      >
        <ul
          className="overflow-hidden rounded-xl border border-[var(--gold)]/40 bg-[var(--army-green-dark)] py-2 shadow-[0_18px_40px_rgba(58,65,24,0.35)]"
          role="menu"
        >
          {item.children.map((child) => (
            <DesktopChild
              key={child.label}
              item={child}
              pathname={pathname}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileItem({
  item,
  pathname,
  openMenu,
  setOpenMenu,
}: {
  item: NavItem;
  pathname: string;
  openMenu: string | null;
  setOpenMenu: (label: string | null) => void;
}) {
  if (!isNavGroup(item)) {
    return (
      <Link
        href={item.href}
        className={`rounded-lg px-3 py-3 text-sm font-medium ${
          pathname === item.href ? "text-[var(--gold)]" : "text-white"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  const isOpen = openMenu === item.label;

  return (
    <div className="rounded-lg">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-medium text-white"
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : item.label)}
      >
        {item.label}
        <Chevron open={isOpen} />
      </button>
      {isOpen ? (
        <ul className="mb-2 ml-3 space-y-1 border-l border-[var(--gold)]/40 pl-3">
          {item.children.map((child) => (
            <MobileChild
              key={child.label}
              item={child}
              pathname={pathname}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function hasActiveRoute(item: NavItem, pathname: string): boolean {
  return isNavGroup(item)
    ? item.children.some((child) => hasActiveRoute(child, pathname))
    : pathname === item.href;
}

function DesktopChild({
  item,
  pathname,
  openMenu,
  setOpenMenu,
}: {
  item: NavItem;
  pathname: string;
  openMenu: string | null;
  setOpenMenu: (label: string | null) => void;
}) {
  if (!isNavGroup(item)) {
    return (
      <li role="none">
        <Link
          href={item.href}
          role="menuitem"
          className={`block px-4 py-2.5 text-sm transition hover:bg-white/10 hover:text-[var(--gold)] ${
            pathname === item.href ? "bg-white/10 text-[var(--gold)]" : "text-white/90"
          }`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  const isOpen = openMenu === item.label;
  return (
    <li className="relative" role="none" onMouseEnter={() => setOpenMenu(item.label)}>
      <button
        type="button"
        role="menuitem"
        className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-white/10 hover:text-[var(--gold)] ${hasActiveRoute(item, pathname) || isOpen ? "text-[var(--gold)]" : "text-white/90"}`}
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : item.label)}
      >
        {item.label}
        <Chevron open={isOpen} />
      </button>
      {isOpen ? (
        <ul className="absolute left-full top-0 min-w-[230px] rounded-xl border border-[var(--gold)]/40 bg-[var(--army-green-dark)] py-2 shadow-[0_18px_40px_rgba(58,65,24,0.35)]" role="menu">
          {item.children.map((child) => (
            <DesktopChild key={child.label} item={child} pathname={pathname} openMenu={openMenu} setOpenMenu={setOpenMenu} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MobileChild({
  item,
  pathname,
  openMenu,
  setOpenMenu,
}: {
  item: NavItem;
  pathname: string;
  openMenu: string | null;
  setOpenMenu: (label: string | null) => void;
}) {
  if (!isNavGroup(item)) {
    return (
      <li>
        <Link
          href={item.href}
          className={`block rounded-md px-3 py-2 text-sm ${pathname === item.href ? "text-[var(--gold)]" : "text-white/80"}`}
        >
          {item.label}
        </Link>
      </li>
    );
  }

  const isOpen = openMenu === item.label;
  return (
    <li>
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${hasActiveRoute(item, pathname) || isOpen ? "text-[var(--gold)]" : "text-white/80"}`}
        aria-expanded={isOpen}
        onClick={() => setOpenMenu(isOpen ? null : item.label)}
      >
        {item.label}
        <Chevron open={isOpen} />
      </button>
      {isOpen ? (
        <ul className="ml-3 border-l border-[var(--gold)]/30 pl-2" role="menu">
          {item.children.map((child) => (
            <MobileChild key={child.label} item={child} pathname={pathname} openMenu={openMenu} setOpenMenu={setOpenMenu} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 text-[var(--gold)] transition ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M2.25 4.25 6 8l3.75-3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
