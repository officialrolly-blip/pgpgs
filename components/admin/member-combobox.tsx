"use client";

import { useEffect, useRef, useState } from "react";

export type MemberOption = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  status: string;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15";

export function memberDisplayName(member: MemberOption) {
  return `${member.firstName}${member.middleInitial ? ` ${member.middleInitial}` : ""} ${member.lastName}`
    .replace(/\s+/g, " ")
    .trim();
}

/** Type-ahead member search with a selectable dropdown, used by admin forms. */
export default function MemberCombobox({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: MemberOption | null;
  onSelect: (member: MemberOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Debounced member search — runs only while the dropdown is open.
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    const timer = setTimeout(async () => {
      controllerRef.current?.abort();
      if (trimmed.length < 2) {
        setResults([]);
        setIsLoading(false);
        setSearchError("");
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setIsLoading(true);
      setSearchError("");
      try {
        const response = await fetch(
          `/api/pgpmembers/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { members?: MemberOption[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Search failed.");
        setResults(data.members ?? []);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setSearchError(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  function choose(member: MemberOption) {
    onSelect(member);
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <span className="text-sm font-semibold text-a-secondary">{label}</span>

      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-a-brand/30 bg-a-brand-soft px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-a-text">
              {memberDisplayName(selected)}
            </p>
            <p className="truncate text-xs text-a-muted">
              {selected.memberId} · {selected.status}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-a-muted transition hover:bg-black/5 hover:text-a-text"
          >
            Clear
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search member name or ID…"
            className={inputClass}
            autoComplete="off"
          />
          {isOpen ? (
            <div className="a-card absolute inset-x-0 top-full z-20 mt-1 overflow-hidden !rounded-xl p-0">
              {isLoading ? (
                <p className="px-3 py-3 text-sm text-a-muted">Searching…</p>
              ) : query.trim().length < 2 ? (
                <p className="px-3 py-3 text-sm text-a-muted">
                  Type at least 2 characters to search members.
                </p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-a-muted">
                  {searchError || "No members found. Try another name."}
                </p>
              ) : (
                <ul
                  role="listbox"
                  aria-label={`${label} search results`}
                  className="max-h-56 overflow-y-auto p-1"
                >
                  {results.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => choose(member)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--a-bg)]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-a-text">
                            {memberDisplayName(member)}
                          </span>
                          <span className="block truncate text-xs text-a-muted">
                            {member.memberId}
                          </span>
                        </span>
                        <span className="a-badge a-badge-green shrink-0">
                          {member.status}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}