/**
 * The finance archive's time windows. Years and months are Jalali and weeks
 * run Saturday to Friday, the way the shop counts them.
 */

import { dayToDate, faDay, faDayShort, faMonth, isoDay, shiftDay } from "./format";
import { fromJalali, jalaliWeekday, toJalali } from "./jalali";

export const PERIODS = [
  { value: "all", label: "کل" },
  { value: "year", label: "سال" },
  { value: "month", label: "ماه" },
  { value: "week", label: "هفته" },
  { value: "day", label: "روز" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

/** A `?period=` value, or `fallback` when it is missing or unknown. */
export function normalizePeriod(value: unknown, fallback: Period = "month"): Period {
  return PERIODS.some((p) => p.value === value) ? (value as Period) : fallback;
}

/** Start (inclusive) and end (exclusive) as "YYYY-MM-DD"; null means all time. */
export function periodRange(
  period: Period,
  day: string,
): { start: string; end: string } | null {
  if (period === "all") return null;
  if (period === "day") return { start: day, end: shiftDay(day, 1) };
  if (period === "week") {
    const start = shiftDay(day, -jalaliWeekday(dayToDate(day)));
    return { start, end: shiftDay(start, 7) };
  }

  const j = toJalali(dayToDate(day));
  if (period === "month") {
    const next =
      j.month === 12
        ? { year: j.year + 1, month: 1, day: 1 }
        : { year: j.year, month: j.month + 1, day: 1 };
    return {
      start: isoDay(fromJalali({ ...j, day: 1 })),
      end: isoDay(fromJalali(next)),
    };
  }
  return {
    start: isoDay(fromJalali({ year: j.year, month: 1, day: 1 })),
    end: isoDay(fromJalali({ year: j.year + 1, month: 1, day: 1 })),
  };
}

/** A day inside the previous (-1) or next (+1) window of the same size. */
export function shiftPeriod(period: Period, day: string, step: -1 | 1): string {
  const range = periodRange(period, day);
  if (!range) return day;
  return step === 1 ? range.end : shiftDay(range.start, -1);
}

const yearFormatter = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "UTC",
  year: "numeric",
});

export function periodLabel(period: Period, day: string): string {
  const range = periodRange(period, day);
  if (!range) return "از ابتدا تا امروز";
  if (period === "day") return faDay(day);
  if (period === "month") return faMonth(dayToDate(day));
  if (period === "year") return `سال ${yearFormatter.format(dayToDate(day))}`;
  return `${faDayShort(range.start)} تا ${faDayShort(shiftDay(range.end, -1))}`;
}

/** Tehran midnight of a day as an instant, for filtering timestamp columns. */
export function tehranMidnight(iso: string): Date {
  // Iran has kept a fixed +03:30 offset since it dropped daylight saving in 2022.
  return new Date(`${iso}T00:00:00+03:30`);
}
