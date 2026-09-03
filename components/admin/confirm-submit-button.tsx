"use client";

import { useRef, useState, type ReactNode } from "react";

export default function ConfirmSubmitButton({
  message,
  className,
  children,
  disabled,
}: {
  message: string;
  className?: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={disabled}
        onClick={(event) => {
          formRef.current = event.currentTarget.closest("form");
          setIsOpen(true);
        }}
      >
        {children}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="a-card w-full max-w-md p-6 shadow-[var(--a-shadow-md)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-a-danger-soft text-a-danger">!</div>
            <h2 id="confirm-dialog-title" className="mt-4 text-lg font-semibold text-a-text">Confirm this action</h2>
            <p className="mt-2 text-sm leading-6 text-a-muted">{message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="a-btn a-btn-secondary">Cancel</button>
              <button type="button" onClick={() => { setIsOpen(false); formRef.current?.requestSubmit(); }} className="a-btn bg-red-600 text-white transition hover:bg-red-700">Continue</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
