"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PageShell from "@/components/page-shell";
import { uploadMemberPhoto } from "@/lib/imagekit";

const inputClass =
  "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15 disabled:bg-black/[0.04] disabled:text-black/50";

const selectClass =
  "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15";

const positions = [
  "President",
  "Vice President Internal",
  "Vice President External",
  "Treasurer",
  "Secretary",
  "Auditor",
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
] as const;

type MemberFormData = {
  firstName: string;
  lastName: string;
  middleInitial: string;
  dateOfBirth: string;
  age: string;
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
  status:
    | "Member"
    | "Alumni"
    | "PGP-GS Roxas City Chapter Officer"
    | "Former Chapter President"
    | "Grand Knights";
  officerPosition: string;
  officerDateElected: string;
  formerPresidentStart: string;
  formerPresidentEnd: string;
};

const initialData: MemberFormData = {
  firstName: "",
  lastName: "",
  middleInitial: "",
  dateOfBirth: "",
  age: "",
  placeOfBirth: "",
  street: "",
  barangay: "",
  municipality: "",
  province: "",
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
  formerPresidentStart: "",
  formerPresidentEnd: "",
};

function capitalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, separator: string, letter: string) =>
      `${separator}${letter.toUpperCase()}`,
    );
}

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
  name,
  value,
  onChange,
  type = "text",
  required = true,
  hint,
  placeholder,
  disabled = false,
}: {
  label: string;
  name: keyof MemberFormData;
  value: string;
  onChange: (name: keyof MemberFormData, value: string) => void;
  type?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  function handleChange(input: string) {
    if (name === "middleInitial") {
      onChange(name, input.replace(/[^a-z]/gi, "").slice(0, 1).toUpperCase());
      return;
    }
    onChange(name, type === "text" ? capitalizeWords(input) : input);
  }

  return (
    <label className="block text-sm font-semibold text-[var(--green-dark)]">
      {label}
      <input
        className={`${inputClass} ${disabled ? "opacity-60" : ""}`}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        required={required && !disabled}
      />
      {hint ? (
        <span className="mt-2 block text-xs font-medium text-black/45">{hint}</span>
      ) : null}
    </label>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-black/10 pt-8">
      <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-black/60">{description}</p>
      ) : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Avatar({
  photo,
  fullName,
  size = 120,
}: {
  photo?: string;
  fullName: string;
  size?: number;
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={`${fullName || "Member"} photo`}
        width={size}
        height={size}
        unoptimized
        style={{ width: size, height: size, objectFit: "cover", objectPosition: "center top" }}
        className="rounded-full ring-2 ring-[var(--gold)]"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--green)] to-[var(--green-dark)] ring-2 ring-[var(--gold)]"
    >
      <span
        style={{ fontSize: size * 0.34 }}
        className="font-serif font-semibold text-[var(--gold-light)]"
      >
        {getInitials(fullName) || "PG"}
      </span>
    </div>
  );
}
export default function MemberRegisterPage() {
  const [formData, setFormData] = useState<MemberFormData>(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const [showModal, setShowModal] = useState(false);

  const calculatedAge = useMemo(
    () => calculateAge(formData.dateOfBirth),
    [formData.dateOfBirth],
  );

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const displayPhoto = photoPreview || photoUrl;

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  function updateField(name: keyof MemberFormData, value: string) {
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSubmissionError("Please select an image file.");
      return;
    }
    setSubmissionError("");
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function submitMember() {
    setSubmissionError("");

    if (formData.status === "PGP-GS Roxas City Chapter Officer" && !formData.officerPosition) {
      setSubmissionError("Please select your chapter officer position.");
      return;
    }
    if (
      formData.status === "Former Chapter President" &&
      (!formData.formerPresidentStart || !formData.formerPresidentEnd)
    ) {
      setSubmissionError(
        "Please provide both the date started and date ended as former chapter president.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrl = "";
      let hasPhoto = false;
      if (photoFile) {
        const result = await uploadMemberPhoto(photoFile, fullName);
        uploadedUrl = result.url;
        hasPhoto = true;
      }
      setPhotoUrl(uploadedUrl);

      const response = await fetch("/api/pgpmembers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          age: calculatedAge,
          photoUrl: uploadedUrl || undefined,
          hasPhoto,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        memberId?: string;
      };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save your membership.");
      }
      if (!result.memberId) {
        throw new Error("No member ID was returned.");
      }

      setSubmittedId(result.memberId);
      setShowModal(true);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to save your membership.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }
return (
    <PageShell title="Member Registration">
      <div className="max-w-3xl">
        <p className="max-w-2xl text-base leading-7 text-black/65">
          Enter your personal and membership information below. Your photo is stored
          securely with ImageKit, and your membership ID is generated from the date you
          survived. Thank you for everything you do for Pi Gamma Phi Gamma Sigma.
        </p>

        <form
          className="mt-10 space-y-10"
          onSubmit={(event) => {
            event.preventDefault();
            void submitMember();
          }}
        >
          <Section eyebrow="01 / About you" title="Personal Information">
            <Field label="First Name" name="firstName" value={formData.firstName} onChange={updateField} />
            <Field label="Last Name" name="lastName" value={formData.lastName} onChange={updateField} />
            <Field label="Middle Initial" name="middleInitial" value={formData.middleInitial} onChange={updateField} />
            <Field label="Birthday" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(name, value) => setFormData((current) => ({ ...current, [name]: value, age: calculateAge(value) }))} />
            <Field label="Age" name="age" type="number" value={calculatedAge} placeholder="Auto-generated" disabled hint="Computed automatically from your birthday." onChange={updateField} />
            <Field label="Place of Birth" name="placeOfBirth" value={formData.placeOfBirth} onChange={updateField} />
          </Section>

          <Section eyebrow="02 / Where you live" title="Complete Address">
            <Field label="Street" name="street" value={formData.street} onChange={updateField} />
            <Field label="Barangay" name="barangay" value={formData.barangay} onChange={updateField} />
            <Field label="Municipality / City" name="municipality" value={formData.municipality} onChange={updateField} />
            <Field label="Province" name="province" value={formData.province} onChange={updateField} />
            <Field label="Contact Number" name="contactNumber" type="tel" value={formData.contactNumber} onChange={updateField} />
            <Field label="Email Address" name="email" type="email" value={formData.email} onChange={updateField} />
          </Section>

          <Section eyebrow="03 / Your family contact" title="Guardian's Information">
            <Field label="Full Name" name="guardianName" value={formData.guardianName} onChange={updateField} />
            <Field label="Address" name="guardianAddress" value={formData.guardianAddress} onChange={updateField} />
            <Field label="Contact Number" name="guardianContact" type="tel" value={formData.guardianContact} onChange={updateField} />
          </Section>
<Section
            eyebrow="04 / Your PGPGS journey"
            title="Pi Gamma Phi Gamma Sigma Membership Information"
            description="Share your baptism, survival date, and any role you hold or held in the chapter."
          >
            <Field label="Baptized Name" name="baptizedName" value={formData.baptizedName} onChange={updateField} />
            <Field label="Date Survived" name="dateSurvived" type="date" value={formData.dateSurvived} onChange={updateField} />

            <label className="block text-sm font-semibold text-[var(--green-dark)]">
              Are you:
              <select
                className={selectClass}
                name="status"
                value={formData.status}
                onChange={(event) => updateField("status", event.target.value as MemberFormData["status"])}
                required
              >
                <option>Member</option>
                <option>Alumni</option>
                <option>PGP-GS Roxas City Chapter Officer</option>
                <option>Former Chapter President</option>
                <option>Grand Knights</option>
              </select>
            </label>
          </Section>

          {formData.status === "PGP-GS Roxas City Chapter Officer" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04A / Officer details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">PGP-GS Roxas City Chapter Officer Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)]">
                  Position
                  <select
                    className={selectClass}
                    name="officerPosition"
                    value={formData.officerPosition}
                    onChange={(event) => updateField("officerPosition", event.target.value)}
                    required
                  >
                    <option value="">Select your position</option>
                    {positions.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Date Elected" name="officerDateElected" type="date" value={formData.officerDateElected} onChange={updateField} required />
              </div>
            </section>
          ) : null}

          {formData.status === "Former Chapter President" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04B / Former president details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Chapter President Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Date Started" name="formerPresidentStart" type="date" value={formData.formerPresidentStart} onChange={updateField} required />
                <Field label="Date Ended" name="formerPresidentEnd" type="date" value={formData.formerPresidentEnd} onChange={updateField} required />
              </div>
            </section>
          ) : null}
{/* Photo upload + avatar fallback */}
          <section className="border-t border-black/10 pt-8">
            <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">05 / Your photo</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Profile Photo</h2>
            <div className="mt-5 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <Avatar photo={displayPhoto} fullName={fullName} />

              <div className="flex-1">
                <p className="text-sm leading-6 text-black/60">
                  Upload a clear photo of yourself. If you don{"'"}t upload one, we
                  will show a generated avatar with your initials instead.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded-sm border-2 border-[var(--green)] px-5 py-2.5 text-sm font-semibold text-[var(--green)] transition hover:bg-[var(--green)] hover:text-white"
                  >
                    {photoFile ? "Change photo" : "Upload photo"}
                  </button>
                  {photoFile ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null);
                        if (photoPreview) URL.revokeObjectURL(photoPreview);
                        setPhotoPreview("");
                        setPhotoUrl("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="px-3 py-2 text-sm font-semibold text-red-700 underline underline-offset-4"
                    >
                      Remove photo
                    </button>
                  ) : null}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </div>
                {photoFile ? (
                  <p className="mt-3 text-xs font-medium text-black/45">
                    {photoFile.name} · {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {submissionError ? (
            <p className="max-w-xl text-sm font-semibold text-red-700" role="alert">
              {submissionError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-sm bg-[var(--green)] px-6 py-4 text-sm font-bold tracking-[0.12em] text-white uppercase transition hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
          >
            {isSubmitting ? "Saving your membership..." : "Submit registration"}
          </button>
        </form>

        {showModal ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--green-dark)]/70 px-4 py-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="thankyou-title"
          >
            <div className="flex max-h-full w-full max-w-xl flex-col bg-[var(--background)] shadow-2xl">
              <div className="border-b border-black/10 px-6 py-8 text-center sm:px-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--green-soft)] ring-2 ring-[var(--gold)]">
                  <span className="font-serif text-2xl font-semibold text-[var(--green)]">PG</span>
                </div>
                <p className="mt-5 text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">
                  Membership complete
                </p>
                <h2 id="thankyou-title" className="mt-2 font-serif text-3xl font-semibold text-[var(--green-dark)]">
                  Thank you, brother/sister!
                </h2>
                <p className="mt-4 text-base leading-7 text-black/70">
                  Thank you for always being there for us. Your membership has been
                  recorded and your photo will help us recognize you.
                </p>
              </div>
              <div className="border-y border-black/10 px-6 py-5">
                <p className="text-xs font-bold tracking-[0.16em] text-[var(--green-dark)] uppercase">
                  Your Membership ID
                </p>
                <p className="mt-1 break-all font-mono text-xl font-bold tracking-wide text-[var(--green)]">
                  {submittedId}
                </p>
              </div>
              <div className="px-6 py-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="inline-flex w-full items-center justify-center rounded-sm bg-[var(--green)] px-6 py-3.5 text-sm font-bold tracking-[0.1em] text-white uppercase transition hover:bg-[var(--green-dark)] sm:w-auto"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}