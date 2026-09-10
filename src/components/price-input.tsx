"use client";

import { useLayoutEffect, useRef } from "react";

import { normalizeDigits } from "@/lib/validation";

/** "275000" -> "275,000" */
export function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Anything typed -> ASCII digits only ("۸۵۰,۰۰۰" -> "850000"). */
function onlyDigits(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

/** Where the caret sits in `formatted` once `count` digits are behind it. */
function caretAfter(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (formatted[i] >= "0" && formatted[i] <= "9") {
      seen += 1;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

/** Prices run to at least five digits, and never carry small change. */
const MAX_DIGITS = 12;

/**
 * A Toman price field. Every price this business quotes ends in three zeros, so
 * the field rests at "000" and only the leading digits get typed onto it — tap,
 * type "275", read 275,000. `value` is always the bare digits; the grouping is
 * display only, and the server strips it back out.
 */
export function PriceInput({
  id,
  name,
  value,
  onValueChange,
  className,
  ariaLabel,
}: {
  id?: string;
  name: string;
  value: string;
  onValueChange: (digits: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);

  // Keeps the box in step with `value` even when a keystroke changes no digits
  // (a stray letter), which would otherwise leave React's render bailed out.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const formatted = groupDigits(value);
    if (el.value !== formatted) el.value = formatted;
    if (caret.current !== null) {
      el.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const typed = event.target.value;
    const at = event.target.selectionStart ?? typed.length;
    const digits = onlyDigits(typed).slice(0, MAX_DIGITS);

    caret.current = caretAfter(
      groupDigits(digits),
      onlyDigits(typed.slice(0, at)).length,
    );
    onValueChange(digits);
  }

  function handleFocus(event: React.FocusEvent<HTMLInputElement>) {
    // Nothing agreed yet — park the caret in front of the zeros, ready to type
    // on. Deferred, so the tap's own caret placement doesn't win.
    if (!/^0*$/.test(value)) return;
    const el = event.currentTarget;
    requestAnimationFrame(() => el.setSelectionRange(0, 0));
  }

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      className={className}
      value={groupDigits(value)}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder="توافقی"
      inputMode="numeric"
      dir="ltr"
      autoComplete="off"
      aria-label={ariaLabel}
    />
  );
}
