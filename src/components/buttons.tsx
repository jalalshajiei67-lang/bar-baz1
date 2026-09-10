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

/**
 * Submit button that asks first — used for anything destructive.
 * `formAction` lets one row's delete live inside a bigger editing form.
 */
export function ConfirmButton({
  children,
  message,
  className = btnDanger,
  formAction,
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
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
