"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dayToDate, normalizeDay } from "@/lib/format";
import {
  dayInput,
  fieldErrors,
  numeric,
  priceInput,
  priceNumeric,
  quantityInput,
  text,
  type ActionState,
} from "@/lib/validation";

const ZERO = new Prisma.Decimal(0);

/**
 * A price is bargained per customer, so a line may be weighed now and priced
 * after the haggling. The field rests at "000" and empties to "", and both of
 * those mean "not agreed yet" and store 0.
 */
function parsePrice(
  raw: string,
): { ok: true; price: Prisma.Decimal } | { ok: false; message: string } {
  if (raw === "" || /^0+$/.test(raw)) return { ok: true, price: ZERO };
  const parsed = priceInput.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  return { ok: true, price: new Prisma.Decimal(parsed.data) };
}

/** Re-reads the lines and stores the sum on the invoice. */
async function recalculateTotal(invoiceId: string) {
  const sum = await prisma.invoiceItem.aggregate({
    where: { invoiceId },
    _sum: { lineTotal: true },
  });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { total: sum._sum.lineTotal ?? ZERO },
  });
}

/** Only DRAFT invoices can be edited. */
async function assertDraft(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  if (!invoice) redirect("/invoices");
  if (invoice.status !== "DRAFT") {
    redirect(
      `/invoices/${invoiceId}?error=${encodeURIComponent(
        "این فاکتور نهایی شده است. برای ویرایش، ابتدا آن را بازگردانید.",
      )}`,
    );
  }
}

/** Opens today's draft for a customer, creating it the first time. */
export async function openInvoice(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const customerId = text(form, "customerId");
  const parsedDay = dayInput.safeParse(text(form, "day"));

  if (!customerId) return { ok: false, fieldErrors: { customerId: "مشتری را انتخاب کنید" } };
  if (!parsedDay.success) return { ok: false, fieldErrors: { day: "تاریخ معتبر نیست" } };

  const day = dayToDate(parsedDay.data);
  const existing = await prisma.invoice.findFirst({
    where: { customerId, day, status: "DRAFT" },
    select: { id: true },
  });

  const invoice =
    existing ?? (await prisma.invoice.create({ data: { customerId, day } }));

  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Adds a line with the weight and the price agreed on the spot. Adding a fruit
 * that is already on the invoice adds the weights up and keeps the newer price.
 */
export async function addInvoiceItem(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await assertDraft(invoiceId);

  const fruitId = text(form, "fruitId");
  const parsedQuantity = quantityInput.safeParse(numeric(form, "quantity"));
  const parsedPrice = parsePrice(priceNumeric(form, "unitPrice"));

  if (!fruitId) return { ok: false, fieldErrors: { fruitId: "میوه را انتخاب کنید" } };
  if (!parsedQuantity.success) {
    return { ok: false, fieldErrors: fieldErrors(parsedQuantity.error) };
  }
  if (!parsedPrice.ok) {
    return { ok: false, fieldErrors: { unitPrice: parsedPrice.message } };
  }

  const existing = await prisma.invoiceItem.findUnique({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    select: { quantity: true },
  });

  const unitPrice = parsedPrice.price;
  const quantity = new Prisma.Decimal(parsedQuantity.data).plus(
    existing?.quantity ?? 0,
  );
  const lineTotal = quantity.mul(unitPrice).toDecimalPlaces(2);

  await prisma.invoiceItem.upsert({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    create: { invoiceId, fruitId, quantity, unitPrice, lineTotal },
    update: { quantity, unitPrice, lineTotal },
  });

  await recalculateTotal(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

/**
 * Saves every line's weight and price in one go — the customer haggles over the
 * whole load, so the numbers are corrected together rather than row by row.
 */
export async function saveInvoiceItems(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await assertDraft(invoiceId);

  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId },
    select: { id: true },
  });

  const errors: Record<string, string> = {};
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const item of items) {
    const parsedQuantity = quantityInput.safeParse(numeric(form, `quantity_${item.id}`));
    const parsedPrice = parsePrice(priceNumeric(form, `price_${item.id}`));

    if (!parsedQuantity.success) {
      errors[`quantity_${item.id}`] = parsedQuantity.error.issues[0].message;
    }
    if (!parsedPrice.ok) {
      errors[`price_${item.id}`] = parsedPrice.message;
    }
    if (!parsedQuantity.success || !parsedPrice.ok) continue;

    const quantity = new Prisma.Decimal(parsedQuantity.data);
    const unitPrice = parsedPrice.price;
    writes.push(
      prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          quantity,
          unitPrice,
          lineTotal: quantity.mul(unitPrice).toDecimalPlaces(2),
        },
      }),
    );
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors, message: "چند مقدار معتبر نیست" };
  }

  await prisma.$transaction(writes);
  await recalculateTotal(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, message: "ذخیره شد" };
}

/**
 * `itemId` is bound rather than posted: React reuses a button's `name` to encode
 * its `formAction`, so a delete button living inside the editing form cannot
 * carry a form field of its own.
 */
export async function deleteInvoiceItem(itemId: string) {
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    select: { invoiceId: true },
  });
  if (!item) redirect("/invoices");
  await assertDraft(item.invoiceId);

  await prisma.invoiceItem.delete({ where: { id: itemId } });
  await recalculateTotal(item.invoiceId);
  revalidatePath(`/invoices/${item.invoiceId}`);
  redirect(`/invoices/${item.invoiceId}`);
}

export async function setInvoiceStatus(form: FormData) {
  const id = text(form, "id");
  const status = text(form, "status") === "FINAL" ? "FINAL" : "DRAFT";

  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function setInvoicePaid(form: FormData) {
  const id = text(form, "id");
  const paid = text(form, "paid") === "true";

  await prisma.invoice.update({ where: { id }, data: { paid } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function payAllUnpaidInvoices(form: FormData) {
  const day = normalizeDay(text(form, "day"));

  await prisma.invoice.updateMany({
    where: { paid: false, status: "FINAL" },
    data: { paid: true },
  });
  revalidatePath("/invoices");
  redirect(`/invoices?day=${day}`);
}

export async function deleteInvoice(form: FormData) {
  const id = text(form, "id");
  const day = normalizeDay(text(form, "day"));

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect(`/invoices?day=${day}`);
}
