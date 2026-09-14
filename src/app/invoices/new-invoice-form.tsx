"use client";

import { useActionState } from "react";

import { openInvoice } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { fieldError, input, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export function NewInvoiceForm({
  day,
  customers,
  fleets,
}: {
  day: string;
  customers: { id: string; name: string }[];
  fleets: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(openInvoice, emptyState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="day" value={day} />

      <div className="min-w-[12rem] flex-1">
        <label className={label} htmlFor="customerId">
          فاکتور جدید برای
        </label>
        <select id="customerId" name="customerId" className={input} defaultValue="">
          <option value="" disabled>
            انتخاب مشتری…
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.customerId ? (
          <p className={fieldError}>{state.fieldErrors.customerId}</p>
        ) : null}
      </div>

      <div className="min-w-[10rem] flex-1">
        <label className={label} htmlFor="fleetId">
          با ناوگان
        </label>
        <select id="fleetId" name="fleetId" className={input} defaultValue="">
          <option value="" disabled>
            انتخاب ناوگان…
          </option>
          {fleets.map((fleet) => (
            <option key={fleet.id} value={fleet.id}>
              {fleet.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.fleetId ? (
          <p className={fieldError}>{state.fieldErrors.fleetId}</p>
        ) : null}
      </div>

      <SubmitButton pendingLabel="…">ایجاد فاکتور</SubmitButton>
    </form>
  );
}
