"use client";

import { useState } from "react";

export default function NeophyteWelcomeModal({ certificateHref }: { certificateHref: string }) {
  const [open, setOpen] = useState(true);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-a-brand-dark/70 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(16,24,40,0.3)]">
        <div className="bg-a-brand px-6 py-8 text-center text-white sm:px-10">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close welcome message" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white">×</button>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-a-gold/60 bg-a-gold text-2xl font-bold text-a-brand-dark">★</div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-a-gold-light">Formation complete</p>
          <h2 id="welcome-title" className="mt-2 font-serif text-3xl font-semibold">Welcome to Pi Gamma Phi Gamma Sigma</h2>
        </div>
        <div className="px-6 py-7 text-center sm:px-10">
          <p className="text-sm leading-7 text-a-secondary">Congratulations on completing your neophyte formation. We are glad to welcome you as a new member of Pi Gamma Phi Gamma Sigma.</p>
          <p className="mt-3 text-sm leading-7 text-a-muted">Your certificate of confirmation is now available to view and print.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={certificateHref} target="_blank" rel="noreferrer" className="a-btn a-btn-primary">View certificate ↗</a>
            <button type="button" onClick={() => setOpen(false)} className="a-btn a-btn-secondary">Continue to dashboard</button>
          </div>
        </div>
      </div>
    </div>
  );
}
