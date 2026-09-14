"use client";

import { useActionState, useState, type ReactNode } from "react";

import { deleteInvoiceItem } from "@/app/actions/invoices";
import { Banner } from "@/components/banner";
import { ConfirmButton, SubmitButton } from "@/components/buttons";
import { PriceInput } from "@/components/price-input";
import { money } from "@/lib/format";
import { btnPrimaryLarge, fieldError, inputLarge, label } from "@/lib/ui";
import {
  PACK_COUNT_OPTIONS,
  emptyState,
  normalizeDigits,
  type ActionState,
} from "@/lib/validation";

export type EditableItem = {
  id: string;
  name: string;
  /** Decimal strings, exactly as stored. */
  quantity: string;
  unitPrice: string;
  /** Boxes this line came in; "" is فله. */
  packCount: string;
  /** Last price agreed for this fruit, "" when there is none yet. */
  lastPrice?: string;
  /** Where that price comes from, e.g. "این مشتری · ۱۴۰۵/۰۶/۱۵". */
  lastPriceNote?: string | null;
};

type Values = Record<
  string,
  { quantity: string; price: string; packCount: string }
>;

/** Prices always end in three zeros, so an unpriced row rests holding them. */
const RESTING_PRICE = "000";

/** A weight of 0 means "not weighed yet", so the field shows empty, not "0". */
function initialQuantity(stored: string): string {
  return Number(stored) > 0 ? stored : "";
}

function initialValues(items: EditableItem[]): Values {
  return Object.fromEntries(
    items.map((item) => [
      item.id,
      {
        quantity: initialQuantity(item.quantity),
        packCount: item.packCount,
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
  items,
  action,
  submitLabel,
  pendingLabel,
  returnTo,
  lockPacks = false,
  extra,
}: {
  items: EditableItem[];
  /** Server action, already bound to the invoice. */
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel: string;
  /** Where deleting a line should land. Defaults to the admin invoice page. */
  returnTo?: string;
  /** The fleet carries the boxes the admin counted, so it cannot change them. */
  lockPacks?: boolean;
  /** Extra controls in the sticky footer, above the submit button. */
  extra?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, emptyState);
  const [values, setValues] = useState<Values>(() => initialValues(items));

  // Re-sync whenever the saved rows actually change — a save, or a deleted row.
  const signature = items
    .map(
      (item) =>
        `${item.id}:${item.quantity}:${item.unitPrice}:${item.packCount}`,
    )
    .join("|");
  const [syncedSignature, setSyncedSignature] = useState(signature);
  if (signature !== syncedSignature) {
    setSyncedSignature(signature);
    setValues(initialValues(items));
  }

  function set(
    id: string,
    field: "quantity" | "price" | "packCount",
    value: string,
  ) {
    setValues((previous) => ({
      ...previous,
      [id]: { ...previous[id], [field]: value },
    }));
  }

  const lineTotals = items.map((item) => {
    const row = values[item.id] ?? { quantity: "", price: "", packCount: "" };
    return toNumber(row.quantity) * toNumber(row.price);
  });
  const liveTotal = lineTotals.reduce((sum, line) => sum + line, 0);

  const saved = initialValues(items);
  const dirty = items.some((item) => {
    const row = values[item.id];
    return (
      row?.quantity !== saved[item.id].quantity ||
      row?.price !== saved[item.id].price ||
      row?.packCount !== saved[item.id].packCount
    );
  });
  const unpriced = items.filter(
    (item) => toNumber(values[item.id]?.price ?? "") <= 0,
  ).length;
  const unweighed = items.filter(
    (item) => toNumber(values[item.id]?.quantity ?? "") <= 0,
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
                formAction={deleteInvoiceItem.bind(null, item.id, returnTo)}
                className="-me-1 rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
              >
                حذف
              </ConfirmButton>
            </div>

            <div className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] gap-2">
              <div>
                <label className={label} htmlFor={`packCount_${item.id}`}>
                  تعداد
                </label>
                <select
                  id={`packCount_${item.id}`}
                  name={`packCount_${item.id}`}
                  className={`${inputLarge} ${lockPacks ? "opacity-100" : ""}`}
                  value={values[item.id]?.packCount ?? ""}
                  disabled={lockPacks}
                  onChange={(event) =>
                    set(item.id, "packCount", event.target.value)
                  }
                >
                  <option value="">فله</option>
                  {PACK_COUNT_OPTIONS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor={`quantity_${item.id}`}>
                  وزن (کیلوگرم)
                </label>
                <input
                  id={`quantity_${item.id}`}
                  name={`quantity_${item.id}`}
                  className={`${inputLarge} tabular-nums`}
                  placeholder="۳٫۱۲۳"
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

            {item.lastPrice ? (
              <button
                type="button"
                onClick={() => set(item.id, "price", item.lastPrice!)}
                className="mt-2 rounded-lg bg-black/5 px-3 py-1.5 text-xs dark:bg-white/10"
              >
                آخرین قیمت: {money(item.lastPrice)}
                {item.lastPriceNote ? (
                  <span className="opacity-60"> · {item.lastPriceNote}</span>
                ) : null}
              </button>
            ) : null}

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

        {extra}

        <SubmitButton className={btnPrimaryLarge} pendingLabel={pendingLabel}>
          {submitLabel}
        </SubmitButton>

        {unweighed > 0 ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {unweighed} ردیف هنوز وزن ندارد.
          </p>
        ) : null}
        {unpriced > 0 ? (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {unpriced} ردیف هنوز قیمت ندارد.
          </p>
        ) : null}
      </div>
    </form>
  );
}
