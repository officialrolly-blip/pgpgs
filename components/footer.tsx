import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { label: "About Us", href: "/about/history" },
  { label: "Community Services", href: "/community/clean-up-drives" },
  { label: "Our Alumni", href: "/alumni" },
  { label: "Join With Us", href: "/join" },
];

export default function Footer() {
  return (
    <footer className="bg-[var(--black)] text-white">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-14 sm:px-10 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-16 lg:py-16">
        <div>
          <Link href="/" aria-label="PGPGS Roxas City home">
            <Image
              src="/logo2.png"
              alt="Pi Gamma Phi Gamma Sigma"
              width={330}
              height={65}
              sizes="280px"
              className="h-auto w-[min(280px,80vw)]"
            />
          </Link>
          <p className="mt-6 max-w-sm text-sm leading-6 text-white/60">
            A brotherhood rooted in leadership, scholarship, and community
            service in Roxas City, Capiz.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-light)]">
            Explore
          </h2>
          <nav className="mt-5 flex flex-col items-start gap-3" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/70 transition hover:text-[var(--gold-light)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div id="contact">
          <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--gold-light)]">
            Chapter inquiries
          </h2>
          <p className="mt-5 text-sm leading-6 text-white/60">
            Interested in learning more about the chapter or becoming a
            brother? We would be glad to hear from you.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex items-center gap-3 text-sm font-semibold text-[var(--gold-light)] transition hover:text-white"
          >
            Get in touch with us
            <span aria-hidden="true" className="text-lg leading-none">→</span>
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PGPGS Roxas City Capiz Chapter.</p>
          <p>Brotherhood · Service · Excellence</p>
        </div>
      </div>
    </footer>
  );
}