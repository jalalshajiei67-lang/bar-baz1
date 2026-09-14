"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { addInvoiceItem } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { btnPrimaryLarge, fieldError, inputLarge, label } from "@/lib/ui";
import { PACK_COUNT_OPTIONS, emptyState } from "@/lib/validation";

export type FruitOption = {
  id: string;
  name: string;
};

/** "" is فله — the fruit goes out loose, in no box at all. */
const EMPTY_FIELDS = { fruitId: "", packCount: "" };

/**
 * The admin's half of a line: which fruit goes on the truck and how many boxes
 * of it. Weight and price are missing on purpose — the fleet weighs the boxes
 * at the shop and bargains the price there.
 */
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

  function set(field: keyof typeof EMPTY_FIELDS, value: string) {
    setFields((previous) => ({ ...previous, [field]: value }));
  }

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid grid-cols-[1fr_7rem] gap-3">
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

        <div>
          <label className={label} htmlFor="packCount">
            تعداد
          </label>
          <select
            id="packCount"
            name="packCount"
            className={inputLarge}
            value={fields.packCount}
            onChange={(event) => set("packCount", event.target.value)}
          >
            <option value="">فله</option>
            {PACK_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SubmitButton className={btnPrimaryLarge} pendingLabel="در حال افزودن…">
        افزودن به بار
      </SubmitButton>

      <p className="text-xs opacity-50">
        فقط میوه و تعداد جعبه را مشخص کنید. وزن و قیمت را ناوگان سر بار وارد
        می‌کند.
      </p>
    </form>
  );
}
