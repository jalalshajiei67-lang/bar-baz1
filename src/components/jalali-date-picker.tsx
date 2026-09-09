"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { fromJalali, jalaliMonthLength, jalaliWeekday, toJalali } from "@/lib/jalali";
import { faDayShort, isoDay, todayISO } from "@/lib/format";
import { btnGhost, card } from "@/lib/ui";

const MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAY_LABELS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** Popover Jalali calendar; navigates to `${basePath}?day=YYYY-MM-DD` on pick. */
export function JalaliDatePicker({
  day,
  basePath = "/prices",
}: {
  day: string;
  basePath?: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = toJalali(new Date(`${day}T00:00:00.000Z`));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(selected);
  const [viewedDay, setViewedDay] = useState(day);

  if (day !== viewedDay) {
    setViewedDay(day);
    setView(selected);
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(dayOfMonth: number) {
    const gregorian = fromJalali({ year: view.year, month: view.month, day: dayOfMonth });
    setOpen(false);
    router.push(`${basePath}?day=${isoDay(gregorian)}`);
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      let month = current.month + delta;
      let year = current.year;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      return { year, month, day: 1 };
    });
  }

  const monthLength = jalaliMonthLength(view.year, view.month);
  const firstWeekday = jalaliWeekday(fromJalali({ year: view.year, month: view.month, day: 1 }));
  const today = toJalali(new Date(`${todayISO()}T00:00:00.000Z`));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={btnGhost}
        dir="ltr"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {faDayShort(day)}
      </button>

      {open ? (
        <div
          className={`${card} absolute top-full z-10 mt-2 w-64 bg-white p-3 shadow-lg dark:bg-neutral-900`}
          role="dialog"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => shiftMonth(-1)}
              aria-label="ماه قبل"
            >
              ‹
            </button>
            <span className="text-sm font-medium">
              {MONTH_NAMES[view.month - 1]} {view.year}
            </span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
              onClick={() => shiftMonth(1)}
              aria-label="ماه بعد"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs opacity-50">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <span key={`pad-${index}`} />
            ))}
            {Array.from({ length: monthLength }).map((_, index) => {
              const dayOfMonth = index + 1;
              const isSelected =
                view.year === selected.year &&
                view.month === selected.month &&
                dayOfMonth === selected.day;
              const isToday =
                view.year === today.year && view.month === today.month && dayOfMonth === today.day;
              return (
                <button
                  key={dayOfMonth}
                  type="button"
                  onClick={() => pick(dayOfMonth)}
                  className={`rounded-md py-1 transition ${
                    isSelected
                      ? "bg-emerald-600 text-white"
                      : isToday
                        ? "font-semibold text-emerald-700 dark:text-emerald-400"
                        : "hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  {dayOfMonth}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
