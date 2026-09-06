"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  submitContactMessageAction,
  type ContactFormState,
} from "@/lib/actions/contact-actions";

const initialState: ContactFormState = {};

const labelClass =
  "block text-xs font-semibold uppercase tracking-[0.14em] text-black/60";

const inputClass =
  "mt-2 w-full rounded-sm border border-black/15 bg-white px-3 py-3 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15 disabled:bg-black/[0.04] disabled:text-black/50";

export default function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactMessageAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields once a message was stored so the form is ready for another one.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative w-full max-w-xl border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(15,61,38,0.12)] sm:p-8"
    >
      {/* Honeypot field — hidden from real users, catches spam bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/55">
        Send us a message
      </p>
      <p className="mt-2 text-sm leading-6 text-black/65">
        Fill out the form below and the chapter will reply through your email.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Full name <span className="text-black/40">*</span>
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            maxLength={120}
            disabled={isPending}
            autoComplete="name"
            placeholder="Juan Dela Cruz"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email address <span className="text-black/40">*</span>
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={254}
            disabled={isPending}
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-number" className={labelClass}>
            Contact number <span className="text-black/40">(optional)</span>
          </label>
          <input
            id="contact-number"
            name="contactNumber"
            type="tel"
            disabled={isPending}
            autoComplete="tel"
            placeholder="0917 000 0000"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className={labelClass}>
            Subject <span className="text-black/40">(optional)</span>
          </label>
          <input
            id="contact-subject"
            name="subject"
            type="text"
            maxLength={150}
            disabled={isPending}
            placeholder="Membership, programs, …"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={labelClass}>
          Message <span className="text-black/40">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={4000}
          disabled={isPending}
          placeholder="How can we help you?"
          className={`${inputClass} resize-y`}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="mt-5 border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="mt-5 border-l-4 border-[var(--green)] bg-[var(--green)]/10 px-4 py-3 text-sm font-medium text-[var(--green-dark)]"
        >
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex w-full items-center justify-center gap-3 bg-[var(--green-dark)] px-6 py-3.5 text-sm font-semibold tracking-wide text-white transition hover:bg-[var(--green)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--green-dark)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isPending ? (
          <>
            <span
              className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
            Sending…
          </>
        ) : (
          <>
            Send message
            <span aria-hidden="true" className="text-lg leading-none">→</span>
          </>
        )}
      </button>
    </form>
  );
}