"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { uploadChapterLogo } from "@/lib/imagekit";

const inputClass =
  "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15 disabled:bg-black/[0.04] disabled:text-black/50";

const selectClass =
  "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15";

const sectionCardClass =
  "border border-black/10 bg-white p-5 shadow-[0_10px_30px_rgba(15,61,38,0.06)] sm:p-8";

const INITIATOR_ROLES = ["I", "II", "III", "IV"] as const;
const VICE_PRESIDENT_ROLES = [
  "Vice President for Internal",
  "Vice President for External",
] as const;

type InitiatorRole = (typeof INITIATOR_ROLES)[number];
type VicePresidentRole = (typeof VICE_PRESIDENT_ROLES)[number];

type MemberOption = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  status: string;
};

type ChapterForm = {
  chapterName: string;
  chapterAddress: string;
  chapterOrganizer: string;
};

const initialForm: ChapterForm = {
  chapterName: "",
  chapterAddress: "",
  chapterOrganizer: "",
};

function memberDisplayName(member: MemberOption) {
  return `${member.firstName}${member.middleInitial ? ` ${member.middleInitial}` : ""} ${member.lastName}`
    .replace(/\s+/g, " ")
    .trim();
}

function MemberCombobox({
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
      <span className="text-sm font-semibold text-black/70">{label}</span>

      {selected ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-sm border border-[var(--green)]/30 bg-[var(--green-soft)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--green-dark)]">
              {memberDisplayName(selected)}
            </p>
            <p className="truncate text-xs text-black/50">
              {selected.memberId} · {selected.status}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 rounded-sm px-2 py-1 text-xs font-semibold text-black/50 transition hover:bg-black/5 hover:text-black"
          >
            Change
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
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-sm border border-black/15 bg-white shadow-[0_14px_34px_rgba(15,61,38,0.16)]">
              {isLoading ? (
                <p className="px-3 py-3 text-sm text-black/50">Searching…</p>
              ) : query.trim().length < 2 ? (
                <p className="px-3 py-3 text-sm text-black/45">
                  Type at least 2 characters to search members.
                </p>
              ) : results.length === 0 ? (
                <p className="px-3 py-3 text-sm text-black/45">
                  {searchError || "No members found. Try another name."}
                </p>
              ) : (
                <ul
                  role="listbox"
                  aria-label={`${label} search results`}
                  className="max-h-56 overflow-y-auto"
                >
                  {results.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => choose(member)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--green-soft)]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--green-dark)]">
                            {memberDisplayName(member)}
                          </span>
                          <span className="block truncate text-xs text-black/50">
                            {member.memberId}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-[var(--green-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--green)]">
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

export default function ChapterRegistrationForm() {
  const [form, setForm] = useState<ChapterForm>(initialForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [president, setPresident] = useState<MemberOption | null>(null);
  const [vicePresident, setVicePresident] = useState<MemberOption | null>(null);
  const [vicePresidentRole, setVicePresidentRole] = useState<VicePresidentRole | "">("");
  const [secretary, setSecretary] = useState<MemberOption | null>(null);
  const [treasurer, setTreasurer] = useState<MemberOption | null>(null);
  const [masterInitiator, setMasterInitiator] = useState<MemberOption | null>(null);
  const [masterInitiatorRole, setMasterInitiatorRole] = useState<InitiatorRole | "">("");
  const [ladyInitiator, setLadyInitiator] = useState<MemberOption | null>(null);
  const [ladyInitiatorRole, setLadyInitiatorRole] = useState<InitiatorRole | "">("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submittedChapter, setSubmittedChapter] = useState("");
  const [submittedOfficials, setSubmittedOfficials] = useState<
    { role: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!logoPreview) return;
    return () => URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  function updateField(name: keyof ChapterForm, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmissionError("Please select an image file for the logo.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubmissionError("The logo must be 5 MB or smaller.");
      return;
    }
    setSubmissionError("");
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function resetForm() {
    setForm(initialForm);
    removeLogo();
    setPresident(null);
    setVicePresident(null);
    setVicePresidentRole("");
    setSecretary(null);
    setTreasurer(null);
    setMasterInitiator(null);
    setMasterInitiatorRole("");
    setLadyInitiator(null);
    setLadyInitiatorRole("");
    setSubmittedChapter("");
    setSubmittedOfficials([]);
    setSubmissionError("");
  }

  async function submitChapter() {
    setSubmissionError("");
    if (
      !form.chapterName.trim() ||
      !form.chapterAddress.trim() ||
      !form.chapterOrganizer.trim()
    ) {
      setSubmissionError("Please fill in the chapter name, address, and organizer.");
      return;
    }
    if (vicePresident && !vicePresidentRole) {
      setSubmissionError("Please choose the Vice President role (Internal or External).");
      return;
    }
    if (masterInitiator && !masterInitiatorRole) {
      setSubmissionError("Please choose the Master Initiator role (I, II, III, or IV).");
      return;
    }
    if (ladyInitiator && !ladyInitiatorRole) {
      setSubmissionError("Please choose the Lady Initiator role (I, II, III, or IV).");
      return;
    }

    setIsSubmitting(true);
    try {
      let logoUrl = "";
      if (logoFile) {
        const upload = await uploadChapterLogo(logoFile, form.chapterName);
        logoUrl = upload.url;
      }

      const response = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterName: form.chapterName.trim(),
          chapterAddress: form.chapterAddress.trim(),
          chapterOrganizer: form.chapterOrganizer.trim(),
          logoUrl: logoUrl || undefined,
          presidentId: president?.id,
          vicePresidentId: vicePresident?.id,
          vicePresidentRole: vicePresident ? vicePresidentRole : undefined,
          secretaryId: secretary?.id,
          treasurerId: treasurer?.id,
          masterInitiatorId: masterInitiator?.id,
          masterInitiatorRole: masterInitiator ? masterInitiatorRole : undefined,
          ladyInitiatorId: ladyInitiator?.id,
          ladyInitiatorRole: ladyInitiator ? ladyInitiatorRole : undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save the chapter.");
      }

      const officials: { role: string; name: string }[] = [];
      if (president) officials.push({ role: "Chapter President", name: memberDisplayName(president) });
      if (vicePresident) {
        officials.push({
          role: `Vice President (${vicePresidentRole})`,
          name: memberDisplayName(vicePresident),
        });
      }
      if (secretary) officials.push({ role: "Secretary", name: memberDisplayName(secretary) });
      if (treasurer) officials.push({ role: "Treasurer", name: memberDisplayName(treasurer) });
      if (masterInitiator) {
        officials.push({ role: `Master Initiator ${masterInitiatorRole}`, name: memberDisplayName(masterInitiator) });
      }
      if (ladyInitiator) {
        officials.push({ role: `Lady Initiator ${ladyInitiatorRole}`, name: memberDisplayName(ladyInitiator) });
      }

      setSubmittedChapter(form.chapterName.trim());
      setSubmittedOfficials(officials);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to save the chapter.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedChapter) {
    return (
      <div className="max-w-2xl border border-[var(--green)]/25 bg-[var(--green-soft)] p-6 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--green)]">
          Registration received
        </p>
        <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-[var(--green-dark)]">
          {submittedChapter} has been registered.
        </h2>
        <p className="mt-3 text-sm leading-6 text-black/65">
          The chapter will appear on the PGPGS Across Capiz page once it is
          reviewed and published by the council.
        </p>
        {submittedOfficials.length > 0 ? (
          <dl className="mt-6 divide-y divide-black/10 border-t border-black/10">
            {submittedOfficials.map((official) => (
              <div
                key={official.role}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <dt className="text-sm text-black/55">{official.role}</dt>
                <dd className="text-sm font-semibold text-[var(--green-dark)]">
                  {official.name}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
        <button
          type="button"
          onClick={resetForm}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green-dark)] px-6 py-3 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_rgba(15,61,38,0.25)] transition hover:bg-[var(--green)]"
        >
          Register another chapter
        </button>
      </div>
    );
  }

  return (
    <form
        className="mt-12 space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void submitChapter();
        }}
      >
        <section className={sectionCardClass}>
          <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
            Chapter Information
          </h2>
          <div className="mt-6 grid gap-6">
            <div>
              <span className="text-sm font-semibold text-black/70">Official Logo</span>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-[var(--gold)]/40 bg-[var(--green-soft)]">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Chapter logo preview"
                      width={96}
                      height={96}
                      unoptimized
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="px-2 text-center text-[11px] leading-4 text-black/40">
                      No logo yet
                    </span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="rounded-full border border-[var(--green)] px-5 py-2 text-sm font-semibold text-[var(--green)] transition hover:bg-[var(--green-soft)]"
                  >
                    Upload logo
                  </button>
                  {logoFile ? (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="ml-3 text-sm font-semibold text-black/45 transition hover:text-black"
                    >
                      Remove
                    </button>
                  ) : null}
                  <p className="mt-2 text-xs text-black/45">
                    PNG, JPG, or WEBP — up to 5 MB.
                  </p>
                </div>
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoSelect}
              />
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-black/70">Chapter Name</span>
              <input
                type="text"
                value={form.chapterName}
                onChange={(event) => updateField("chapterName", event.target.value)}
                placeholder="e.g. Panit-an Chapter"
                required
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-black/70">Chapter Address</span>
              <input
                type="text"
                value={form.chapterAddress}
                onChange={(event) => updateField("chapterAddress", event.target.value)}
                placeholder="Street, Barangay, Municipality, Capiz"
                required
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-black/70">Chapter Organizer</span>
              <input
                type="text"
                value={form.chapterOrganizer}
                onChange={(event) => updateField("chapterOrganizer", event.target.value)}
                placeholder="Name of the organizer"
                required
                className={inputClass}
              />
            </label>
          </div>
        </section>

        <section className={sectionCardClass}>
          <h2 className="font-serif text-2xl font-semibold text-[var(--green-dark)]">
            Chapter Officials
          </h2>
          <p className="mt-2 text-sm text-black/55">
            Search by name or member ID, then click a member to select them.
            Positions are optional — select only the ones already known.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <MemberCombobox
              label="Chapter President"
              selected={president}
              onSelect={setPresident}
            />
            <div>
              <MemberCombobox
                label="Chapter Vice President"
                selected={vicePresident}
                onSelect={(member) => {
                  setVicePresident(member);
                  if (!member) setVicePresidentRole("");
                }}
              />
              {vicePresident ? (
                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-black/70">
                    Vice President Role
                  </span>
                  <select
                    value={vicePresidentRole}
                    onChange={(event) =>
                      setVicePresidentRole(event.target.value as VicePresidentRole)
                    }
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select role…
                    </option>
                    {VICE_PRESIDENT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
            <MemberCombobox
              label="Secretary"
              selected={secretary}
              onSelect={setSecretary}
            />
            <MemberCombobox
              label="Treasurer"
              selected={treasurer}
              onSelect={setTreasurer}
            />
            <div>
              <MemberCombobox
                label="Master Initiator"
                selected={masterInitiator}
                onSelect={(member) => {
                  setMasterInitiator(member);
                  if (!member) setMasterInitiatorRole("");
                }}
              />
              {masterInitiator ? (
                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-black/70">
                    Master Initiator Role
                  </span>
                  <select
                    value={masterInitiatorRole}
                    onChange={(event) =>
                      setMasterInitiatorRole(event.target.value as InitiatorRole)
                    }
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select role…
                    </option>
                    {INITIATOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div>
              <MemberCombobox
                label="Lady Initiator"
                selected={ladyInitiator}
                onSelect={(member) => {
                  setLadyInitiator(member);
                  if (!member) setLadyInitiatorRole("");
                }}
              />
              {ladyInitiator ? (
                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-black/70">
                    Lady Initiator Role
                  </span>
                  <select
                    value={ladyInitiatorRole}
                    onChange={(event) =>
                      setLadyInitiatorRole(event.target.value as InitiatorRole)
                    }
                    required
                    className={selectClass}
                  >
                    <option value="" disabled>
                      Select role…
                    </option>
                    {INITIATOR_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>
        </section>

        {submissionError ? (
          <p
            role="alert"
            className="border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submissionError}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[var(--green-dark)] px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-[0_10px_24px_rgba(15,61,38,0.25)] transition hover:bg-[var(--green)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Registering…" : "Register Chapter"}
          </button>
          <p className="text-xs text-black/45">
            The logo uploads securely to the chapter&apos;s image library when
            you submit.
          </p>
        </div>
      </form>
  );
}