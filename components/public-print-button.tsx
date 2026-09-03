"use client";

export default function PublicPrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-sm bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white">
      Print certificate
    </button>
  );
}
