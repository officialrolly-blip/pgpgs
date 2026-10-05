"use client";

import { useActionState, useState } from "react";
import {
  createNeophyteAction,
  type NeophyteActionState,
} from "@/lib/actions/neophyte-actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-a-border bg-white px-3 py-2 text-sm text-a-text outline-none transition placeholder:text-a-muted focus:border-a-brand focus:ring-2 focus:ring-a-brand/15";

type TextFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string;
};

function TextField({ label, name, required, type = "text", defaultValue }: TextFieldProps) {
  return (
    <label className="block text-sm font-semibold text-a-secondary">
      {label}
      <input
        className={inputClass}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

/**
 * Create form for the Neophyte Status module.
 *
 * `lockedChapter` is the viewer's own chapter: when set, the record is
 * guaranteed to land there (the server forces it regardless of what is posted),
 * and the field is not editable. Province-wide accounts get the dropdown of
 * published chapters instead.
 */
export default function NeophyteCreateForm({
  lockedChapter,
  chapters,
}: {
  lockedChapter: string | null;
  chapters: string[];
}) {
  const [state, formAction, isPending] = useActionState<NeophyteActionState, FormData>(
    createNeophyteAction,
    {},
  );
  const [age, setAge] = useState("");

  return (
    <form action={formAction} className="a-card p-5 sm:p-6">
      <h2 className="font-semibold text-a-text">Neophyte details</h2>
      <p className="mt-1 text-sm text-a-muted">
        New records always enter the formation pipeline at Orientation.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="First name" name="firstName" required />
        <TextField label="Middle initial" name="middleInitial" />
        <TextField label="Last name" name="lastName" required />

        <label className="block text-sm font-semibold text-a-secondary">
          Age
          <input
            className={inputClass}
            name="age"
            type="number"
            min={1}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            onBlur={() => {
              if (!age) return;
              const born = new Date();
              born.setFullYear(born.getFullYear() - Number(age));
              const input = document.querySelector<HTMLInputElement>('[name="dateOfBirth"]');
              if (input && !input.value) {
                input.value = born.toISOString().slice(0, 10);
              }
            }}
            required
          />
        </label>
        <TextField label="Date of birth" name="dateOfBirth" type="date" required />
        <TextField label="Place of birth" name="placeOfBirth" required />

        <TextField label="Street" name="street" required />
        <TextField label="Barangay" name="barangay" required />
        <TextField label="Municipality" name="municipality" required />
        <TextField label="Province" name="province" defaultValue="Capiz" required />
      </div>

      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-a-muted">
        Guardian information
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Guardian name" name="guardianName" required />
        <TextField label="Guardian address" name="guardianAddress" required />
        <TextField label="Guardian contact" name="guardianContact" required />
      </div>

      <h3 className="mt-7 text-sm font-bold uppercase tracking-wide text-a-muted">
        Contact &amp; chapter
      </h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField label="Email address" name="email" type="email" required />
        <TextField label="Contact number" name="contactNumber" required />
        <TextField label="Baptized name" name="baptizedName" />
        {lockedChapter ? (
          <label className="block text-sm font-semibold text-a-secondary">
            Chapter
            <input
              className={`${inputClass} cursor-not-allowed bg-black/5`}
              value={lockedChapter}
              readOnly
              disabled
            />
            <span className="mt-1 block text-xs font-medium text-a-muted">
              Fixed to your assigned chapter.
            </span>
          </label>
        ) : (
          <label className="block text-sm font-semibold text-a-secondary">
            Chapter
            <select className={inputClass} name="memberChapter" defaultValue="" required>
              <option value="" disabled>
                Select a chapter
              </option>
              {chapters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {state.error ? (
        <p className="mt-5 text-sm font-medium text-a-danger" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={isPending} className="a-btn a-btn-primary">
          {isPending ? "Saving…" : "Add neophyte"}
        </button>
      </div>
    </form>
  );
}