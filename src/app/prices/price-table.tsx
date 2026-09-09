"use client";

import { useActionState, useState } from "react";

import { saveDailyPrices } from "@/app/actions/prices";
import { Banner } from "@/components/banner";
import { SubmitButton } from "@/components/buttons";
import { faDayShort, money } from "@/lib/format";
import { btnGhost, card, fieldError, input, rowBorder, td, th } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export type PriceRow = {
  fruitId: string;
  name: string;
  /** Price already saved for the selected day, "" when none. */
  current: string;
  /** Most recent price before the selected day. */
  previous: string | null;
  previousDay: string | null;
};

export function PriceTable({ day, rows }: { day: string; rows: PriceRow[] }) {
  const [state, formAction] = useActionState(saveDailyPrices, emptyState);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.fruitId, row.current])),
  );

  const filled = rows.filter((row) => values[row.fruitId]?.trim()).length;

  function fillFromPrevious() {
    setValues((previous) => {
      const next = { ...previous };
      for (const row of rows) {
        if (!next[row.fruitId]?.trim() && row.previous) {
          next[row.fruitId] = row.previous;
        }
      }
      return next;
    });
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="day" value={day} />

      {state.message ? (
        <div className="mb-4">
          <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="opacity-60">
          {filled} از {rows.length} میوه قیمت دارد
        </span>
        <button type="button" className={btnGhost} onClick={fillFromPrevious}>
          پر کردن خالی‌ها با قیمت قبلی
        </button>
      </div>

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr>
              <th className={th}>میوه</th>
              <th className={th}>قیمت هر کیلو (تومان)</th>
              <th className={th}>قیمت قبلی</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const key = `price_${row.fruitId}`;
              return (
                <tr key={row.fruitId} className={rowBorder}>
                  <td className={`${td} font-medium`}>{row.name}</td>
                  <td className={td}>
                    <input
                      name={key}
                      value={values[row.fruitId] ?? ""}
                      onChange={(event) =>
                        setValues((previous) => ({
                          ...previous,
                          [row.fruitId]: event.target.value,
                        }))
                      }
                      className={`${input} max-w-[10rem] py-1.5`}
                      inputMode="decimal"
                      dir="ltr"
                      placeholder={row.previous ?? "—"}
                      aria-label={`قیمت ${row.name}`}
                    />
                    {state.fieldErrors?.[key] ? (
                      <p className={fieldError}>{state.fieldErrors[key]}</p>
                    ) : null}
                  </td>
                  <td className={`${td} whitespace-nowrap opacity-60`}>
                    {row.previous ? (
                      <>
                        {money(row.previous)}
                        {row.previousDay ? (
                          <span className="opacity-60">
                            {" "}
                            / {faDayShort(row.previousDay)}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <SubmitButton pendingLabel="در حال ذخیره…">ذخیره قیمت‌ها</SubmitButton>
        <span className="text-xs opacity-50">
          خالی گذاشتن یک ردیف، قیمت آن میوه را برای این روز حذف می‌کند.
        </span>
      </div>
    </form>
  );
}
