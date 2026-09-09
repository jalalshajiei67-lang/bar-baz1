/**
 * Formatting and date helpers.
 *
 * Safe to import from client components: nothing here touches Prisma or the
 * database. Decimal values are accepted structurally (anything with toString).
 */

export type Numeric = number | string | { toString(): string } | null | undefined;

export const TIME_ZONE = "Asia/Tehran";
export const CURRENCY = "تومان";

/** Prisma Decimal | string | number -> number. Returns 0 for null/NaN. */
export function toNum(value: Numeric): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

const moneyFormatter = new Intl.NumberFormat("fa-IR-u-nu-latn", {
  maximumFractionDigits: 0,
});

const kgFormatter = new Intl.NumberFormat("fa-IR-u-nu-latn", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** 1250000 -> "1,250,000" */
export function money(value: Numeric): string {
  return moneyFormatter.format(toNum(value));
}

/** 3.123 -> "3.123" */
export function kg(value: Numeric): string {
  return kgFormatter.format(toNum(value));
}

/* ---------------------------------------------------------------- dates --- */

/** Today in Tehran as "YYYY-MM-DD". */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

/** A DATE column value -> "YYYY-MM-DD" (the column is stored at UTC midnight). */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" -> Date at UTC midnight, for writing to a DATE column. */
export function dayToDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Accepts anything; falls back to today in Tehran. */
export function normalizeDay(value: unknown): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayISO();
}

/** "YYYY-MM-DD" shifted by n days. */
export function shiftDay(iso: string, days: number): string {
  const date = dayToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

// fa-IR's own "full" pattern reads "۱۴۰۵ شهریور ۱۸, چهارشنبه", so compose it.
const jalaliWeekday = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  weekday: "long",
});

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  dateStyle: "medium",
});

const jalaliShortFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-09-09" -> "سه‌شنبه ۱۸ شهریور ۱۴۰۵" */
export function faDay(iso: string): string {
  const date = dayToDate(iso);
  return `${jalaliWeekday.format(date)} ${jalaliFormatter.format(date)}`;
}

/** "2026-09-09" -> "۱۴۰۵/۰۶/۱۸" */
export function faDayShort(iso: string): string {
  return jalaliShortFormatter.format(dayToDate(iso));
}
