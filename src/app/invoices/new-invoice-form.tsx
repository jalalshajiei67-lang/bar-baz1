"use client";

import { useActionState } from "react";

import { openInvoice } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { fieldError, input, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export function NewInvoiceForm({
  day,
  customers,
}: {
  day: string;
  customers: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(openInvoice, emptyState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="day" value={day} />

      <div className="min-w-[14rem] flex-1">
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

      <SubmitButton pendingLabel="…">ایجاد فاکتور</SubmitButton>
    </form>
  );
}
