"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  createMemberAction,
  updateMemberAction,
  type MemberFormState,
} from "@/lib/actions/member-actions";
import {
  LADY_INITIATOR_ROLES,
  MASTER_INITIATOR_ROLES,
  MEMBER_STATUSES,
  OFFICER_POSITIONS,
  VICE_PRESIDENT_ROLES,
} from "@/lib/member-constants";
import { uploadMemberPhoto } from "@/lib/imagekit";

export type MemberFormValues = {
  id: string;
  memberId: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  age: string;
  dateOfBirth: string;
  placeOfBirth: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;
  email: string;
  contactNumber: string;
  guardianName: string;
  guardianAddress: string;
  guardianContact: string;
  baptizedName: string;
  dateSurvived: string;
  status: string;
  memberChapter: string;
  officerPosition: string;
  officerDateElected: string;
  formerPresidentChapter: string;
  formerPresidentStart: string;
  formerPresidentEnd: string;
  formerVicePresidentChapter: string;
  formerVicePresidentRole: string;
  formerVicePresidentStart: string;
  formerVicePresidentEnd: string;
  formerMasterInitiatorRole: string;
  formerMasterInitiatorChapter: string;
  formerMasterInitiatorStart: string;
  formerMasterInitiatorEnd: string;
  formerLadyInitiatorRole: string;
  formerLadyInitiatorChapter: string;
  formerLadyInitiatorStart: string;
  formerLadyInitiatorEnd: string;
  grandKnightChapter: string;
  grandKnightStart: string;
  grandKnightEnd: string;
  chapterOrganizerChapter: string;
  photoUrl: string;
  hasPhoto: boolean;
};

export const emptyMemberForm: MemberFormValues = {
  id: "",
  memberId: "",
  firstName: "",
  lastName: "",
  middleInitial: "",
  age: "",
  dateOfBirth: "",
  placeOfBirth: "",
  street: "",
  barangay: "",
  municipality: "Roxas City",
  province: "Capiz",
  email: "",
  contactNumber: "",
  guardianName: "",
  guardianAddress: "",
  guardianContact: "",
  baptizedName: "",
  dateSurvived: "",
  status: "Member",
  memberChapter: "",
  officerPosition: "",
  officerDateElected: "",
  formerPresidentChapter: "",
  formerPresidentStart: "",
  formerPresidentEnd: "",
  formerVicePresidentChapter: "",
  formerVicePresidentRole: "",
  formerVicePresidentStart: "",
  formerVicePresidentEnd: "",
  formerMasterInitiatorRole: "",
  formerMasterInitiatorChapter: "",
  formerMasterInitiatorStart: "",
  formerMasterInitiatorEnd: "",
  formerLadyInitiatorRole: "",
  formerLadyInitiatorChapter: "",
  formerLadyInitiatorStart: "",
  formerLadyInitiatorEnd: "",
  grandKnightChapter: "",
  grandKnightStart: "",
  grandKnightEnd: "",
  chapterOrganizerChapter: "",
  photoUrl: "",
  hasPhoto: false,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-a-border bg-white px-3 py-2 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15 disabled:bg-black/5";

function capitalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, separator: string, letter: string) =>
      `${separator}${letter.toUpperCase()}`,
    );
}

/** Same auto-age rule as the public members/register form. */
function calculateAge(dateOfBirth: string) {
  const value = new Date(`${dateOfBirth}T00:00:00`);
  if (!dateOfBirth || Number.isNaN(value.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - value.getFullYear();
  const hasPassed =
    today.getMonth() > value.getMonth() ||
    (today.getMonth() === value.getMonth() &&
      today.getDate() >= value.getDate());
  if (!hasPassed) age -= 1;
  return age >= 0 ? String(age) : "";
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-a-muted">
        {label}
        {required ? <span className="text-a-danger"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="a-card p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-a-gold">
        {eyebrow}
      </p>
      <h2 className="a-card-title mt-1 mb-4">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Avatar({ photo, fullName }: { photo: string; fullName: string }) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt="Member photo preview"
        width={96}
        height={96}
        unoptimized
        className="h-[96px] w-[96px] rounded-full border border-a-border object-cover object-top"
      />
    );
  }
  return (
    <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-a-brand-soft font-serif text-2xl font-semibold text-a-brand">
      {getInitials(fullName) || "PG"}
    </div>
  );
}

export default function MemberForm({
  mode,
  initial,
  chapters,
}: {
  mode: "create" | "edit";
  initial: MemberFormValues;
  chapters: string[];
}) {
  const [state, formAction, isPending] = useActionState<
    MemberFormState,
    FormData
  >(mode === "create" ? createMemberAction : updateMemberAction, {});

  const [status, setStatus] = useState(initial.status);
  const [dateOfBirth, setDateOfBirth] = useState(initial.dateOfBirth);
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);
  const [hasPhoto, setHasPhoto] = useState(initial.hasPhoto);
  const [photoName, setPhotoName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The age input is disabled (matching the register form), and disabled
  // inputs are excluded from FormData — mirror the computed value into a
  // hidden input so the server action receives it.
  const calculatedAge = useMemo(
    () => calculateAge(dateOfBirth),
    [dateOfBirth],
  );

  const fullName = `${firstName} ${lastName}`.trim();

  const isMemberOrAlumni = status === "Member" || status === "Alumni";
  const isOfficer = status === "PGP-GS Roxas City Chapter Officer";
  const isFormerPresident = status === "Former Chapter President";
  const isFormerVicePresident = status === "Former Chapter Vice President";
  const isFormerMasterInitiator = status === "Former Chapter Master Initiator";
  const isFormerLadyInitiator = status === "Former Chapter Lady Initiator";
  const isFormerGrandKnight = status === "Former Grand Knight";
  const isElectedGrandKnight = status === "Elected Grand Knight";
  const isChapterOrganizer = status === "Chapter Organizer";

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await uploadMemberPhoto(
        file,
        `${initial.firstName || "member"} ${initial.lastName}`.trim(),
      );
      setPhotoUrl(result.url);
      setHasPhoto(true);
      setPhotoName(file.name);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Photo upload failed.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      {mode === "edit" ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <input
        type="hidden"
        name="hasPhoto"
        value={hasPhoto ? "true" : "false"}
      />
      <input type="hidden" name="age" value={calculatedAge} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-xl border border-[#fecdca] bg-a-danger-soft px-4 py-3 text-sm font-medium text-a-danger"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p
          role="status"
          className="rounded-xl border border-[#a6f4c5] bg-a-success-soft px-4 py-3 text-sm font-medium text-a-success"
        >
          {state.success}
        </p>
      ) : null}

      <Section eyebrow="01 / About you" title="Personal Information">
        <Field label="First name" required>
          <input
            name="firstName"
            defaultValue={initial.firstName}
            onChange={(event) => setFirstName(capitalizeWords(event.target.value))}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Last name" required>
          <input
            name="lastName"
            defaultValue={initial.lastName}
            onChange={(event) => setLastName(capitalizeWords(event.target.value))}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Middle initial">
          <input
            name="middleInitial"
            defaultValue={initial.middleInitial}
            maxLength={2}
            className={inputClass}
          />
        </Field>
        <Field label="Birthday" required>
          <input
            name="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Age">
          <input
            type="number"
            min={1}
            max={120}
            value={calculatedAge}
            placeholder="Auto-generated"
            disabled
            className={inputClass}
          />
        </Field>
        <Field label="Place of birth" required>
          <input
            name="placeOfBirth"
            defaultValue={initial.placeOfBirth}
            required
            className={inputClass}
          />
        </Field>
      </Section>

      <Section eyebrow="02 / Where you live" title="Complete Address">
        <Field label="Street" required>
          <input
            name="street"
            defaultValue={initial.street}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Barangay" required>
          <input
            name="barangay"
            defaultValue={initial.barangay}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Municipality / City" required>
          <input
            name="municipality"
            defaultValue={initial.municipality}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Province" required>
          <input
            name="province"
            defaultValue={initial.province}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Contact number" required>
          <input
            name="contactNumber"
            defaultValue={initial.contactNumber}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Email" required>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            required
            className={inputClass}
          />
        </Field>
      </Section>

      <Section eyebrow="03 / Your family contact" title="Guardian's Information">
        <Field label="Guardian name" required>
          <input
            name="guardianName"
            defaultValue={initial.guardianName}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Guardian contact" required>
          <input
            name="guardianContact"
            defaultValue={initial.guardianContact}
            required
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Guardian address" required>
            <input
              name="guardianAddress"
              defaultValue={initial.guardianAddress}
              required
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section eyebrow="04 / Your PGPGS journey" title="Membership Information">
        <Field label="Baptized name" required>
          <input
            name="baptizedName"
            defaultValue={initial.baptizedName}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Date survived (initiation)" required>
          <input
            name="dateSurvived"
            type="date"
            defaultValue={initial.dateSurvived}
            required
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Are you:" required>
            <select
              name="status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={inputClass}
            >
              {MEMBER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {isMemberOrAlumni ? (
        <Section eyebrow="04A / Member details" title="Chapter Information">
          <div className="sm:col-span-2">
            <Field label="What PGPGS Chapter did you survive?" required>
              <select
                name="memberChapter"
                defaultValue={initial.memberChapter}
                required
                className={inputClass}
              >
                <option value="">Select a chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
      ) : null}

      {isOfficer ? (
        <Section eyebrow="04A / Officer details" title="PGP-GS Roxas City Chapter Officer Information">
          <Field label="Position" required>
            <select
              name="officerPosition"
              defaultValue={initial.officerPosition}
              required
              className={inputClass}
            >
              <option value="">Select your position</option>
              {OFFICER_POSITIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date elected" required>
            <input
              name="officerDateElected"
              type="date"
              defaultValue={initial.officerDateElected}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isFormerPresident ? (
        <Section eyebrow="04B / Former president details" title="Former Chapter President Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter" required>
              <select
                name="formerPresidentChapter"
                defaultValue={initial.formerPresidentChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Date started" required>
            <input
              name="formerPresidentStart"
              type="date"
              defaultValue={initial.formerPresidentStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Date ended" required>
            <input
              name="formerPresidentEnd"
              type="date"
              defaultValue={initial.formerPresidentEnd}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isFormerVicePresident ? (
        <Section eyebrow="04E / Former vice president details" title="Former Chapter Vice President Information">
          <Field label="PGPGS Chapter" required>
            <select
              name="formerVicePresidentChapter"
              defaultValue={initial.formerVicePresidentChapter}
              required
              className={inputClass}
            >
              <option value="">Select chapter</option>
              {chapters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role" required>
            <select
              name="formerVicePresidentRole"
              defaultValue={initial.formerVicePresidentRole}
              required
              className={inputClass}
            >
              <option value="">Select your role</option>
              {VICE_PRESIDENT_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date started" required>
            <input
              name="formerVicePresidentStart"
              type="date"
              defaultValue={initial.formerVicePresidentStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Date ended" required>
            <input
              name="formerVicePresidentEnd"
              type="date"
              defaultValue={initial.formerVicePresidentEnd}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isFormerMasterInitiator ? (
        <Section eyebrow="04C / Former Master Initiator details" title="Former Chapter Master Initiator Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter" required>
              <select
                name="formerMasterInitiatorChapter"
                defaultValue={initial.formerMasterInitiatorChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Role" required>
            <select
              name="formerMasterInitiatorRole"
              defaultValue={initial.formerMasterInitiatorRole}
              required
              className={inputClass}
            >
              <option value="">Select your role</option>
              {MASTER_INITIATOR_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date started" required>
            <input
              name="formerMasterInitiatorStart"
              type="date"
              defaultValue={initial.formerMasterInitiatorStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Date ended" required>
            <input
              name="formerMasterInitiatorEnd"
              type="date"
              defaultValue={initial.formerMasterInitiatorEnd}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isFormerLadyInitiator ? (
        <Section eyebrow="04D / Former Lady Initiator details" title="Former Chapter Lady Initiator Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter" required>
              <select
                name="formerLadyInitiatorChapter"
                defaultValue={initial.formerLadyInitiatorChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Role" required>
            <select
              name="formerLadyInitiatorRole"
              defaultValue={initial.formerLadyInitiatorRole}
              required
              className={inputClass}
            >
              <option value="">Select your role</option>
              {LADY_INITIATOR_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date started" required>
            <input
              name="formerLadyInitiatorStart"
              type="date"
              defaultValue={initial.formerLadyInitiatorStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Date ended" required>
            <input
              name="formerLadyInitiatorEnd"
              type="date"
              defaultValue={initial.formerLadyInitiatorEnd}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isFormerGrandKnight ? (
        <Section eyebrow="04F / Former Grand Knight details" title="Former Grand Knight Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter" required>
              <select
                name="grandKnightChapter"
                defaultValue={initial.grandKnightChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Date started" required>
            <input
              name="grandKnightStart"
              type="date"
              defaultValue={initial.grandKnightStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Date ended" required>
            <input
              name="grandKnightEnd"
              type="date"
              defaultValue={initial.grandKnightEnd}
              required
              className={inputClass}
            />
          </Field>
        </Section>
      ) : null}

      {isElectedGrandKnight ? (
        <Section eyebrow="04G / Elected Grand Knight details" title="Elected Grand Knight Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter" required>
              <select
                name="grandKnightChapter"
                defaultValue={initial.grandKnightChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
      ) : null}

      {isChapterOrganizer ? (
        <Section eyebrow="04H / Chapter Organizer details" title="Chapter Organizer Information">
          <div className="sm:col-span-2">
            <Field label="PGPGS Chapter you organize" required>
              <select
                name="chapterOrganizerChapter"
                defaultValue={initial.chapterOrganizerChapter}
                required
                className={inputClass}
              >
                <option value="">Select chapter</option>
                {chapters.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
      ) : null}

      <Section eyebrow="05 / Profile photo" title="Photo">
        <div className="sm:col-span-2">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <Avatar photo={photoUrl} fullName={fullName} />
            <div className="flex-1">
              <p className="text-sm leading-6 text-a-muted">
                Upload a clear photo of the member. If no photo is uploaded, a
                generated avatar with the member&apos;s initials is shown
                instead.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="a-btn a-btn-secondary"
                >
                  {photoUrl ? "Change photo" : "Upload photo"}
                </button>
                {photoUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUrl("");
                      setHasPhoto(false);
                      setPhotoName("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-sm font-semibold text-a-danger hover:underline"
                  >
                    Remove photo
                  </button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    handlePhotoChange(event.target.files?.[0])
                  }
                />
              </div>
              {photoName ? (
                <p className="mt-3 text-xs font-medium text-a-muted">
                  {photoName}
                </p>
              ) : null}
              {uploading ? (
                <p className="mt-1 text-xs text-a-muted">Uploading photo…</p>
              ) : null}
              {uploadError ? (
                <p className="mt-1 text-xs text-a-danger" role="alert">
                  {uploadError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Section>

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isPending || uploading}
          className="a-btn a-btn-primary"
        >
          {isPending
            ? "Saving…"
            : mode === "create"
              ? "Create member"
              : "Save changes"}
        </button>
      </div>
    </form>
  );
}
