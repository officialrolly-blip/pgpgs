"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MemberOption = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  status: string;
  /** Chapter the member belongs to — only returned by authenticated searches. */
  chapter?: string | null;
  email?: string | null;
};

const inputClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 pr-10 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15 disabled:bg-black/5";

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
  endpoint = "/api/pgpmembers/search",
  placeholder = "Search member name or ID…",
  hint,
  wrapperClassName,
}: {
  label: string;
  selected: MemberOption | null;
  onSelect: (member: MemberOption | null) => void;
  /**
   * Search endpoint. The public one returns identification fields only; admin
   * forms that need the member's chapter use `/api/admin/member-search`.
   */
  endpoint?: string;
  placeholder?: string;
  hint?: string;
  wrapperClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const listboxId = useId();

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
          `${endpoint}?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { members?: MemberOption[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Search failed.");
        setResults(data.members ?? []);
        setActiveIndex(-1);
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setSearchError(error.message);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, isOpen, endpoint]);

  function choose(member: MemberOption) {
    onSelect(member);
    setIsOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (!isOpen || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      const active = results[activeIndex];
      if (active) {
        event.preventDefault();
        choose(active);
      }
    }
  }

  return (
    <div ref={containerRef} className={wrapperClassName ?? "relative"}>
      <span className="text-sm font-semibold text-a-secondary">{label}</span>

      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-a-brand/30 bg-a-brand-soft px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-a-text">
              {memberDisplayName(selected)}
            </p>
            <p className="truncate text-xs text-a-muted">
              {selected.memberId} · {selected.status}
              {selected.chapter ? ` · ${selected.chapter}` : ""}
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
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 && results[activeIndex]
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-busy={isLoading}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={inputClass}
            autoComplete="off"
          />
          {isLoading ? (
            <span
              role="status"
              aria-label="Searching members"
              className="pointer-events-none absolute right-3 top-[2.15rem]"
            >
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-a-brand/25 border-t-a-brand" />
            </span>
          ) : null}
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
                  id={listboxId}
                  role="listbox"
                  aria-label={`${label} search results`}
                  className="max-h-56 overflow-y-auto p-1"
                >
                  {results.map((member, index) => (
                    <li
                      key={member.id}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                    >
                      <button
                        type="button"
                        onClick={() => choose(member)}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          index === activeIndex ? "bg-[var(--a-bg)]" : "hover:bg-[var(--a-bg)]"
                        }`}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-a-text">
                            {memberDisplayName(member)}
                          </span>
                          <span className="block truncate text-xs text-a-muted">
                            {member.memberId}
                            {member.chapter ? ` · ${member.chapter}` : ""}
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
      {hint ? <span className="mt-1.5 block text-xs text-a-muted">{hint}</span> : null}
    </div>
  );
}