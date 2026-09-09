/**
 * Gregorian <-> Jalali (Solar Hijri) conversion, backed entirely by the ICU
 * "persian" calendar that `Intl` already ships with — no calendar-math
 * library needed. `fa-IR` elsewhere in the app (see format.ts) gets the same
 * calendar for free since it's fa-IR's default.
 */

const DAY_MS = 86_400_000;

export type JalaliDate = { year: number; month: number; day: number };

const toJalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function readParts(date: Date): JalaliDate {
  const parts = toJalaliParts.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Gregorian Date (UTC midnight) -> Jalali {year, month, day}. */
export function toJalali(date: Date): JalaliDate {
  return readParts(date);
}

function compare(a: JalaliDate, b: JalaliDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * Jalali {year, month, day} -> Gregorian Date (UTC midnight).
 *
 * Both calendars advance one day at a time in lockstep, so the Jalali date
 * is a monotonic function of the Gregorian day count — binary search finds
 * the matching Gregorian day without reimplementing Jalali leap-year rules.
 */
export function fromJalali(target: JalaliDate): Date {
  const approxGregorianYear = target.year + 621;
  let lo = Date.UTC(approxGregorianYear - 2, 0, 1);
  let hi = Date.UTC(approxGregorianYear + 3, 0, 1);
  while (lo < hi) {
    const mid = lo + Math.round((hi - lo) / 2 / DAY_MS) * DAY_MS;
    const cmp = compare(readParts(new Date(mid)), target);
    if (cmp === 0) return new Date(mid);
    if (cmp < 0) lo = mid + DAY_MS;
    else hi = mid - DAY_MS;
  }
  return new Date(lo);
}

/** Number of days in a given Jalali month (handles leap Esfand automatically). */
export function jalaliMonthLength(year: number, month: number): number {
  const start = fromJalali({ year, month, day: 1 });
  const next = month === 12 ? { year: year + 1, month: 1, day: 1 } : { year, month: month + 1, day: 1 };
  const end = fromJalali(next);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** Jalali weekday index, Saturday=0 .. Friday=6 (Iran's week starts Saturday). */
export function jalaliWeekday(date: Date): number {
  return (date.getUTCDay() + 1) % 7;
}
