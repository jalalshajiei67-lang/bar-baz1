"use client";

import { useFormStatus } from "react-dom";

import { btnDanger, btnPrimary } from "@/lib/ui";

export function SubmitButton({
  children,
  className = btnPrimary,
  pendingLabel = "…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Submit button that asks first — used for anything destructive. */
export function ConfirmButton({
  children,
  message,
  className = btnDanger,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      چاپ
    </button>
  );
}
