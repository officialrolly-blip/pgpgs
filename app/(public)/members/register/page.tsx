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

const vicePresidentRoles = [
  "VP For Internal",
  "VP For External",
] as const;

const masterInitiatorRoles = [
  "Master Initiator I",
  "Master Initiator II",
  "Master Initiator III",
  "Master Initiator IV",
] as const;

const ladyInitiatorRoles = [
  "Lady Initiator I",
  "Lady Initiator II",
  "Lady Initiator III",
  "Lady Initiator IV",
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
    | "Former Chapter Vice President"
    | "Former Chapter Master Initiator"
    | "Former Chapter Lady Initiator"
    | "Former Grand Knight"
    | "Elected Grand Knight"
    | "Chapter Organizer";
  memberChapter: string;
  chapterOrganizerChapter: string;
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
  grandKnightStart: string;
  grandKnightEnd: string;
  grandKnightChapter: string;
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
  memberChapter: "",
  chapterOrganizerChapter: "",
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
  grandKnightStart: "",
  grandKnightEnd: "",
  grandKnightChapter: "",
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
  const [chapters, setChapters] = useState<Array<{ id: string; name: string; address: string; organizer: string }>>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
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

  useEffect(() => {
    async function fetchChapters() {
      try {
        const response = await fetch("/api/chapters");
        const data = (await response.json()) as { chapters: Array<{ id: string; name: string; address: string; organizer: string }> };
        if (response.ok && data.chapters) {
          setChapters(data.chapters);
        }
      } catch (error) {
        console.error("Failed to fetch chapters:", error);
      } finally {
        setChaptersLoading(false);
      }
    }
    void fetchChapters();
  }, []);

  /** Renders a chapter dropdown's placeholder plus its options, showing a loading state while chapters are being fetched. */
  function renderChapterOptions(placeholder: string) {
    return (
      <>
        {chaptersLoading ? (
          <option value="" disabled>
            Loading chapters...
          </option>
        ) : (
          <option value="">{placeholder}</option>
        )}
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.name}>
            {chapter.name}
          </option>
        ))}
      </>
    );
  }

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

  /** Clears the entire registration back to its empty state after a successful submission. */
  function resetForm() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setFormData({ ...initialData });
    setPhotoFile(null);
    setPhotoPreview("");
    setPhotoUrl("");
    setSubmissionError("");
    setSubmittedId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowModal(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitMember() {
    setSubmissionError("");

    if ((formData.status === "Member" || formData.status === "Alumni") && !formData.memberChapter) {
      setSubmissionError(
        "Please select a chapter.",
      );
      return;
    }
    if (formData.status === "PGP-GS Roxas City Chapter Officer" && !formData.officerPosition) {
      setSubmissionError("Please select your chapter officer position.");
      return;
    }
    if (
      formData.status === "Former Chapter Vice President" &&
      (!formData.formerVicePresidentChapter ||
        !formData.formerVicePresidentRole ||
        !formData.formerVicePresidentStart ||
        !formData.formerVicePresidentEnd)
    ) {
      setSubmissionError(
        "Please provide the role, chapter, and both the date started and date ended as former chapter vice president.",
      );
      return;
    }
    if (
      formData.status === "Former Chapter President" &&
      (!formData.formerPresidentChapter ||
        !formData.formerPresidentStart ||
        !formData.formerPresidentEnd)
    ) {
      setSubmissionError(
        "Please provide both the date started and date ended as former chapter president.",
      );
      return;
    }
    if (formData.status === "Former Chapter Master Initiator" && !formData.formerMasterInitiatorRole) {
      setSubmissionError("Please select your Master Initiator role.");
      return;
    }
    if (formData.status === "Former Chapter Master Initiator" && !formData.formerMasterInitiatorChapter) {
      setSubmissionError("Please select your PGPGS chapter.");
      return;
    }
    if (
      formData.status === "Former Chapter Master Initiator" &&
      (!formData.formerMasterInitiatorStart || !formData.formerMasterInitiatorEnd)
    ) {
      setSubmissionError(
        "Please provide both the date started and date ended as former chapter Master Initiator.",
      );
      return;
    }
    if (formData.status === "Former Chapter Lady Initiator" && !formData.formerLadyInitiatorRole) {
      setSubmissionError("Please select your Lady Initiator role.");
      return;
    }
    if (formData.status === "Former Chapter Lady Initiator" && !formData.formerLadyInitiatorChapter) {
      setSubmissionError("Please select your PGPGS chapter.");
      return;
    }
    if (
      formData.status === "Former Chapter Lady Initiator" &&
      (!formData.formerLadyInitiatorStart || !formData.formerLadyInitiatorEnd)
    ) {
      setSubmissionError(
        "Please provide both the date started and date ended as former chapter Lady Initiator.",
      );
      return;
    }
    if (
      formData.status === "Former Grand Knight" &&
      (!formData.grandKnightStart || !formData.grandKnightEnd)
    ) {
      setSubmissionError("Please provide both the date started and date ended as former Grand Knight.");
      return;
    }
    if (
      (formData.status === "Former Grand Knight" || formData.status === "Elected Grand Knight") &&
      !formData.grandKnightChapter
    ) {
      setSubmissionError("Please select the PGPGS chapter for your Grand Knight role.");
      return;
    }
    if (formData.status === "Chapter Organizer" && !formData.chapterOrganizerChapter) {
      setSubmissionError("Please select the PGPGS chapter you organize.");
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
            <Field label="Middle Initial (optional)" name="middleInitial" value={formData.middleInitial} onChange={updateField} required={false} hint="Leave blank if you don't have a middle name." />
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
                <option>Former Chapter Vice President</option>
                <option>Former Chapter Master Initiator</option>
                <option>Former Chapter Lady Initiator</option>
                <option>Former Grand Knight</option>
                <option>Elected Grand Knight</option>
                <option>Chapter Organizer</option>
              </select>
            </label>
          </Section>

          {formData.status === "Former Grand Knight" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04F / Former Grand Knight details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Grand Knight Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select className={selectClass} name="grandKnightChapter" value={formData.grandKnightChapter} onChange={(event) => updateField("grandKnightChapter", event.target.value)} required>
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
                <Field label="Date Started" name="grandKnightStart" type="date" value={formData.grandKnightStart} onChange={updateField} required />
                <Field label="Date Ended" name="grandKnightEnd" type="date" value={formData.grandKnightEnd} onChange={updateField} required />
              </div>
            </section>
          ) : null}

          {formData.status === "Elected Grand Knight" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04G / Elected Grand Knight details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Elected Grand Knight Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select className={selectClass} name="grandKnightChapter" value={formData.grandKnightChapter} onChange={(event) => updateField("grandKnightChapter", event.target.value)} required>
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          {formData.status === "Chapter Organizer" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04H / Chapter Organizer details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Chapter Organizer Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select className={selectClass} name="chapterOrganizerChapter" value={formData.chapterOrganizerChapter} onChange={(event) => updateField("chapterOrganizerChapter", event.target.value)} required>
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          {(formData.status === "Member" || formData.status === "Alumni") ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04A / Member details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Chapter Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  What PGPGS Chapter did you survive?
                  <select
                    className={selectClass}
                    name="memberChapter"
                    value={formData.memberChapter}
                    onChange={(event) => updateField("memberChapter", event.target.value)}
                    required
                  >
                    {renderChapterOptions("Select a chapter")}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

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

          {formData.status === "Former Chapter Master Initiator" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04C / Former Master Initiator details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Chapter Master Initiator Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select
                    className={selectClass}
                    name="formerMasterInitiatorChapter"
                    value={formData.formerMasterInitiatorChapter}
                    onChange={(event) => updateField("formerMasterInitiatorChapter", event.target.value)}
                    required
                  >
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[var(--green-dark)]">
                  Role
                  <select
                    className={selectClass}
                    name="formerMasterInitiatorRole"
                    value={formData.formerMasterInitiatorRole}
                    onChange={(event) => updateField("formerMasterInitiatorRole", event.target.value)}
                    required
                  >
                    <option value="">Select your role</option>
                    {masterInitiatorRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Date Started" name="formerMasterInitiatorStart" type="date" value={formData.formerMasterInitiatorStart} onChange={updateField} required />
                <Field label="Date Ended" name="formerMasterInitiatorEnd" type="date" value={formData.formerMasterInitiatorEnd} onChange={updateField} required />
              </div>
            </section>
          ) : null}

          {formData.status === "Former Chapter Lady Initiator" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04D / Former Lady Initiator details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Chapter Lady Initiator Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select
                    className={selectClass}
                    name="formerLadyInitiatorChapter"
                    value={formData.formerLadyInitiatorChapter}
                    onChange={(event) => updateField("formerLadyInitiatorChapter", event.target.value)}
                    required
                  >
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[var(--green-dark)]">
                  Role
                  <select
                    className={selectClass}
                    name="formerLadyInitiatorRole"
                    value={formData.formerLadyInitiatorRole}
                    onChange={(event) => updateField("formerLadyInitiatorRole", event.target.value)}
                    required
                  >
                    <option value="">Select your role</option>
                    {ladyInitiatorRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Date Started" name="formerLadyInitiatorStart" type="date" value={formData.formerLadyInitiatorStart} onChange={updateField} required />
                <Field label="Date Ended" name="formerLadyInitiatorEnd" type="date" value={formData.formerLadyInitiatorEnd} onChange={updateField} required />
              </div>
            </section>
          ) : null}

          {formData.status === "Former Chapter President" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04B / Former president details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Chapter President Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">
                  PGPGS Chapter
                  <select
                    className={selectClass}
                    name="formerPresidentChapter"
                    value={formData.formerPresidentChapter}
                    onChange={(event) => updateField("formerPresidentChapter", event.target.value)}
                    required
                  >
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
                <Field label="Date Started" name="formerPresidentStart" type="date" value={formData.formerPresidentStart} onChange={updateField} required />
                <Field label="Date Ended" name="formerPresidentEnd" type="date" value={formData.formerPresidentEnd} onChange={updateField} required />
              </div>
            </section>
          ) : null}

          {formData.status === "Former Chapter Vice President" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">04E / Former vice president details</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">Former Chapter Vice President Information</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-[var(--green-dark)]">
                  PGPGS Chapter
                  <select
                    className={selectClass}
                    name="formerVicePresidentChapter"
                    value={formData.formerVicePresidentChapter}
                    onChange={(event) => updateField("formerVicePresidentChapter", event.target.value)}
                    required
                  >
                    {renderChapterOptions("Select chapter")}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-[var(--green-dark)]">
                  Role
                  <select
                    className={selectClass}
                    name="formerVicePresidentRole"
                    value={formData.formerVicePresidentRole}
                    onChange={(event) => updateField("formerVicePresidentRole", event.target.value)}
                    required
                  >
                    <option value="">Select your role</option>
                    {vicePresidentRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>
                <Field label="Date Started" name="formerVicePresidentStart" type="date" value={formData.formerVicePresidentStart} onChange={updateField} required />
                <Field label="Date Ended" name="formerVicePresidentEnd" type="date" value={formData.formerVicePresidentEnd} onChange={updateField} required />
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
                  onClick={resetForm}
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