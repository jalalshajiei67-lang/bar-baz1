"use client";

import { useActionState, useState } from "react";

import { recordPayment } from "@/app/actions/payments";
import { Banner } from "@/components/banner";
import { SubmitButton } from "@/components/buttons";
import { PriceInput } from "@/components/price-input";
import { btnPrimary, fieldError, input, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

/**
 * Takes the money a customer hands over against their pile of open invoices.
 * The amount is whatever they paid — the oldest invoices soak it up first and
 * the rest of the debt stays on the list.
 */
export function PaymentForm({
  customerId,
  remaining,
}: {
  customerId: string;
  /** This customer's outstanding debt, used to clear the box once it moves. */
  remaining: number;
}) {
  const [state, formAction] = useActionState(recordPayment, emptyState);
  const [amount, setAmount] = useState("");

  // A payment that lands changes the debt, which re-renders this card from the
  // server — the box empties then, rather than holding a number already spent.
  const [syncedRemaining, setSyncedRemaining] = useState(remaining);
  if (remaining !== syncedRemaining) {
    setSyncedRemaining(remaining);
    setAmount("");
  }

  return (
    <div className="mt-3">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="customerId" value={customerId} />

        <div className="min-w-[10rem] flex-1">
          <label className={label} htmlFor={`amount-${customerId}`}>
            پرداختی (تومان)
          </label>
          <PriceInput
            id={`amount-${customerId}`}
            name="amount"
            value={amount}
            onValueChange={setAmount}
            className={input}
            placeholder="مبلغ"
            ariaLabel="مبلغ پرداختی"
          />
        </div>

        <SubmitButton className={btnPrimary}>کم کردن از بدهی</SubmitButton>
      </form>

      {state.fieldErrors?.amount ? (
        <p className={fieldError}>{state.fieldErrors.amount}</p>
      ) : null}

      {state.message ? (
        <div className="mt-2">
          <Banner tone={state.ok ? "success" : "error"}>{state.message}</Banner>
        </div>
      ) : null}
    </div>
  );
}
