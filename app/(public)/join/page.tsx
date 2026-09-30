import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/page-shell";
import JsonLd from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import RegistrationForm from "./registration-form";

export const metadata: Metadata = pageMetadata({
  title: "Join Pi Gamma Phi Gamma Sigma",
  description:
    "How to join the Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter: who can join, the membership process, requirements, benefits, and the neophyte registration form.",
  path: "/join",
});

const process = [
  {
    step: "01",
    title: "Submit your application",
    body: "Complete the neophyte registration form below. Our officers receive your details and your application ID right away.",
  },
  {
    step: "02",
    title: "Orientation",
    body: "Attend your chapter orientation to meet the officers and brothers, and to learn about our principles, values, and expectations.",
  },
  {
    step: "03",
    title: "Baptism & formation",
    body: "Undergo the neophyte formation process. Track every stage from orientation to baptism using the applicant portal.",
  },
  {
    step: "04",
    title: "Welcome as a member",
    body: "Once formation is complete, you are welcomed as a full member of the Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter.",
  },
];

const benefits = [
  "A lifelong brotherhood and sisterhood rooted in unity and moral excellence",
  "Leadership development and mentorship from active officers and alumni",
  "Meaningful community service: clean-up drives, feeding programs, tree planting, and blood letting",
  "An official PGPGS digital membership ID that can be verified online",
];

export default function JoinPage() {
  return (
    <PageShell title="Join Pi Gamma Phi Gamma Sigma">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Join", path: "/join" },
        ])}
      />
      <div className="max-w-3xl space-y-12 text-black/70">
        <p className="text-base leading-7 text-justify">
          Membership in the Pi Gamma Phi Gamma Sigma Roxas City Capiz Chapter
          begins with a simple application. This page explains who can join, how
          the process works, and what the brotherhood offers — then you can open
          the registration form to get started.
        </p>

        <div className="flex flex-wrap items-center gap-3 border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--green-dark)]">
          <span>Already registered?</span>
          <Link
            href="/join/status"
            className="font-bold text-[var(--green)] underline decoration-[var(--gold)] underline-offset-4 hover:text-[var(--green-dark)]"
          >
            Check your application status
          </Link>
        </div>

        <section aria-labelledby="who-heading">
          <h2
            id="who-heading"
            className="font-serif text-3xl font-semibold text-[var(--green-dark)]"
          >
            Who can join
          </h2>
          <p className="mt-4 text-base leading-7 text-justify">
            Membership is open to students, young professionals, and community
            members of good moral standing who share our commitment to service,
            leadership, and integrity. Applicants provide basic personal,
            address, guardian, and education information during registration.
          </p>
        </section>

        <section aria-labelledby="process-heading">
          <h2
            id="process-heading"
            className="font-serif text-3xl font-semibold text-[var(--green-dark)]"
          >
            The membership process
          </h2>
          <ol className="mt-6 space-y-6">
            {process.map((item) => (
              <li key={item.step} className="border-l-4 border-[var(--gold)] bg-[var(--green-soft)]/30 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">
                  {item.step}
                </p>
                <h3 className="mt-1 font-serif text-2xl font-semibold text-[var(--green-dark)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-black/65">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="benefits-heading">
          <h2
            id="benefits-heading"
            className="font-serif text-3xl font-semibold text-[var(--green-dark)]"
          >
            What membership offers
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7">
            {benefits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="form-heading" id="register">
          <h2
            id="form-heading"
            className="font-serif text-3xl font-semibold text-[var(--green-dark)]"
          >
            Neophyte registration form
          </h2>
          <p className="mt-4 text-base leading-7 text-justify">
            Complete the form carefully so our officers can assist you promptly.
            After you submit, download and keep the generated registration file
            and present it to the chapter officers.
          </p>
          <div className="mt-8">
            <RegistrationForm />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
