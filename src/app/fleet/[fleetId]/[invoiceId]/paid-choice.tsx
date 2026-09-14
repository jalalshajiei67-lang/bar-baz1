"use client";

import { useState } from "react";

/**
 * Lives inside the delivery form and posts `paid` with it, so the driver's
 * answer rides along with the weights instead of needing its own submit.
 */
export function PaidChoice({ defaultPaid }: { defaultPaid: boolean }) {
  const [paid, setPaid] = useState(defaultPaid);

  return (
    <div className="mb-3">
      <input type="hidden" name="paid" value={paid ? "true" : "false"} />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setPaid(true)}
          aria-pressed={paid}
          className={`rounded-xl px-4 py-3 text-base font-semibold transition ${
            paid
              ? "bg-emerald-600 text-white"
              : "border-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400"
          }`}
        >
          پرداخت شد ✓
        </button>
        <button
          type="button"
          onClick={() => setPaid(false)}
          aria-pressed={!paid}
          className={`rounded-xl px-4 py-3 text-base font-semibold transition ${
            !paid
              ? "bg-red-600 text-white"
              : "border-2 border-red-600/30 text-red-700 hover:bg-red-600/10 dark:text-red-400"
          }`}
        >
          پرداخت نشد ✕
        </button>
      </div>
    </div>
  );
}
