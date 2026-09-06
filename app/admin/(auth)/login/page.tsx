import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/login-form";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Login",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [sessionUser, params] = await Promise.all([getSessionUser(), searchParams]);
  if (sessionUser) redirect("/admin");

  const next = params.next?.startsWith("/admin") ? params.next : "/admin";

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(165deg,var(--army-green-dark)_0%,var(--green)_55%,var(--green-dark)_100%)] p-10 text-white lg:flex xl:p-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[rgba(201,162,39,0.18)] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <Image
            src="/logo2.png"
            alt="Pi Gamma Phi Gamma Sigma"
            width={240}
            height={48}
            priority
            className="h-auto w-[min(240px,60%)]"
          />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-light)]">
            Chapter Administration
          </p>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-serif text-4xl font-semibold leading-tight">
            Run the chapter from one console.
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Members, applications, officers, IDs, chapters, and announcements —
            everything the Roxas City Capiz Chapter needs, in one place.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { title: "Member directory", detail: "Keep chapter records current and verified." },
              { title: "Application review", detail: "Approve neophyte applications in a click." },
              { title: "Inbox & announcements", detail: "Answer queries and publish the latest news." },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs text-[var(--gold-light)] ring-1 ring-white/15" aria-hidden="true">
                  ✓
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{item.title}</span>
                  <span className="block text-xs leading-5 text-white/60">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/50">Pi Gamma Phi Gamma Sigma — Roxas City · Capiz</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center bg-[var(--a-bg)] px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Image
              src="/logo2.png"
              alt="Pi Gamma Phi Gamma Sigma"
              width={220}
              height={44}
              priority
              className="h-auto w-[min(220px,70vw)]"
            />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--a-brand)]">
              Chapter Administration
            </p>
          </div>
          <div className="a-card p-8 shadow-[var(--a-shadow-lg)]">
            <h2 className="text-xl font-bold tracking-[-0.01em] text-a-text">
              Sign in to your account
            </h2>
            <p className="mt-1 text-sm text-a-muted">
              Authorized officers only. Sessions expire after 7 days.
            </p>
            <LoginForm next={next} />
          </div>
          <p className="mt-6 text-center text-xs text-a-muted">
            Pi Gamma Phi Gamma Sigma — Roxas City Capiz Chapter
          </p>
        </div>
      </section>
    </main>
  );
}
