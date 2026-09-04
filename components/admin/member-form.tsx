"use client";

import { useActionState, useRef, useState } from "react";
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
  grandKnight: string;
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
  grandKnight: "",
  photoUrl: "",
  hasPhoto: false,
};

const inputClass =
  "mt-1 w-full rounded-lg border border-a-border bg-white px-3 py-2 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15 disabled:bg-black/5";

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
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="a-card p-5 sm:p-6">
      <h2 className="a-card-title mb-4">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
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
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl);
  const [hasPhoto, setHasPhoto] = useState(initial.hasPhoto);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOfficer = status === "PGP-GS Roxas City Chapter Officer";
  const isFormerPresident = status === "Former Chapter President";
  const isFormerVicePresident = status === "Former Chapter Vice President";
  const isFormerMasterInitiator = status === "Former Chapter Master Initiator";
  const isFormerLadyInitiator = status === "Former Chapter Lady Initiator";

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

      <Section title="Personal Information">
        <Field label="First name" required>
          <input
            name="firstName"
            defaultValue={initial.firstName}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Last name" required>
          <input
            name="lastName"
            defaultValue={initial.lastName}
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
        <Field label="Age" required>
          <input
            name="age"
            type="number"
            min={1}
            max={120}
            defaultValue={initial.age}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Date of birth" required>
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={initial.dateOfBirth}
            required
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
        <Field label="Email" required>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
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
      </Section>

      <Section title="Guardian">
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

      <Section title="Membership">
        <Field label="Membership status" required>
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
        <Field label="Date survived (initiation)" required>
          <input
            name="dateSurvived"
            type="date"
            defaultValue={initial.dateSurvived}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Baptized name" required>
          <input
            name="baptizedName"
            defaultValue={initial.baptizedName}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Grand Knight (year/title, if any)">
          <input
            name="grandKnight"
            defaultValue={initial.grandKnight}
            className={inputClass}
          />
        </Field>
      </Section>

      {isOfficer ? (
        <Section title="Officer Details">
          <Field label="Officer position" required>
            <select
              name="officerPosition"
              defaultValue={initial.officerPosition}
              required
              className={inputClass}
            >
              <option value="">Select position…</option>
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
        <Section title="Former Chapter President">
          <Field label="Chapter" required>
            <select
              name="formerPresidentChapter"
              defaultValue={initial.formerPresidentChapter}
              required
              className={inputClass}
            >
              <option value="">Select chapter…</option>
              {chapters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <div />
          <Field label="Term start" required>
            <input
              name="formerPresidentStart"
              type="date"
              defaultValue={initial.formerPresidentStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Term end" required>
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
        <Section title="Former Chapter Vice President">
          <Field label="Chapter" required>
            <select
              name="formerVicePresidentChapter"
              defaultValue={initial.formerVicePresidentChapter}
              required
              className={inputClass}
            >
              <option value="">Select chapter…</option>
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
              <option value="">Select role…</option>
              {VICE_PRESIDENT_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term start" required>
            <input
              name="formerVicePresidentStart"
              type="date"
              defaultValue={initial.formerVicePresidentStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Term end" required>
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
        <Section title="Former Chapter Master Initiator">
          <Field label="Chapter" required>
            <select
              name="formerMasterInitiatorChapter"
              defaultValue={initial.formerMasterInitiatorChapter}
              required
              className={inputClass}
            >
              <option value="">Select chapter…</option>
              {chapters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role" required>
            <select
              name="formerMasterInitiatorRole"
              defaultValue={initial.formerMasterInitiatorRole}
              required
              className={inputClass}
            >
              <option value="">Select role…</option>
              {MASTER_INITIATOR_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term start" required>
            <input
              name="formerMasterInitiatorStart"
              type="date"
              defaultValue={initial.formerMasterInitiatorStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Term end" required>
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
        <Section title="Former Chapter Lady Initiator">
          <Field label="Chapter" required>
            <select
              name="formerLadyInitiatorChapter"
              defaultValue={initial.formerLadyInitiatorChapter}
              required
              className={inputClass}
            >
              <option value="">Select chapter…</option>
              {chapters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role" required>
            <select
              name="formerLadyInitiatorRole"
              defaultValue={initial.formerLadyInitiatorRole}
              required
              className={inputClass}
            >
              <option value="">Select role…</option>
              {LADY_INITIATOR_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Term start" required>
            <input
              name="formerLadyInitiatorStart"
              type="date"
              defaultValue={initial.formerLadyInitiatorStart}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Term end" required>
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

      <Section title="Photo">
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Member photo preview"
                className="h-[72px] w-[72px] rounded-full border border-a-border object-cover"
              />
            ) : (
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-a-brand-soft text-center text-[10px] leading-tight text-a-brand">
                No photo
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
                className="block w-full max-w-xs text-sm text-a-muted file:mr-3 file:rounded-full file:border-0 file:bg-a-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-a-brand-dark"
                disabled={uploading}
              />
              {uploading ? (
                <p className="mt-1 text-xs text-a-muted">Uploading photo…</p>
              ) : null}
              {uploadError ? (
                <p className="mt-1 text-xs text-a-danger">{uploadError}</p>
              ) : null}
              {photoUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoUrl("");
                    setHasPhoto(false);
                  }}
                  className="mt-1 text-xs font-semibold text-a-danger hover:underline"
                >
                  Remove photo
                </button>
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
