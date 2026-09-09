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
  quantityInput,
  text,
  type ActionState,
} from "@/lib/validation";

/** Re-reads the lines and stores the sum on the invoice. */
async function recalculateTotal(invoiceId: string) {
  const sum = await prisma.invoiceItem.aggregate({
    where: { invoiceId },
    _sum: { lineTotal: true },
  });
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { total: sum._sum.lineTotal ?? new Prisma.Decimal(0) },
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
 * Adds a line. The unit price is copied from that day's DailyPrice, so a later
 * price change never rewrites this invoice.
 */
export async function addInvoiceItem(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await assertDraft(invoiceId);

  const fruitId = text(form, "fruitId");
  const parsedQuantity = quantityInput.safeParse(numeric(form, "quantity"));

  if (!fruitId) return { ok: false, fieldErrors: { fruitId: "میوه را انتخاب کنید" } };
  if (!parsedQuantity.success) {
    return { ok: false, fieldErrors: fieldErrors(parsedQuantity.error) };
  }

  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { day: true },
  });

  const dailyPrice = await prisma.dailyPrice.findUnique({
    where: { fruitId_day: { fruitId, day: invoice.day } },
    select: { price: true },
  });

  if (!dailyPrice) {
    return {
      ok: false,
      fieldErrors: { fruitId: "برای این میوه در این تاریخ قیمتی ثبت نشده است" },
    };
  }

  const existing = await prisma.invoiceItem.findUnique({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    select: { quantity: true },
  });

  // Adding the same fruit twice adds up — two crates of the same thing.
  const quantity = new Prisma.Decimal(parsedQuantity.data).plus(
    existing?.quantity ?? 0,
  );
  const lineTotal = quantity.mul(dailyPrice.price).toDecimalPlaces(2);

  await prisma.invoiceItem.upsert({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    create: {
      invoiceId,
      fruitId,
      quantity,
      unitPrice: dailyPrice.price,
      lineTotal,
    },
    update: { quantity, unitPrice: dailyPrice.price, lineTotal },
  });

  await recalculateTotal(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true };
}

export async function updateInvoiceItem(form: FormData) {
  const itemId = text(form, "itemId");
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    select: { invoiceId: true, unitPrice: true },
  });
  if (!item) redirect("/invoices");
  await assertDraft(item.invoiceId);

  const parsed = quantityInput.safeParse(numeric(form, "quantity"));
  if (!parsed.success) {
    redirect(
      `/invoices/${item.invoiceId}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }

  const quantity = new Prisma.Decimal(parsed.data);
  await prisma.invoiceItem.update({
    where: { id: itemId },
    data: {
      quantity,
      lineTotal: quantity.mul(item.unitPrice).toDecimalPlaces(2),
    },
  });

  await recalculateTotal(item.invoiceId);
  revalidatePath(`/invoices/${item.invoiceId}`);
  redirect(`/invoices/${item.invoiceId}`);
}

export async function deleteInvoiceItem(form: FormData) {
  const itemId = text(form, "itemId");
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

export async function deleteInvoice(form: FormData) {
  const id = text(form, "id");
  const day = normalizeDay(text(form, "day"));

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect(`/invoices?day=${day}`);
}
