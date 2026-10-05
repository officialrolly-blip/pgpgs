"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** How long a slide is held before the next one takes over. */
const AUTOPLAY_MS = 7000;
/** Minimum horizontal travel (px) before a pointer gesture counts as a swipe. */
const SWIPE_THRESHOLD_PX = 48;

type HeroLink = { label: string; href: string };

type HeroSlide = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  primary: HeroLink;
  secondary: HeroLink;
};

const slides: HeroSlide[] = [
  {
    image:
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=2000&q=85",
    eyebrow: "Brotherhood · Service · Excellence",
    title: "Rooted in brotherhood.",
    description:
      "A lasting fellowship of leaders committed to making a meaningful difference in Roxas City and beyond.",
    primary: { label: "Explore our history", href: "/about/history" },
    secondary: { label: "Become a member", href: "/join" },
  },
  {
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=2000&q=85",
    eyebrow: "Community Service",
    title: "Hands ready to serve.",
    description:
      "From outreach programs to neighborhood initiatives, we turn shared purpose into visible action.",
    primary: { label: "See our service", href: "/community/clean-up-drives" },
    secondary: { label: "Our programs", href: "/community/feeding-program" },
  },
  {
    image:
      "https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=2000&q=85",
    eyebrow: "A Chapter with History",
    title: "More than five decades strong.",
    description:
      "Since 1973, the Roxas City Capiz Chapter has carried its values forward through every generation.",
    primary: { label: "Read our history", href: "/about/history" },
    secondary: { label: "Meet our founders", href: "/about/founding-fathers" },
  },
  {
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2000&q=85",
    eyebrow: "A Fellowship for Life",
    title: "Many paths. One bond.",
    description:
      "We build friendships that last, sharpen one another through challenge, and celebrate every milestone together.",
    primary: { label: "Visit our alumni", href: "/alumni" },
    secondary: { label: "Meet our members", href: "/about/our-members" },
  },
  {
    image:
      "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=2000&q=85",
    eyebrow: "PGPGS Roxas City",
    title: "Your place to belong.",
    description:
      "Discover a community shaped by character, service, and the courage to lead with purpose.",
    primary: { label: "Become a member", href: "/join" },
    secondary: { label: "Chapters across Capiz", href: "/about/pgpgs-across-capiz" },
  },
];

const SLIDE_COUNT = slides.length;

function normalizeIndex(index: number) {
  return ((index % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;
}

/**
 * Where a plate sits relative to the active one, so the pair slides together
 * in the direction of travel.
 *
 * The offset is cyclic, not linear: the plate immediately behind the active one
 * (in the direction of travel) sits just off-screen, and every other plate sits
 * on the far side. Comparing raw indices instead would misplace the outgoing
 * plate on the last -> first wrap.
 */
function plateState(
  index: number,
  active: number,
  direction: 1 | -1,
): "active" | "before" | "after" {
  if (index === active) return "active";
  // Distance from the active plate going forward around the loop.
  const rel = normalizeIndex(index - active);
  // "before" renders at -4% (left), "after" at +4% (right).
  return direction === 1
    ? rel === SLIDE_COUNT - 1
      ? "before"
      : "after"
    : rel === 1
      ? "after"
      : "before";
}
function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[1.05rem] w-[1.05rem]"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="5" width="3.4" height="14" rx="1.2" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1.2" />
    </svg>
  );
}

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 5.6c0-.9 1-1.5 1.8-1L18 10.5c.7.5.7 1.5 0 2L9.8 19.4c-.8.5-1.8-.1-1.8-1V5.6Z" />
    </svg>
  );
}

export default function HeroSlider() {
  const [state, setState] = useState({
    index: 0,
    direction: 1 as 1 | -1,
    token: 0,
  });
  const [userPaused, setUserPaused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  // Mirrors state.index so the window-level swipe handler always reads the
  // current slide without re-subscribing on every change.
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = state.index;
  }, [state.index]);

  // Honour the OS "reduce motion" preference: no autoplay, no image drift.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Never advance while the tab sits in the background.
  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // Autoplay yields to real interaction: an in-flight drag, keyboard focus, a
  // hidden tab, the user's own pause, or a reduced-motion preference. Merely
  // hovering does not stop it, so the hero still rotates on desktop.
  const autoplayRunning =
    !reduceMotion && !userPaused && !dragging && !focusWithin && pageVisible;

  // Autoplay is a self-resetting timeout, so every manual interaction (dots,
  // arrows, keys, swipe) gives the viewer a full dwell time on the new slide.
  useEffect(() => {
    if (!autoplayRunning) return;
    const timer = window.setTimeout(() => {
      setState((prev) => ({
        index: (prev.index + 1) % SLIDE_COUNT,
        direction: 1,
        token: prev.token + 1,
      }));
    }, AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplayRunning, state.index, state.token]);

  function goTo(index: number, direction: 1 | -1) {
    const next = normalizeIndex(index);
    setState((prev) => ({
      index: next,
      // Keep the current travel direction when the target is already active.
      direction: next === prev.index ? prev.direction : direction,
      token: prev.token + 1,
    }));
    setAnnouncement(`Slide ${next + 1} of ${SLIDE_COUNT}: ${slides[next].title}`);
  }

  function step(delta: 1 | -1) {
    goTo(indexRef.current + delta, delta);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  }

  // Swipe handling lives on `window` rather than the section: the gesture must
  // survive the pointer leaving the hero, and `setPointerCapture` would retarget
  // the trailing `click` away from the dots, arrows and CTA links.
  useEffect(() => {
    const finish = (event: PointerEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      setDragging(false);
      if (!start) return;
      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;
      // Horizontal intent only, and far enough that taps on links survive.
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      step(deltaX < 0 ? 1 : -1);
    };
    const cancel = () => {
      swipeStart.current = null;
      setDragging(false);
    };
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
    // `step` reads the live index from a ref, so this never needs re-binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = slides[state.index];
  const progressKey = `${state.index}-${state.token}`;

  return (
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="PGPGS highlights"
      className="relative isolate flex min-h-[calc(100svh-5.75rem)] flex-col overflow-hidden bg-[var(--green-dark)] text-white sm:min-h-[700px]"
      style={{ touchAction: "pan-y" }}
      onKeyDown={handleKeyDown}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setFocusWithin(false);
        }
      }}
      onPointerDown={handlePointerDown}
    >
      {/* ---------------------------------------------------------- */}
      {/* Background plates                                         */}
      {/* ---------------------------------------------------------- */}
      <div className="absolute inset-0" aria-hidden="true">
        {slides.map((slide, index) => (
          <div
            key={slide.image}
            data-state={plateState(index, state.index, state.direction)}
            className="hero-slide absolute inset-0"
          >
            <Image
              src={slide.image}
              alt=""
              fill
              draggable={false}
              loading={index < 2 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              sizes="100vw"
              className="hero-slide-plate object-cover"
            />
            {/* Directional scrims keep the copy column legible on every plate. */}
            <div className="absolute inset-0 bg-[rgba(9,34,21,0.6)] lg:hidden" />
            <div className="absolute inset-0 hidden lg:block lg:bg-[linear-gradient(100deg,rgba(10,40,25,0.94)_0%,rgba(10,40,25,0.84)_30%,rgba(10,40,25,0.5)_58%,rgba(10,40,25,0.2)_100%)]" />
            {/* Grounds the headline and CTAs against the lower third. */}
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,28,18,0.9)_0%,rgba(7,28,18,0.45)_28%,transparent_56%)]" />
            {/* Blends the plate into the army-green header above. */}
            <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(to_bottom,rgba(58,65,24,0.5),transparent)]" />
            {/* Soft vignette for depth. */}
            <div className="absolute inset-0 bg-[radial-gradient(130%_110%_at_50%_45%,transparent_45%,rgba(6,26,16,0.5)_100%)]" />
          </div>
        ))}
      </div>

      {/* Dissolves the plate into the cream section that follows. Painted above
          the photography but below the copy and the control bar. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-8 bg-[linear-gradient(to_top,var(--background),transparent)]"
      />

      {/* ---------------------------------------------------------- */}
      {/* Copy — eyebrow → headline → support → CTAs                 */}
      {/* ---------------------------------------------------------- */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-end px-6 pb-10 pt-28 sm:px-10 sm:pb-12 sm:pt-32 lg:px-16 lg:pb-14">
        {/* Remounting on change replays the staged reveal for each slide. */}
        <div key={state.index} className="max-w-2xl lg:max-w-3xl">
          <div className="hero-reveal hero-reveal-1 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-[var(--gold)] sm:w-10"
            />
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[var(--gold-light)] [text-shadow:0_1px_12px_rgba(0,0,0,0.45)] sm:text-xs sm:tracking-[0.32em]">
              {active.eyebrow}
            </p>
          </div>

          <h1 className="hero-reveal hero-reveal-2 mt-5 max-w-[19ch] font-serif text-[clamp(2.6rem,6.4vw,5rem)] font-semibold leading-[0.95] tracking-[-0.01em] text-balance [text-shadow:0_4px_38px_rgba(0,0,0,0.45)]">
            {active.title}
          </h1>

          <p className="hero-reveal hero-reveal-3 mt-6 max-w-xl text-[0.98rem] leading-[1.7] text-white/80 [text-shadow:0_1px_16px_rgba(0,0,0,0.35)] sm:text-lg">
            {active.description}
          </p>

          <div className="hero-reveal hero-reveal-4 mt-8 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center sm:gap-4">
            <Link
              href={active.primary.href}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-[var(--gold)] px-7 py-3.5 text-sm font-semibold tracking-wide text-[#221a02] shadow-[0_12px_30px_-12px_rgba(201,162,39,0.85)] transition duration-300 hover:bg-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)] active:translate-y-px"
            >
              {active.primary.label}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
            <Link
              href={active.secondary.href}
              className="group inline-flex items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold tracking-wide text-white transition duration-300 hover:border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/90"
            >
              {active.secondary.label}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Controls — indicators, counter, autoplay, prev/next         */}
      {/* ---------------------------------------------------------- */}
      <div className="relative z-10 border-t border-white/10 bg-[linear-gradient(to_top,rgba(6,26,16,0.6),rgba(6,26,16,0.15))] pb-7 sm:pb-8">
        {/* Extra right padding keeps the controls clear of the chat launcher. */}
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-6 pt-4 sm:px-10 sm:pt-5 lg:px-16 lg:pr-28 xl:pr-32">
          <div
            role="group"
            aria-label="Choose a slide"
            className="flex items-center gap-0.5"
          >
            {slides.map((slide, index) => {
              const isActive = index === state.index;
              return (
                <button
                  key={slide.image}
                  type="button"
                  onClick={() => goTo(index, index > state.index ? 1 : -1)}
                  aria-current={isActive}
                  aria-label={`Show slide ${index + 1} of ${SLIDE_COUNT}: ${slide.title}`}
                  className="group flex h-8 w-9 items-center justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)]"
                >
                  {isActive ? (
                    <span className="relative block h-[3px] w-9 overflow-hidden rounded-full bg-white/25">
                      <span
                        key={progressKey}
                        data-paused={!autoplayRunning}
                        style={
                          {
                            "--hero-autoplay": `${AUTOPLAY_MS}ms`,
                          } as React.CSSProperties
                        }
                        className="hero-progress absolute inset-0 rounded-full bg-[var(--gold)]"
                      />
                    </span>
                  ) : (
                    <span className="block h-[3px] w-4 rounded-full bg-white/40 transition-colors duration-300 group-hover:bg-white/75" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <p className="mr-1 hidden font-mono text-[0.7rem] tracking-[0.18em] text-white/55 tabular-nums sm:block">
              <span className="text-[var(--gold-light)]">
                {String(state.index + 1).padStart(2, "0")}
              </span>
              <span aria-hidden="true" className="mx-1.5 text-white/30">
                /
              </span>
              {String(SLIDE_COUNT).padStart(2, "0")}
            </p>

            {reduceMotion ? null : (
              <button
                type="button"
                onClick={() => setUserPaused((paused) => !paused)}
                aria-pressed={userPaused}
                aria-label={
                  userPaused ? "Resume slideshow" : "Pause slideshow"
                }
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition duration-300 hover:border-[var(--gold-light)] hover:text-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)]"
              >
                {userPaused ? <PlayGlyph /> : <PauseGlyph />}
              </button>
            )}

            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/85 transition duration-300 hover:border-[var(--gold-light)] hover:bg-white/10 hover:text-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)] active:scale-95"
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next slide"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-white/85 transition duration-300 hover:border-[var(--gold-light)] hover:bg-white/10 hover:text-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold-light)] active:scale-95"
              >
                <Chevron direction="right" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Announces only user-initiated slide changes. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
