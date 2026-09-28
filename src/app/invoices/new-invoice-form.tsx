"use client";

import { useActionState, useState } from "react";

import { openInvoice } from "@/app/actions/invoices";
import { SubmitButton } from "@/components/buttons";
import { matches } from "@/lib/search";
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
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState("");

  const shown = query
    ? customers.filter((customer) => matches(customer.name, query))
    : customers;

  function search(value: string) {
    setQuery(value);
    const found = value
      ? customers.filter((customer) => matches(customer.name, value))
      : customers;
    // One match is the customer being looked for; a pick the search has hidden
    // must not stay selected where it can't be seen.
    if (found.length === 1) setCustomerId(found[0].id);
    else if (!found.some((customer) => customer.id === customerId)) setCustomerId("");
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="day" value={day} />

      <div className="min-w-[12rem] flex-1">
        <label className={label} htmlFor="customerSearch">
          فاکتور جدید برای
        </label>
        <input
          id="customerSearch"
          type="search"
          value={query}
          onChange={(event) => search(event.target.value)}
          className={`${input} mb-1.5`}
          placeholder="جستجوی مشتری…"
          aria-label="جستجوی مشتری"
          autoComplete="off"
        />
        <select
          id="customerId"
          name="customerId"
          className={input}
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          aria-label="مشتری"
        >
          <option value="" disabled>
            {query && shown.length === 0 ? "مشتری‌ای پیدا نشد" : "انتخاب مشتری…"}
          </option>
          {shown.map((customer) => (
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
