/**
 * How a payment is spread over a customer's open invoices.
 *
 * Kept apart from the server action that writes it: this is the arithmetic that
 * decides who is owed what, and it is worth being able to read — and check — on
 * its own, without a database in the way.
 */

import { Prisma } from "@/generated/prisma/client";

const ZERO = new Prisma.Decimal(0);

export type OpenInvoice = {
  id: string;
  total: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
};

/** What one invoice should be updated to once the payment is spread. */
export type Allocation = {
  id: string;
  paidAmount: Prisma.Decimal;
  paid: boolean;
};

export type AllocationPlan = {
  allocations: Allocation[];
  /** What the payment could not be spent on: the customer owed less. */
  leftover: Prisma.Decimal;
};

/**
 * Spends `amount` on `invoices` in the order given — oldest first, at the call
 * site — filling each one up to its total before moving to the next.
 *
 * A buyer pays down the pile rather than picking invoices out of it: three open
 * invoices and 75% of the money settles the first two outright and leaves the
 * third part-paid. Because each invoice carries its own `paidAmount`, a second
 * payment later starts exactly where this one stopped.
 *
 * Invoices that turn out to owe nothing are returned as settled, so a row worth
 * 0 toman cannot sit in the debtors list forever.
 */
export function planAllocation(
  invoices: OpenInvoice[],
  amount: Prisma.Decimal,
): AllocationPlan {
  const allocations: Allocation[] = [];
  let left = amount;

  for (const invoice of invoices) {
    const remaining = invoice.total.minus(invoice.paidAmount);

    if (remaining.lte(ZERO)) {
      allocations.push({ id: invoice.id, paidAmount: invoice.paidAmount, paid: true });
      continue;
    }

    if (left.lte(ZERO)) continue;

    const applied = left.lt(remaining) ? left : remaining;
    const paidAmount = invoice.paidAmount.plus(applied);

    allocations.push({
      id: invoice.id,
      paidAmount,
      paid: paidAmount.gte(invoice.total),
    });
    left = left.minus(applied);
  }

  return { allocations, leftover: left };
}
