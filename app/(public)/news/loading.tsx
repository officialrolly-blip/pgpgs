import PageShell from "@/components/page-shell";

// Shown automatically by Next.js (App Router Suspense boundary) while the
// async news page is fetching published posts from the database.
export default function NewsLoading() {
  return (
    <PageShell title="News &amp; Events">
      <p className="sr-only" role="status">
        Loading news and events…
      </p>
      <div className="mb-10 max-w-2xl">
        <div className="h-4 w-3/4 animate-pulse rounded bg-black/10" />
        <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-black/10" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="overflow-hidden border border-black/10 bg-white">
            <div className="aspect-[16/9] animate-pulse bg-[linear-gradient(110deg,#eef2ee_30%,#f6f8f6_50%,#eef2ee_70%)] bg-[length:200%_100%]" />
            <div className="p-6">
              <div className="h-2.5 w-24 animate-pulse rounded bg-black/10" />
              <div className="mt-4 h-5 w-4/5 animate-pulse rounded bg-black/15" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-black/10" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-black/10" />
              <div className="mt-6 h-3.5 w-28 animate-pulse rounded bg-[var(--green)]/20" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}