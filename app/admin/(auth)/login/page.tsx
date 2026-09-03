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
    <main className="flex flex-1 items-center justify-center bg-[linear-gradient(160deg,var(--army-green-dark)_0%,var(--army-green)_55%,var(--green-dark)_100%)] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo2.png"
            alt="Pi Gamma Phi Gamma Sigma"
            width={264}
            height={52}
            priority
            className="h-auto w-[min(264px,70vw)]"
          />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--gold-light)]">
            Chapter Administration
          </p>
        </div>
        <div className="a-card p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <h1 className="text-xl font-bold tracking-[-0.01em] text-a-text">
            Sign in to your account
          </h1>
          <p className="mt-1 text-sm text-a-muted">
            Authorized officers only. Sessions expire after 7 days.
          </p>
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-white/60">
          Pi Gamma Phi Gamma Sigma — Roxas City Capiz Chapter
        </p>
      </div>
    </main>
  );
}
