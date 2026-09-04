import PageShell from "@/components/page-shell";

// Shown automatically by Next.js (App Router Suspense boundary) while the
// async chapter officers page is fetching its data from the database.
export default function ChapterOfficersLoading() {
  return (
    <PageShell title="PGPGS Roxas City Capiz Chapter Officers">
      <p className="sr-only" role="status">
        Loading chapter officers…
      </p>
      <div className="mb-10 max-w-2xl">
        <div className="h-4 w-full animate-pulse rounded-sm bg-black/10" />
        <div className="mt-3 h-4 w-11/12 animate-pulse rounded-sm bg-black/10" />
        <div className="mt-3 h-4 w-3/4 animate-pulse rounded-sm bg-black/10" />
      </div>

      <div
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden border border-black/10 bg-white shadow-[0_12px_28px_rgba(15,61,38,0.08)]"
          >
            <div className="relative aspect-[4/5] bg-[var(--green-soft)]">
              <div className="h-full w-full animate-pulse bg-gradient-to-br from-[var(--green-soft)] to-black/10" />
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(transparent,rgba(15,61,38,0.72))] px-5 pb-5 pt-16">
                <div className="h-3 w-28 animate-pulse rounded-sm bg-white/60" />
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="h-6 w-3/4 animate-pulse rounded-sm bg-black/10" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded-sm bg-black/10" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}