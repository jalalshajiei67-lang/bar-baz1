"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { planAllocation } from "@/lib/allocation";
import { prisma } from "@/lib/db";
import { money } from "@/lib/format";
import {
  paymentInput,
  priceNumeric,
  text,
  type ActionState,
} from "@/lib/validation";

const ZERO = new Prisma.Decimal(0);

/** An invoice only counts as debt once the load has actually been handed over. */
const DEBT = { status: "FINAL", paid: false } as const;

/** Every screen that shows a debt has to be re-read once money moves. */
function revalidateMoney(invoiceId?: string) {
  revalidatePath("/finance");
  revalidatePath("/invoices");
  revalidatePath("/fleet");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
}

/**
 * Hands `amount` to a customer's open invoices, oldest first, and returns
 * whatever is left over once their whole debt is covered. The arithmetic lives
 * in `planAllocation`; this reads the invoices and writes the result back.
 */
async function allocate(
  customerId: string,
  amount: Prisma.Decimal,
): Promise<Prisma.Decimal> {
  const invoices = await prisma.invoice.findMany({
    where: { customerId, ...DEBT },
    orderBy: [{ day: "asc" }, { createdAt: "asc" }],
    select: { id: true, total: true, paidAmount: true },
  });

  const { allocations, leftover } = planAllocation(invoices, amount);

  if (allocations.length > 0) {
    await prisma.$transaction(
      allocations.map((allocation) =>
        prisma.invoice.update({
          where: { id: allocation.id },
          data: { paidAmount: allocation.paidAmount, paid: allocation.paid },
        }),
      ),
    );
  }

  return leftover;
}

/**
 * Subtracts a payment from what this customer owes. Paying more than the whole
 * debt settles it and says so — the extra is not kept as credit, because a
 * stray zero typed here would otherwise silently eat the next delivery.
 */
export async function recordPayment(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const customerId = text(form, "customerId");
  if (!customerId) return { ok: false, message: "مشتری پیدا نشد." };

  const parsed = paymentInput.safeParse(priceNumeric(form, "amount"));
  if (!parsed.success) {
    return { ok: false, fieldErrors: { amount: parsed.error.issues[0].message } };
  }

  const amount = new Prisma.Decimal(parsed.data);
  const leftover = await allocate(customerId, amount);
  revalidateMoney();

  if (leftover.gte(amount)) {
    return { ok: false, message: "این مشتری بدهی پرداخت‌نشده‌ای ندارد." };
  }
  if (leftover.gt(ZERO)) {
    return {
      ok: true,
      message: `بدهی تسویه شد. ${money(leftover)} تومان بیشتر از بدهی بود و ثبت نشد.`,
    };
  }
  return { ok: true, message: `${money(amount)} تومان از بدهی کم شد.` };
}

/**
 * One invoice, settled or put back. Unsettling clears the part-payments on it
 * too, so a mistyped amount is undone by flipping its invoice and typing again.
 */
export async function setInvoiceSettled(form: FormData) {
  const id = text(form, "id");
  const settled = text(form, "settled") === "true";

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { total: true },
  });
  if (!invoice) return;

  await prisma.invoice.update({
    where: { id },
    data: { paid: settled, paidAmount: settled ? invoice.total : ZERO },
  });
  revalidateMoney(id);
}

/** The whole pile at once, for a customer who hands over everything they owe. */
export async function settleCustomer(form: FormData) {
  const customerId = text(form, "customerId");
  if (!customerId) return;

  const invoices = await prisma.invoice.findMany({
    where: { customerId, ...DEBT },
    select: { id: true, total: true },
  });

  await prisma.$transaction(
    invoices.map((invoice) =>
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { paid: true, paidAmount: invoice.total },
      }),
    ),
  );
  revalidateMoney();
}
