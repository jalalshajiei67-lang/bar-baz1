import Link from "next/link";

import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { todayISO } from "@/lib/format";
import { PERIODS, periodRange, shiftPeriod, type Period } from "@/lib/periods";
import { btnGhost } from "@/lib/ui";

/**
 * The archive's period tabs and previous/next/today controls. Every link keeps
 * `params` (a page's other filters) and only swaps `period` or `day`.
 */
export function PeriodNav({
  basePath,
  period,
  day,
  params = {},
}: {
  basePath: string;
  period: Period;
  day: string;
  params?: Record<string, string>;
}) {
  const today = todayISO();

  function href(change: { period?: Period; day?: string }) {
    const query = new URLSearchParams({
      ...params,
      period: change.period ?? period,
      day: change.day ?? day,
    });
    return `${basePath}?${query}`;
  }

  return (
    <>
      <div className="flex gap-1 overflow-x-auto">
        {PERIODS.map((p) => (
          <Link
            key={p.value}
            href={href({ period: p.value })}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm transition ${
              p.value === period
                ? "bg-emerald-600/10 font-medium text-emerald-700 dark:text-emerald-400"
                : "opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {periodRange(period, day) ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link href={href({ day: shiftPeriod(period, day, -1) })} className={btnGhost}>
            قبلی
          </Link>
          <JalaliDatePicker
            day={day}
            basePath={basePath}
            params={{ ...params, period }}
          />
          <Link href={href({ day: shiftPeriod(period, day, 1) })} className={btnGhost}>
            بعدی
          </Link>
          {day !== today ? (
            <Link href={href({ day: today })} className={btnGhost}>
              امروز
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
