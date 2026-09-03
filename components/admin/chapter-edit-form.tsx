"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MemberCombobox, {
  memberDisplayName,
  type MemberOption,
} from "@/components/admin/member-combobox";
import { updateChapterAction, type ChapterActionState } from "@/lib/actions/chapter-actions";

const INITIATOR_ROLES = ["I", "II", "III", "IV"] as const;
const VICE_PRESIDENT_ROLES = [
  "Vice President for Internal",
  "Vice President for External",
] as const;
type InitiatorRole = (typeof INITIATOR_ROLES)[number];
type VicePresidentRole = (typeof VICE_PRESIDENT_ROLES)[number];

const inputClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15 disabled:bg-black/5";
const selectClass =
  "mt-2 w-full rounded-lg border border-a-border bg-white px-3 py-2.5 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15";

export type ChapterEditOfficials = {
  president: MemberOption | null;
  vicePresident: MemberOption | null;
  secretary: MemberOption | null;
  treasurer: MemberOption | null;
  masterInitiator: MemberOption | null;
  ladyInitiator: MemberOption | null;
};

export default function ChapterEditForm({
  chapter,
  officials,
  roles,
}: {
  chapter: {
    id: string;
    chapterName: string;
    chapterAddress: string;
    chapterOrganizer: string;
    logoUrl: string | null;
    status: string;
  };
  officials: ChapterEditOfficials;
  roles: { vicePresidentRole: string; masterInitiatorRole: string; ladyInitiatorRole: string };
}) {
  const [state, formAction, isPending] = useActionState<ChapterActionState, FormData>(
    updateChapterAction,
    {},
  );

  const [logoPreview, setLogoPreview] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [president, setPresident] = useState<MemberOption | null>(officials.president);
  const [vicePresident, setVicePresident] = useState<MemberOption | null>(officials.vicePresident);
  const [vicePresidentRole, setVicePresidentRole] = useState<VicePresidentRole | "">(
    (roles.vicePresidentRole as VicePresidentRole) || "",
  );
  const [secretary, setSecretary] = useState<MemberOption | null>(officials.secretary);
  const [treasurer, setTreasurer] = useState<MemberOption | null>(officials.treasurer);
  const [masterInitiator, setMasterInitiator] = useState<MemberOption | null>(officials.masterInitiator);
  const [ladyInitiator, setLadyInitiator] = useState<MemberOption | null>(officials.ladyInitiator);
  const [masterInitiatorRole, setMasterInitiatorRole] = useState<InitiatorRole | "">(
    (roles.masterInitiatorRole as InitiatorRole) || "",
  );
  const [ladyInitiatorRole, setLadyInitiatorRole] = useState<InitiatorRole | "">(
    (roles.ladyInitiatorRole as InitiatorRole) || "",
  );

  useEffect(() => {
    if (!logoPreview) return;
    return () => URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  function handleLogoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;
    setLogoPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function clearLogo() {
    setLogoPreview("");
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="chapterId" value={chapter.id} />
      <input type="hidden" name="presidentId" value={president?.id ?? ""} />
      <input type="hidden" name="vicePresidentId" value={vicePresident?.id ?? ""} />
      <input type="hidden" name="vicePresidentRole" value={vicePresidentRole} />
      <input type="hidden" name="secretaryId" value={secretary?.id ?? ""} />
      <input type="hidden" name="treasurerId" value={treasurer?.id ?? ""} />
      <input type="hidden" name="masterInitiatorId" value={masterInitiator?.id ?? ""} />
      <input type="hidden" name="ladyInitiatorId" value={ladyInitiator?.id ?? ""} />

      <section className="a-card p-5 sm:p-6" aria-labelledby="chapter-info-heading">
        <h2 id="chapter-info-heading" className="a-card-title">
          Chapter information
        </h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-a-secondary">Chapter name</span>
            <input type="text" name="chapterName" defaultValue={chapter.chapterName} required className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-a-secondary">Address</span>
            <input type="text" name="chapterAddress" defaultValue={chapter.chapterAddress} required className={inputClass} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold text-a-secondary">Organizer</span>
            <input type="text" name="chapterOrganizer" defaultValue={chapter.chapterOrganizer} required className={inputClass} />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-a-secondary">Official logo</span>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-a-border bg-a-brand-soft">
                {logoPreview ? (
                  <Image src={logoPreview} alt="New logo preview" width={96} height={96} unoptimized className="h-full w-full object-contain p-2" />
                ) : chapter.logoUrl ? (
                  <Image src={chapter.logoUrl} alt="Current chapter logo" width={96} height={96} unoptimized className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-a-brand">PGPGS</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoSelect}
                  className="block w-full max-w-xs text-sm text-a-muted file:mr-3 file:rounded-lg file:border-0 file:bg-a-brand file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-a-brand-dark"
                />
                {logoPreview ? (
                  <button type="button" onClick={clearLogo} className="self-start text-xs font-semibold text-a-muted transition hover:text-a-text">
                    Cancel logo change
                  </button>
                ) : (
                  <p className="text-xs text-a-muted">PNG, JPG, or WebP up to 5 MB. Leave empty to keep the current logo.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="a-card p-5 sm:p-6" aria-labelledby="chapter-officials-heading">
        <h2 id="chapter-officials-heading" className="a-card-title">
          Chapter officials
        </h2>
        <p className="mt-1 text-sm text-a-muted">
          Search the member directory to designate or update the chapter officials. All slots are optional.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <MemberCombobox label="President" selected={president} onSelect={setPresident} />
          <div>
            <MemberCombobox
              label="Vice President"
              selected={vicePresident}
              onSelect={(member) => {
                setVicePresident(member);
                if (!member) setVicePresidentRole("");
              }}
            />
            {vicePresident ? (
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-a-secondary">Vice President Role</span>
                <select
                  name="vicePresidentRole"
                  value={vicePresidentRole}
                  onChange={(event) => setVicePresidentRole(event.target.value as VicePresidentRole)}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Select role…</option>
                  {VICE_PRESIDENT_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <MemberCombobox label="Secretary" selected={secretary} onSelect={setSecretary} />
          <MemberCombobox label="Treasurer" selected={treasurer} onSelect={setTreasurer} />
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
                <span className="text-sm font-semibold text-a-secondary">Master Initiator Role</span>
                <select
                  name="masterInitiatorRole"
                  value={masterInitiatorRole}
                  onChange={(event) => setMasterInitiatorRole(event.target.value as InitiatorRole)}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Select role…</option>
                  {INITIATOR_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
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
                <span className="text-sm font-semibold text-a-secondary">Lady Initiator Role</span>
                <select
                  name="ladyInitiatorRole"
                  value={ladyInitiatorRole}
                  onChange={(event) => setLadyInitiatorRole(event.target.value as InitiatorRole)}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>Select role…</option>
                  {INITIATOR_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="rounded-xl border border-[#fecdca] bg-a-danger-soft px-4 py-3 text-sm font-medium text-a-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-xl border border-[#a6f4c5] bg-a-success-soft px-4 py-3 text-sm font-medium text-a-success">
          {state.success}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="a-btn a-btn-primary"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href="/admin/chapters"
            className="a-btn a-btn-secondary"
          >
            Back to chapters
          </Link>
        </div>
        <p className="text-xs text-a-muted">
          Selected officials: {[president, vicePresident, secretary, treasurer, masterInitiator, ladyInitiator].filter(Boolean).map((m) => memberDisplayName(m!)).join(", ") || "none"}
        </p>
      </div>
    </form>
  );
}