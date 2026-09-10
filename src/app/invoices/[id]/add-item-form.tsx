"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { addInvoiceItem } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { PriceInput } from "@/components/price-input";
import { money } from "@/lib/format";
import { btnPrimaryLarge, fieldError, inputLarge, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export type FruitOption = {
  id: string;
  name: string;
  /** Last price agreed for this fruit, "" when there is none yet. */
  lastPrice: string;
  /** Where that price comes from, e.g. "این مشتری · ۱۴۰۵/۰۶/۱۵". */
  lastPriceNote: string | null;
};

/** Prices always end in three zeros, so the field starts holding them. */
const RESTING_PRICE = "000";

const EMPTY_FIELDS = { fruitId: "", quantity: "", price: RESTING_PRICE };

export function AddItemForm({
  invoiceId,
  fruits,
}: {
  invoiceId: string;
  fruits: FruitOption[];
}) {
  const action = addInvoiceItem.bind(null, invoiceId);
  const [state, formAction] = useActionState(action, emptyState);
  const fruitRef = useRef<HTMLSelectElement>(null);
  const [fields, setFields] = useState(EMPTY_FIELDS);

  // Clear the form as soon as a line lands, ready for the next one.
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.ok) setFields(EMPTY_FIELDS);
  }

  useEffect(() => {
    if (state.ok) fruitRef.current?.focus();
  }, [state]);

  const selected = fruits.find((fruit) => fruit.id === fields.fruitId);

  function set(field: keyof typeof EMPTY_FIELDS, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <form action={formAction} className="grid gap-3">
      <div>
        <label className={label} htmlFor="fruitId">
          میوه
        </label>
        <select
          id="fruitId"
          name="fruitId"
          ref={fruitRef}
          className={inputLarge}
          value={fields.fruitId}
          onChange={(event) => set("fruitId", event.target.value)}
        >
          <option value="" disabled>
            انتخاب میوه…
          </option>
          {fruits.map((fruit) => (
            <option key={fruit.id} value={fruit.id}>
              {fruit.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.fruitId ? (
          <p className={fieldError}>{state.fieldErrors.fruitId}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="quantity">
            وزن (کیلوگرم)
          </label>
          <input
            id="quantity"
            name="quantity"
            className={`${inputLarge} tabular-nums`}
            placeholder="۳٫۱۲۳"
            inputMode="decimal"
            dir="ltr"
            autoComplete="off"
            value={fields.quantity}
            onChange={(event) => set("quantity", event.target.value)}
          />
          {state.fieldErrors?.quantity ? (
            <p className={fieldError}>{state.fieldErrors.quantity}</p>
          ) : null}
        </div>

        <div>
          <label className={label} htmlFor="unitPrice">
            قیمت هر کیلو
          </label>
          <PriceInput
            id="unitPrice"
            name="unitPrice"
            className={`${inputLarge} tabular-nums`}
            value={fields.price}
            onValueChange={(digits) => set("price", digits)}
          />
          {state.fieldErrors?.unitPrice ? (
            <p className={fieldError}>{state.fieldErrors.unitPrice}</p>
          ) : null}
        </div>
      </div>

      {selected?.lastPrice ? (
        <button
          type="button"
          onClick={() => set("price", selected.lastPrice)}
          className="justify-self-start rounded-lg bg-black/5 px-3 py-1.5 text-xs dark:bg-white/10"
        >
          آخرین قیمت: {money(selected.lastPrice)}
          {selected.lastPriceNote ? (
            <span className="opacity-60"> · {selected.lastPriceNote}</span>
          ) : null}
        </button>
      ) : null}

      <SubmitButton className={btnPrimaryLarge} pendingLabel="در حال افزودن…">
        افزودن به فاکتور
      </SubmitButton>

      <p className="text-xs opacity-50">
        سه صفر آخر قیمت از پیش نوشته شده؛ فقط رقم‌های اولش را بزنید. اگر هنوز
        توافق نشده، ۰۰۰ را دست‌نخورده بگذارید.
      </p>
    </form>
  );
}
