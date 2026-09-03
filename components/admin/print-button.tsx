"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm font-semibold text-black/70 transition hover:border-[var(--green)] hover:text-[var(--green)] print:hidden"
    >
      Print certificate
    </button>
  );
}
