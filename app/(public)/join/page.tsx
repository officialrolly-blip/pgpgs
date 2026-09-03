"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import PageShell from "@/components/page-shell";

type RegistrationData = {
  firstName: string; lastName: string; middleInitial: string; age: string;
  gender: string; dateOfBirth: string; placeOfBirth: string; street: string;
  barangay: string; municipality: string; province: string; guardianName: string;
  guardianAddress: string; guardianContact: string; guardianRelationship: string;
  studying: string; schoolName: string; schoolAddress: string; schoolYear: string;
  educationalAttainment: string; email: string; contactNumber: string;
  password: string; verifyPassword: string;
};

const initialData: RegistrationData = {
  firstName: "", lastName: "", middleInitial: "", age: "", gender: "",
  dateOfBirth: "", placeOfBirth: "", street: "", barangay: "", municipality: "",
  province: "", guardianName: "", guardianAddress: "", guardianContact: "",
  guardianRelationship: "", studying: "", schoolName: "", schoolAddress: "",
  schoolYear: "", educationalAttainment: "", email: "", contactNumber: "",
  password: "", verifyPassword: "",
};

const inputClass = "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15";

function capitalizeWords(value: string) {
  return value.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);
}

function Field({ label, name, value, onChange, type = "text", required = true }: {
  label: string; name: keyof RegistrationData; value: string;
  onChange: (name: keyof RegistrationData, value: string) => void;
  type?: string; required?: boolean;
}) {
  function handleChange(value: string) {
    if (name === "middleInitial") {
      onChange(name, value.replace(/[^a-z]/gi, "").slice(0, 1).toUpperCase());
      return;
    }

    onChange(name, type === "text" ? capitalizeWords(value) : value);
  }

  return <label className="block text-sm font-semibold text-[var(--green-dark)]">{label}<input className={inputClass} name={name} type={type} value={value} maxLength={name === "middleInitial" ? 1 : undefined} onChange={(event) => handleChange(event.target.value)} required={required} /></label>;
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="border-t border-black/10 pt-8"><p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">{eyebrow}</p><h2 className="mt-2 font-serif text-2xl font-semibold text-[var(--green-dark)]">{title}</h2><div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div></section>;
}

function getPasswordStrength(password: string) {
  const score = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z\d]/.test(password),
  ].filter(Boolean).length;

  if (!password) return { label: "Enter a password", width: "w-0", color: "bg-black/10" };
  if (score <= 2) return { label: "Weak", width: "w-1/3", color: "bg-red-600" };
  if (score <= 4) return { label: "Good", width: "w-2/3", color: "bg-[var(--gold)]" };
  return { label: "Strong", width: "w-full", color: "bg-[var(--green)]" };
}

function calculateAge(dateOfBirth: string) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (!dateOfBirth || Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) age -= 1;
  return age >= 0 ? String(age) : "";
}

export default function JoinPage() {
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [memberId, setMemberId] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const passwordStrength = getPasswordStrength(formData.password);
  const passwordsMismatch = Boolean(formData.verifyPassword) && formData.password !== formData.verifyPassword;
  const calculatedAge = calculateAge(formData.dateOfBirth);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  function updateField(name: keyof RegistrationData, value: string) {
    setFormData((current) => ({ ...current, [name]: value }));
  }

    async function createPdf(registrationMemberId: string) {
    const pdf = new jsPDF();
    const fullName = `${formData.firstName} ${formData.middleInitial} ${formData.lastName}`;

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const cardW = pageWidth - margin * 2;
    let y = margin;

    // === Page Background ===
    pdf.setFillColor(246, 243, 234);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    // === Outer Green Frame ===
    pdf.setDrawColor(27, 92, 56);
    pdf.setLineWidth(1.5);
    pdf.roundedRect(margin, margin, cardW, pageHeight - margin * 2, 4, 4, "S");

    // === Gold Dashed Inner Frame ===
    pdf.setDrawColor(201, 162, 39);
    pdf.setLineWidth(0.6);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.roundedRect(margin + 3, margin + 3, cardW - 6, pageHeight - margin * 2 - 6, 3, 3, "S");
    pdf.setLineDashPattern([], 0);

    // === Header Banner (Army Green) ===
    const headerH = 38;
    pdf.setFillColor(75, 83, 32);
    pdf.roundedRect(margin, y, cardW, headerH, 3, 3, "F");

    // Logo
    try {
      const response = await fetch("/logo2.png");
      const blob = await response.blob();
      const logoData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const logoW = 52;
      const logoH = (logoW * 199) / 1017;
      pdf.addImage(logoData, "PNG", margin + (cardW - logoW) / 2, y + 5, logoW, logoH);
    } catch {}

    // Chapter name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(15);
    pdf.setFont("helvetica", "bold");
    pdf.text("PI GAMMA PHI", pageWidth / 2, y + 23, { align: "center" });

    pdf.setTextColor(201, 162, 39);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("GAMMA SIGMA", pageWidth / 2, y + 34, { align: "center" });

    // Gold stripe below header
    pdf.setFillColor(201, 162, 39);
    pdf.rect(margin, y + headerH, cardW, 2, "F");

    // Form subtitle
    pdf.setTextColor(75, 83, 32);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("Membership Registration Form", pageWidth / 2, y + headerH + 7, { align: "center" });

    y += headerH + 10;

    // === Member ID Badge ===
    const badgeH = 16;
    const badgeW = 90;
    const badgeX = (pageWidth - badgeW) / 2;
    pdf.setFillColor(231, 240, 234);
    pdf.setDrawColor(201, 162, 39);
    pdf.setLineWidth(1.2);
    pdf.roundedRect(badgeX, y, badgeW, badgeH, 3, 3, "FD");

    // Gold accent ellipses
    pdf.setFillColor(201, 162, 39);
    pdf.ellipse(badgeX + 8, y + badgeH / 2, 1.5, 1.5, "F");
    pdf.ellipse(badgeX + badgeW - 8, y + badgeH / 2, 1.5, 1.5, "F");

    // Badge label
    pdf.setTextColor(75, 83, 32);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("MEMBER'S ID NUMBER", badgeX + badgeW / 2, y + 5.5, { align: "center" });

    // Member ID
    pdf.setTextColor(15, 61, 38);
    pdf.setFontSize(15);
    pdf.setFont("helvetica", "bold");
    pdf.text(registrationMemberId, badgeX + badgeW / 2, y + 14, { align: "center" });

    y += badgeH + 6;

    // === Section Helper ===
    const labelX = margin + 6;
    const valueX = margin + 46;
    const valueMaxW = cardW - 56;
    const rowLineHeight = 4.83;

    const drawSection: (title: string, entries: { label: string; value: string }[]) => void = (title, entries) => {
      // Section header bar
      pdf.setFillColor(27, 92, 56);
      pdf.roundedRect(margin, y, cardW, 8, 1.5, 1.5, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(title.toUpperCase(), margin + cardW / 2, y + 5.3, { align: "center" });
      y += 8;

      // Measure entries for content height
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      let contentH = 5;
      const rowHeights: number[] = [];
      for (const entry of entries) {
        const val = entry.value || "-";
        const lines = pdf.splitTextToSize(val, valueMaxW);
        const h = lines.length * rowLineHeight + 2.5;
        rowHeights.push(h);
        contentH += h;
      }
      contentH += 4;

      // Content card
      pdf.setFillColor(231, 240, 234);
      pdf.setDrawColor(201, 162, 39);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(margin, y, cardW, contentH, 2, 2, "FD");

      // Gold accent line at top of card
      pdf.setDrawColor(201, 162, 39);
      pdf.setLineWidth(0.5);
      pdf.line(margin + 2, y + 0.5, margin + cardW - 2, y + 0.5);

      // Draw entries
      let rowY = y + 4;
      entries.forEach((entry, i) => {
        // Label
        pdf.setTextColor(75, 83, 32);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        const label = `${entry.label}:`;
        const labelLines = pdf.splitTextToSize(label, 34);
        pdf.text(labelLines, labelX, rowY + 2.5, { lineHeightFactor: 0.7 });

        // Value
        pdf.setTextColor(17, 17, 17);
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "normal");
        const val = entry.value || "-";
        const lines = pdf.splitTextToSize(val, valueMaxW);
        pdf.text(lines, valueX, rowY + 2.5, { lineHeightFactor: 0.6 });

        // Separator line
        if (i < entries.length - 1) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.15);
          pdf.line(margin + 3, rowY + rowHeights[i], margin + cardW - 3, rowY + rowHeights[i]);
        }
        rowY += rowHeights[i];
      });

      y += contentH + 3;
    };

    // Sections
    drawSection("Personal Information", [
      { label: "Full Name", value: fullName },
      { label: "Age / Gender", value: `${formData.age} / ${formData.gender}` },
      { label: "Date of Birth", value: formData.dateOfBirth },
      { label: "Place of Birth", value: formData.placeOfBirth },
      { label: "Complete Address", value: `${formData.street}, ${formData.barangay}, ${formData.municipality}, ${formData.province}` },
    ]);

    drawSection("Guardian Information", [
      { label: "Full Name", value: formData.guardianName },
      { label: "Complete Address", value: formData.guardianAddress },
      { label: "Contact Number", value: formData.guardianContact },
      { label: "Relationship", value: formData.guardianRelationship },
    ]);

    drawSection("Education", [
      { label: "Still Studying", value: formData.studying },
      { label: "School Name", value: formData.schoolName },
      { label: "School Address", value: formData.schoolAddress },
      { label: "Year / Attainment", value: `${formData.schoolYear || "-"} / ${formData.educationalAttainment || "-"}` },
    ]);

    drawSection("Contact Details", [
      { label: "Email Address", value: formData.email },
      { label: "Contact Number", value: formData.contactNumber },
    ]);

    // === Footer ===
    pdf.setDrawColor(201, 162, 39);
    pdf.setLineWidth(0.6);
    pdf.setLineDashPattern([3, 2], 0);
    pdf.line(margin, y, margin + cardW, y);
    pdf.setLineDashPattern([], 0);

    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "italic");
    const note = "Please bring this registration file and present it to the chapter officers.";
    const noteLines = pdf.splitTextToSize(note, cardW - 10);
    pdf.text(noteLines, margin + cardW / 2, y + 5 + (noteLines.length - 1) * 5, { align: "center", lineHeightFactor: 0.8 });

    const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    pdf.setTextColor(75, 83, 32);
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Generated on ${dateStr}`, margin + cardW / 2, y + 12 + noteLines.length * 3, { align: "center" });

    // Page number
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "italic");
    pdf.text("Page 1 of 1", pageWidth - margin, pageHeight - margin, { align: "right" });

    return URL.createObjectURL(pdf.output("blob"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const verifyPassword = event.currentTarget.querySelector<HTMLInputElement>("[name=verifyPassword]");
    if (formData.password !== formData.verifyPassword) { verifyPassword?.setCustomValidity("Passwords do not match."); event.currentTarget.reportValidity(); return; }
    verifyPassword?.setCustomValidity(""); setIsSubmitting(true); setSubmissionError("");

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = (await response.json()) as { error?: string; memberId?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to save your registration.");
      if (!result.memberId) throw new Error("Registration was saved without a member ID. Please contact the chapter officers.");
      setMemberId(result.memberId);
      const url = await createPdf(result.memberId);
      setPdfUrl(url);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Unable to save your registration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell title="Be one of us!">
      <div className="max-w-3xl">
        <p className="max-w-2xl text-base leading-7 text-black/65">Begin your membership application with the Roxas City Capiz Chapter. Complete the form carefully so our officers can assist you promptly.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3 border border-[var(--gold)]/35 bg-[var(--gold)]/10 px-4 py-3 text-sm text-[var(--green-dark)]">
          <span>Already registered?</span>
          <a href="/join/status" className="font-bold text-[var(--green)] underline decoration-[var(--gold)] underline-offset-4 hover:text-[var(--green-dark)]">Check your application status</a>
        </div>
        <form className="mt-10 space-y-10" onSubmit={handleSubmit}>
          <Section eyebrow="01 / Personal details" title="Personal Information"><Field label="First Name" name="firstName" value={formData.firstName} onChange={updateField} /><Field label="Last Name" name="lastName" value={formData.lastName} onChange={updateField} /><Field label="Middle I." name="middleInitial" value={formData.middleInitial} onChange={updateField} required={false} /><label className="block text-sm font-semibold text-[var(--green-dark)]">Age<input className={`${inputClass} bg-black/[0.03] text-black/60`} name="age" type="number" value={calculatedAge} placeholder="Calculated from birthday" readOnly required aria-describedby="age-help" /><span id="age-help" className="mt-2 block text-xs font-medium text-black/45">Your age is calculated automatically.</span></label><label className="block text-sm font-semibold text-[var(--green-dark)]">Gender<select className={inputClass} name="gender" value={formData.gender} onChange={(event) => updateField("gender", event.target.value)} required><option value="">Select gender</option><option>Female</option><option>Male</option><option>Prefer not to say</option></select></label><Field label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(name, value) => setFormData((current) => ({ ...current, [name]: value, age: calculateAge(value) }))} /><Field label="Place of Birth" name="placeOfBirth" value={formData.placeOfBirth} onChange={updateField} /></Section>
          <Section eyebrow="02 / Where you live" title="Current Address"><Field label="Street" name="street" value={formData.street} onChange={updateField} /><Field label="Barangay" name="barangay" value={formData.barangay} onChange={updateField} /><Field label="Municipality / City" name="municipality" value={formData.municipality} onChange={updateField} /><Field label="Province" name="province" value={formData.province} onChange={updateField} /></Section>
          <Section eyebrow="03 / Your family contact" title="Guardian Information"><Field label="Full Name" name="guardianName" value={formData.guardianName} onChange={updateField} /><Field label="Complete Address" name="guardianAddress" value={formData.guardianAddress} onChange={updateField} /><Field label="Contact Number" name="guardianContact" value={formData.guardianContact} onChange={updateField} /><label className="block text-sm font-semibold text-[var(--green-dark)]">Relationship<select className={inputClass} name="guardianRelationship" value={formData.guardianRelationship} onChange={(event) => updateField("guardianRelationship", event.target.value)} required><option value="">Select relationship</option><option>Parent</option><option>Spouse</option><option>Sibling</option><option>Grandparent</option><option>Relative</option><option>Legal Guardian</option><option>Other</option></select></label></Section>
          <Section eyebrow="04 / Education" title="Education Information"><label className="block text-sm font-semibold text-[var(--green-dark)] sm:col-span-2">Are you still studying?<select className={inputClass} name="studying" value={formData.studying} onChange={(event) => updateField("studying", event.target.value)} required><option value="">Select an answer</option><option>Yes</option><option>No</option></select></label>{formData.studying === "Yes" ? <><Field label="Name of School" name="schoolName" value={formData.schoolName} onChange={updateField} /><Field label="School Address" name="schoolAddress" value={formData.schoolAddress} onChange={updateField} /><Field label="Year" name="schoolYear" value={formData.schoolYear} onChange={updateField} /></> : null}{formData.studying === "No" ? <><Field label="Please enter the name of your school" name="schoolName" value={formData.schoolName} onChange={updateField} /><label className="block text-sm font-semibold text-[var(--green-dark)]">Educational Attainment<select className={inputClass} name="educationalAttainment" value={formData.educationalAttainment} onChange={(event) => updateField("educationalAttainment", event.target.value)} required><option value="">Select attainment</option><option>College</option><option>College Undergraduate</option><option>Senior High School Graduate</option><option>High School Graduate</option><option>High School Undergraduate</option></select></label></> : null}</Section>
          <Section eyebrow="05 / Create your account" title="Contact & Security"><Field label="Email Address" name="email" type="email" value={formData.email} onChange={updateField} /><Field label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={updateField} /><label className="block text-sm font-semibold text-[var(--green-dark)]">Password<input className={inputClass} name="password" type="password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} minLength={8} required aria-describedby="password-strength" /><span id="password-strength" className="mt-2 block text-xs font-medium text-black/55">Strength: <strong className="text-[var(--green-dark)]">{passwordStrength.label}</strong><span className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-black/10" aria-hidden="true"><span className={`block transition-all ${passwordStrength.width} ${passwordStrength.color}`} /></span><span className="mt-2 block">Use at least 8 characters with uppercase, lowercase, a number, and a symbol.</span></span></label><label className="block text-sm font-semibold text-[var(--green-dark)]">Verify Password<input className={`${inputClass} ${passwordsMismatch ? "border-red-600 focus:border-red-600 focus:ring-red-600/15" : ""}`} name="verifyPassword" type="password" value={formData.verifyPassword} onChange={(event) => updateField("verifyPassword", event.target.value)} required aria-invalid={passwordsMismatch} aria-describedby="password-match" />{passwordsMismatch ? <span id="password-match" className="mt-2 block text-xs font-semibold text-red-700" role="alert">Passwords do not match.</span> : <span id="password-match" className="mt-2 block text-xs text-black/45">Enter the same password again.</span>}</label></Section>
          {submissionError ? <p className="max-w-xl text-sm font-semibold text-red-700" role="alert">{submissionError}</p> : null}
          <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-sm bg-[var(--green)] px-6 py-4 text-sm font-bold tracking-[0.12em] text-white uppercase transition hover:bg-[var(--green-dark)] disabled:cursor-wait disabled:opacity-70 sm:w-auto">{isSubmitting ? "Saving registration..." : "Register now"}</button>
        </form>
      </div>
      {pdfUrl ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--green-dark)]/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="success-title"><div className="flex max-h-full w-full max-w-2xl flex-col bg-[var(--background)] shadow-2xl"><div className="border-b border-black/10 px-6 py-6 sm:px-8"><p className="text-xs font-bold tracking-[0.2em] text-[var(--gold)] uppercase">Registration complete</p><h2 id="success-title" className="mt-2 font-serif text-3xl font-semibold text-[var(--green-dark)] sm:text-4xl">Congratulations!</h2><p className="mt-3 text-sm leading-6 text-black/65">Review your registration details below. Bring the downloaded form and present it to the chapter officers.</p></div><div className="overflow-y-auto px-6 py-6 sm:px-8"><div className="border border-[var(--gold)]/50 bg-[var(--gold)]/10 p-4"><p className="text-xs font-bold tracking-[0.16em] text-[var(--green-dark)] uppercase">Member&apos;s ID Number</p><p className="mt-1 font-mono text-xl font-bold tracking-wide text-[var(--green)]">{memberId}</p></div><div className="mt-6 grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-bold tracking-[0.16em] text-[var(--gold)] uppercase">Personal Information</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline text-black/50">Name: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.firstName} {formData.middleInitial} {formData.lastName}</dd></div><div><dt className="inline text-black/50">Age / Gender: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.age} / {formData.gender}</dd></div><div><dt className="inline text-black/50">Birthday: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.dateOfBirth}</dd></div><div><dt className="inline text-black/50">Place of birth: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.placeOfBirth}</dd></div></dl></div><div><p className="text-xs font-bold tracking-[0.16em] text-[var(--gold)] uppercase">Current Address</p><p className="mt-3 text-sm font-semibold leading-6 text-[var(--green-dark)]">{formData.street}, {formData.barangay}, {formData.municipality}, {formData.province}</p></div><div><p className="text-xs font-bold tracking-[0.16em] text-[var(--gold)] uppercase">Guardian Information</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline text-black/50">Name: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.guardianName}</dd></div><div><dt className="inline text-black/50">Address: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.guardianAddress}</dd></div><div><dt className="inline text-black/50">Contact: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.guardianContact}</dd></div><div><dt className="inline text-black/50">Relationship: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.guardianRelationship}</dd></div></dl></div><div><p className="text-xs font-bold tracking-[0.16em] text-[var(--gold)] uppercase">Education</p><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline text-black/50">Still studying: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.studying}</dd></div><div><dt className="inline text-black/50">School: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.schoolName}</dd></div>{formData.schoolAddress ? <div><dt className="inline text-black/50">School address: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.schoolAddress}</dd></div> : null}{formData.schoolYear ? <div><dt className="inline text-black/50">Year: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.schoolYear}</dd></div> : null}{formData.educationalAttainment ? <div><dt className="inline text-black/50">Attainment: </dt><dd className="inline font-semibold text-[var(--green-dark)]">{formData.educationalAttainment}</dd></div> : null}</dl></div><div className="sm:col-span-2"><p className="text-xs font-bold tracking-[0.16em] text-[var(--gold)] uppercase">Contact Details</p><p className="mt-3 text-sm font-semibold text-[var(--green-dark)]">{formData.email} <span className="mx-2 text-black/25">|</span> {formData.contactNumber}</p></div></div></div><div className="border-t border-black/10 px-6 py-5 sm:px-8"><a href={pdfUrl} download="PGPGS-registration.pdf" className="inline-flex w-full items-center justify-center rounded-sm bg-[var(--green)] px-5 py-4 text-sm font-bold tracking-[0.1em] text-white uppercase transition hover:bg-[var(--green-dark)]">Download registration PDF</a><button type="button" onClick={() => setPdfUrl("")} className="mt-3 w-full px-5 py-2 text-sm font-semibold text-[var(--green)] underline underline-offset-4">Close</button></div></div></div> : null}
    </PageShell>
  );
}
