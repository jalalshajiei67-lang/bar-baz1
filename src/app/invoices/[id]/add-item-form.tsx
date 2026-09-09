"use client";

import { useActionState, useEffect, useRef } from "react";

import { addInvoiceItem } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { money } from "@/lib/format";
import { fieldError, input, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export type PricedFruit = { id: string; name: string; price: string };

export function AddItemForm({
  invoiceId,
  fruits,
}: {
  invoiceId: string;
  fruits: PricedFruit[];
}) {
  const action = addInvoiceItem.bind(null, invoiceId);
  const [state, formAction] = useActionState(action, emptyState);
  const formRef = useRef<HTMLFormElement>(null);
  const fruitRef = useRef<HTMLSelectElement>(null);

  // Ready for the next line as soon as one lands.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      fruitRef.current?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[12rem] flex-1">
        <label className={label} htmlFor="fruitId">
          میوه
        </label>
        <select
          id="fruitId"
          name="fruitId"
          ref={fruitRef}
          className={input}
          defaultValue=""
        >
          <option value="" disabled>
            انتخاب میوه…
          </option>
          {fruits.map((fruit) => (
            <option key={fruit.id} value={fruit.id}>
              {fruit.name} — {money(fruit.price)}
            </option>
          ))}
        </select>
        {state.fieldErrors?.fruitId ? (
          <p className={fieldError}>{state.fieldErrors.fruitId}</p>
        ) : null}
      </div>

      <div className="w-40">
        <label className={label} htmlFor="quantity">
          وزن (کیلوگرم)
        </label>
        <input
          id="quantity"
          name="quantity"
          className={input}
          placeholder="3.123"
          inputMode="decimal"
          dir="ltr"
          autoComplete="off"
        />
        {state.fieldErrors?.quantity ? (
          <p className={fieldError}>{state.fieldErrors.quantity}</p>
        ) : null}
      </div>

      <SubmitButton pendingLabel="…">افزودن ردیف</SubmitButton>
    </form>
  );
}
