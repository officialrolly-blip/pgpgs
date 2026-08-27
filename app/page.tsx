import HeroSlider from "@/components/hero-slider";
import OfficerMarquee, { type HomepageOfficer } from "@/components/officer-marquee";
import Image from "next/image";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pgpmembers } from "@/db/schema";

const newsAndEvents = [
  {
    date: "UPCOMING",
    category: "Community Service",
    title: "Serving Roxas City, together",
    description:
      "See how our brothers turn fellowship into action through programs that support the community.",
    href: "/community/clean-up-drives",
    action: "Explore our service",
  },
  {
    date: "FEATURED",
    category: "Chapter Story",
    title: "A tradition built to last",
    description:
      "Discover the people and milestones that shaped the Pi Gamma Phi Gamma Sigma chapter.",
    href: "/about/history",
    action: "Read our history",
  },
  {
    date: "FOR MEMBERS",
    category: "Fellowship",
    title: "The bond continues beyond school",
    description:
      "Reconnect with fellow brothers and keep the spirit of service moving through every generation.",
    href: "/alumni",
    action: "Visit the alumni page",
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const officers: HomepageOfficer[] = await db
    .select({
      id: pgpmembers.id,
      firstName: pgpmembers.firstName,
      middleInitial: pgpmembers.middleInitial,
      lastName: pgpmembers.lastName,
      position: pgpmembers.officerPosition,
      photoUrl: pgpmembers.photoUrl,
    })
    .from(pgpmembers)
    .where(eq(pgpmembers.status, "PGP-GS Roxas City Chapter Officer"))
    .orderBy(asc(pgpmembers.createdAt));

  return (
    <main className="flex flex-1 flex-col bg-background">
      <HeroSlider />
      <section className="relative overflow-hidden bg-[var(--background)]" aria-labelledby="join-heading">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
              Find your place in the circle
            </p>
            <h2 id="join-heading" className="mt-4 font-serif text-5xl font-semibold leading-[0.98] text-[var(--green-dark)] sm:text-6xl">
              Join with us.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-black/65 sm:text-lg">
              Step into a brotherhood built on character, friendship, and
              service. Grow with people who believe that leadership is best
              measured by the good we leave behind.
            </p>
            <Link
              href="/join"
              className="mt-8 inline-flex items-center gap-3 bg-[var(--green)] px-6 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_8px_18px_rgba(27,92,56,0.22)] transition hover:bg-[var(--green-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--green)]"
            >
              Become a member
              <span aria-hidden="true" className="text-lg leading-none">→</span>
            </Link>
          </div>

          <div className="relative flex min-h-[290px] items-center justify-center overflow-hidden bg-[var(--green-soft)] px-10 py-10 sm:min-h-[380px] lg:min-h-[440px]">
            <div className="absolute inset-5 border border-[var(--gold)]/35" />
            <Image
              src="/images.jpg"
              alt="Pi Gamma Phi Gamma Sigma fraternity emblem"
              width={650}
              height={650}
              sizes="(max-width: 1024px) 80vw, 42vw"
              className="relative z-10 max-h-[270px] w-auto object-contain sm:max-h-[350px] lg:max-h-[400px]"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-[var(--army-green)] px-6 py-20 text-white sm:px-10 sm:py-24 lg:px-16" aria-labelledby="officers-heading">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 border-b border-white/20 pb-8 sm:flex-row sm:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-light)]">
                Leadership in motion
              </p>
              <h2 id="officers-heading" className="mt-3 font-serif text-4xl font-semibold leading-none sm:text-6xl">
                Meet Our Newly Elected Officers
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter officers serving with purpose, fellowship, and care.
              </p>
            </div>
            <Link href="/officials/roxas-city-chapter-officers" className="inline-flex shrink-0 items-center gap-3 text-sm font-semibold text-[var(--gold-light)] transition hover:text-white">
              View all officers
              <span aria-hidden="true" className="text-lg leading-none">→</span>
            </Link>
          </div>
          <div className="mt-10">
            <OfficerMarquee officers={officers} />
          </div>
        </div>
      </section>

      <section className="bg-[var(--green-dark)] px-6 py-20 text-white sm:px-10 sm:py-24 lg:px-16" aria-labelledby="news-heading">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 border-b border-white/20 pb-8 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-light)]">
                Stay connected
              </p>
              <h2 id="news-heading" className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
                News &amp; events.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/65 sm:text-right">
              Keep up with the stories, service, and fellowship shaping our
              chapter.
            </p>
          </div>

          <div className="grid gap-px bg-white/20 sm:grid-cols-3">
            {newsAndEvents.map((item) => (
              <article key={item.title} className="flex min-h-[310px] flex-col bg-[var(--green-dark)] p-7 sm:p-8">
                <div className="flex items-center justify-between gap-4 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="text-[var(--gold-light)]">{item.category}</span>
                  <span className="text-white/45">{item.date}</span>
                </div>
                <h3 className="mt-12 max-w-xs font-serif text-3xl font-semibold leading-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
                  {item.description}
                </p>
                <Link
                  href={item.href}
                  className="mt-auto inline-flex items-center gap-3 pt-8 text-sm font-semibold text-[var(--gold-light)] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--gold-light)]"
                >
                  {item.action}
                  <span aria-hidden="true" className="text-lg leading-none">→</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--green-soft)]" aria-labelledby="president-heading">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-16">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold)]">
              From the chapter president
            </p>
            <h2 id="president-heading" className="mt-4 font-serif text-5xl font-semibold leading-[0.98] text-[var(--green-dark)] sm:text-6xl">
              A message of purpose.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-black/65 sm:text-lg">
              Meet the newly elected Chapter President of Pi Gamma Phi Gamma
              Sigma Roxas City Capiz Chapter and read his message for our
              brothers, alumni, and community.
            </p>
            <Link
              href="/message-of-chapter-president"
              className="mt-8 inline-flex items-center gap-3 bg-[var(--gold)] px-6 py-3.5 text-sm font-semibold tracking-wide text-black shadow-[0_8px_18px_rgba(201,162,39,0.22)] transition hover:bg-[var(--gold-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            >
              Read the message
              <span aria-hidden="true" className="text-lg leading-none">→</span>
            </Link>
          </div>

          <div className="relative min-h-[360px] overflow-hidden bg-[var(--army-green)] sm:min-h-[460px]">
            <Image
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=1200&q=85"
              alt="Temporary portrait placeholder for the newly elected chapter president"
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(15,61,38,0.55)_100%)]" />
            <p className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              Temporary portrait
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[var(--gold)] px-6 py-16 text-black sm:px-10 sm:py-20 lg:px-16" aria-labelledby="contact-heading">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Start a conversation
            </p>
            <h2 id="contact-heading" className="mt-3 font-serif text-5xl font-semibold leading-none text-[var(--green-dark)] sm:text-6xl">
              Get in touch with us.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-black/70 sm:text-lg">
              Have questions about the chapter, our programs, or membership?
              Connect with the Pi Gamma Phi Gamma Sigma Roxas City Capiz
              Chapter.
            </p>
          </div>
          <Link
            href="/join"
            className="inline-flex shrink-0 items-center justify-center gap-3 border-2 border-[var(--green-dark)] px-6 py-3.5 text-sm font-semibold tracking-wide text-[var(--green-dark)] transition hover:bg-[var(--green-dark)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--green-dark)]"
          >
            Contact the chapter
            <span aria-hidden="true" className="text-lg leading-none">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
