"use client";

import { useActionState, useState } from "react";

import { deleteInvoiceItem, saveInvoiceItems } from "@/app/actions/invoices";
import { Banner } from "@/components/banner";
import { ConfirmButton, SubmitButton } from "@/components/buttons";
import { PriceInput } from "@/components/price-input";
import { money } from "@/lib/format";
import { btnPrimaryLarge, fieldError, inputLarge, label } from "@/lib/ui";
import { emptyState, normalizeDigits } from "@/lib/validation";

export type EditableItem = {
  id: string;
  name: string;
  /** Decimal strings, exactly as stored. */
  quantity: string;
  unitPrice: string;
};

type Values = Record<string, { quantity: string; price: string }>;

/** Prices always end in three zeros, so an unpriced row rests holding them. */
const RESTING_PRICE = "000";

function initialValues(items: EditableItem[]): Values {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        quantity: item.quantity,
        // A stored 0 means "not agreed yet", so the row falls back to "000".
        price:
          Number(item.unitPrice) > 0
            ? String(Math.round(Number(item.unitPrice)))
            : RESTING_PRICE,
      },
    ]),
  );
}

/** "۴۵٬۰۰۰" | "45000" | "" -> 45000 | 0 */
function toNumber(value: string): number {
  const parsed = Number(normalizeDigits(value).trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ItemsEditor({
  invoiceId,
  items,
}: {
  invoiceId: string;
  items: EditableItem[];
}) {
  const action = saveInvoiceItems.bind(null, invoiceId);
  const [state, formAction] = useActionState(action, emptyState);
  const [values, setValues] = useState<Values>(() => initialValues(items));

  // Re-sync whenever the saved rows actually change — a save, or a deleted row.
  const signature = items
    .map((item) => `${item.id}:${item.quantity}:${item.unitPrice}`)
    .join("|");
  const [syncedSignature, setSyncedSignature] = useState(signature);
  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setValues(initialValues(items));
  }

  function set(id: string, field: "quantity" | "price", value: string) {
    setValues((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }));
  }

  const lineTotals = items.map((item) => {
    const row = values[item.id] ?? { quantity: "", price: "" };
    return toNumber(row.quantity) * toNumber(row.price);
  });
  const liveTotal = lineTotals.reduce((sum, line) => sum + line, 0);

  const saved = initialValues(items);
  const dirty = items.some((item) => {
    const row = values[item.id];
    return (
      row?.quantity !== saved[item.id].quantity ||
      row?.price !== saved[item.id].price
    );
  });
  const unpriced = items.filter(
    (item) => toNumber(values[item.id]?.price ?? "") <= 0,
  ).length;

  return (
    <form action={formAction} className="print:hidden">
      {state.message ? (
        <div className="mb-3">
          <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>
        </div>
      ) : null}

      <ul className="grid gap-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="rounded-xl border border-black/10 p-3 dark:border-white/15"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-medium">{item.name}</span>
              <ConfirmButton
                message={`ردیف «${item.name}» حذف شود؟`}
                formAction={deleteInvoiceItem.bind(null, item.id)}
                className="-me-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                حذف
              </ConfirmButton>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className={label} htmlFor={`quantity_${item.id}`}>
                  وزن (کیلوگرم)
                </label>
                <input
                  id={`quantity_${item.id}`}
                  name={`quantity_${item.id}`}
                  className={`${inputLarge} tabular-nums`}
                  value={values[item.id]?.quantity ?? ""}
                  onChange={(event) =>
                    set(item.id, "quantity", event.target.value)
                  }
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                />
                {state.fieldErrors?.[`quantity_${item.id}`] ? (
                  <p className={fieldError}>
                    {state.fieldErrors[`quantity_${item.id}`]}
                  </p>
                ) : null}
              </div>

              <div>
                <label className={label} htmlFor={`price_${item.id}`}>
                  قیمت هر کیلو
                </label>
                <PriceInput
                  id={`price_${item.id}`}
                  name={`price_${item.id}`}
                  className={`${inputLarge} tabular-nums`}
                  value={values[item.id]?.price ?? RESTING_PRICE}
                  onValueChange={(digits) => set(item.id, "price", digits)}
                />
                {state.fieldErrors?.[`price_${item.id}`] ? (
                  <p className={fieldError}>
                    {state.fieldErrors[`price_${item.id}`]}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between border-t border-black/5 pt-2 text-sm dark:border-white/10">
              <span className="opacity-60">مبلغ ردیف</span>
              <span className="font-semibold tabular-nums">
                {money(lineTotals[index])}{" "}
                <span className="text-xs font-normal opacity-60">تومان</span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Stays in view while the list is scrolled, so the running total is
          always readable mid-haggle. */}
      <div className="bg-background sticky bottom-0 z-10 -mx-4 mt-3 border-t border-black/10 px-4 py-3 dark:border-white/15">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm opacity-70">
            جمع کل
            {dirty ? (
              <span className="ms-1 text-amber-600 dark:text-amber-400">
                (ذخیره نشده)
              </span>
            ) : null}
          </span>
          <span className="text-xl font-semibold tabular-nums">
            {money(liveTotal)}{" "}
            <span className="text-sm font-normal opacity-60">تومان</span>
          </span>
        </div>

        <SubmitButton className={btnPrimaryLarge} pendingLabel="در حال ذخیره…">
          ذخیره وزن‌ها و قیمت‌ها
        </SubmitButton>

        {unpriced > 0 ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {unpriced} ردیف هنوز قیمت ندارد.
          </p>
        ) : null}
      </div>
    </form>
  );
}
