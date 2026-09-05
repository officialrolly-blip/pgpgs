"use client";

import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;

export default function MemberDirectorySearch({
  initialQuery,
  initialStatus,
  statuses,
  displayedCount,
  totalCount,
}: {
  initialQuery: string;
  initialStatus: string;
  statuses: readonly string[];
  displayedCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const submittedFilters = useRef(`${initialQuery}\u0000${initialStatus}`);

  const filterKey = `${query.trim()}\u0000${status}`;
  const isSearching = isPending || filterKey !== submittedFilters.current;

  useEffect(() => {
    setQuery(initialQuery);
    setStatus(initialStatus);
    submittedFilters.current = `${initialQuery}\u0000${initialStatus}`;
  }, [initialQuery, initialStatus]);

  useEffect(() => {
    if (filterKey === submittedFilters.current) return;

    const timer = window.setTimeout(() => {
      updateDirectory(query, status);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [filterKey, query, status]);

  function updateDirectory(nextQuery: string, nextStatus: string) {
    const normalizedQuery = nextQuery.trim();
    const nextKey = `${normalizedQuery}\u0000${nextStatus}`;
    if (nextKey === submittedFilters.current) return;

    submittedFilters.current = nextKey;
    const params = new URLSearchParams();
    if (normalizedQuery) params.set("q", normalizedQuery);
    if (nextStatus) params.set("status", nextStatus);
    const queryString = params.toString();
    const href = queryString ? `/admin/members?${queryString}` : "/admin/members";

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateDirectory(query, status);
  }

  return (
    <form onSubmit={handleSubmit} className="a-card mb-5 p-3 sm:p-4" aria-busy={isSearching}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search members</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-a-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, or member ID…"
            className="a-input pl-9 pr-10"
            autoComplete="off"
          />
          {isSearching ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" role="status" aria-label="Searching members">
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-a-brand/25 border-t-a-brand" />
            </span>
          ) : null}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="a-select sm:min-w-48"
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="a-btn a-btn-primary" aria-label="Search member directory">
            {isSearching ? "Searching…" : "Search directory"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-a-border-soft pt-3 text-xs text-a-muted">
        <span>{isSearching ? "Searching directory…" : query || status ? "Filtered directory" : "All chapter records"}</span>
        <span className="font-mono">{isSearching ? "Updating results…" : `Showing ${displayedCount} of ${totalCount}`}</span>
      </div>
    </form>
  );
}
