"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dayToDate, normalizeDay } from "@/lib/format";
import {
  dayInput,
  numeric,
  packCount,
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
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  return { ok: true, price: new Prisma.Decimal(parsed.data) };
}

/**
 * The admin builds a line before anything is weighed, so an empty or zero
 * weight is a legitimate "not weighed yet" and stores 0 — the same convention
 * `parsePrice` uses for a price nobody has agreed on. `submitDelivery` is the
 * one place that refuses it, because handing the load over means it was weighed.
 */
function parseQuantity(
  raw: string,
): { ok: true; quantity: Prisma.Decimal } | { ok: false; message: string } {
  if (raw === "" || /^0+(\.0+)?$/.test(raw)) return { ok: true, quantity: ZERO };
  const parsed = quantityInput.safeParse(raw);
  if (!parsed.success)
    return { ok: false, message: parsed.error.issues[0].message };
  return { ok: true, quantity: new Prisma.Decimal(parsed.data) };
}

/** Re-reads the lines, stores the sum on the invoice, and returns it. */
async function recalculateTotal(invoiceId: string): Promise<Prisma.Decimal> {
  const sum = await prisma.invoiceItem.aggregate({
    where: { invoiceId },
    _sum: { lineTotal: true },
  });
  const total = sum._sum.lineTotal ?? ZERO;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { total } });
  return total;
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

/**
 * Opens today's draft for a customer, creating it the first time. The fleet is
 * chosen here and not changed afterwards: reopening an existing draft keeps the
 * vehicle it was already assigned to.
 */
export async function openInvoice(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const customerId = text(form, "customerId");
  const fleetId = text(form, "fleetId");
  const parsedDay = dayInput.safeParse(text(form, "day"));

  if (!customerId)
    return { ok: false, fieldErrors: { customerId: "مشتری را انتخاب کنید" } };
  if (!fleetId)
    return { ok: false, fieldErrors: { fleetId: "ناوگان را انتخاب کنید" } };
  if (!parsedDay.success)
    return { ok: false, fieldErrors: { day: "تاریخ معتبر نیست" } };

  const day = dayToDate(parsedDay.data);
  const existing = await prisma.invoice.findFirst({
    where: { customerId, day, status: "DRAFT" },
    select: { id: true },
  });

  const invoice =
    existing ??
    (await prisma.invoice.create({ data: { customerId, fleetId, day } }));

  revalidatePath("/invoices");
  revalidatePath("/fleet");
  redirect(`/invoices/${invoice.id}`);
}

/**
 * Adds a line to the load the admin is building: which fruit, and how many
 * boxes of it. Weight and price stay at 0 — the fleet fills those in at the
 * shop. Adding a fruit that is already on the invoice adds the boxes up and
 * leaves whatever weight and price the line already had.
 */
export async function addInvoiceItem(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await assertDraft(invoiceId);

  const fruitId = text(form, "fruitId");
  const packs = packCount(form, "packCount");

  if (!fruitId)
    return { ok: false, fieldErrors: { fruitId: "میوه را انتخاب کنید" } };

  const existing = await prisma.invoiceItem.findUnique({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    select: { packCount: true },
  });

  // Boxes add up across drops; two فله drops stay فله.
  const boxes = (existing?.packCount ?? 0) + (packs ?? 0);
  const merged = boxes > 0 ? boxes : null;

  await prisma.invoiceItem.upsert({
    where: { invoiceId_fruitId: { invoiceId, fruitId } },
    create: { invoiceId, fruitId, packCount: merged },
    update: { packCount: merged },
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/fleet");
  return { ok: true };
}

/**
 * Writes every line's weight and price in one pass, shared by the admin's save
 * and the fleet's delivery submit. `strict` is what separates them: the admin
 * may leave a line unweighed and unpriced, the fleet may not.
 */
async function writeLines(
  invoiceId: string,
  form: FormData,
  { strict }: { strict: boolean },
): Promise<
  | { ok: true; total: Prisma.Decimal }
  | { ok: false; errors: Record<string, string> }
> {
  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId },
    select: { id: true, packCount: true },
  });

  const errors: Record<string, string> = {};
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const item of items) {
    const parsedQuantity = parseQuantity(numeric(form, `quantity_${item.id}`));
    const parsedPrice = parsePrice(priceNumeric(form, `price_${item.id}`));

    if (!parsedQuantity.ok) errors[`quantity_${item.id}`] = parsedQuantity.message;
    if (!parsedPrice.ok) errors[`price_${item.id}`] = parsedPrice.message;
    if (!parsedQuantity.ok || !parsedPrice.ok) continue;

    if (strict && parsedQuantity.quantity.isZero()) {
      errors[`quantity_${item.id}`] = "وزن را وارد کنید";
    }
    if (strict && parsedPrice.price.isZero()) {
      errors[`price_${item.id}`] = "قیمت را وارد کنید";
    }
    if (errors[`quantity_${item.id}`] || errors[`price_${item.id}`]) continue;

    const quantity = parsedQuantity.quantity;
    const unitPrice = parsedPrice.price;
    // The packs field is disabled on the fleet's screen and so posts nothing;
    // falling back to the stored count keeps the admin's decision intact.
    const packs = form.has(`packCount_${item.id}`)
      ? packCount(form, `packCount_${item.id}`)
      : item.packCount;

    writes.push(
      prisma.invoiceItem.update({
        where: { id: item.id },
        data: {
          quantity,
          packCount: packs,
          unitPrice,
          lineTotal: quantity.mul(unitPrice).toDecimalPlaces(2),
        },
      }),
    );
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  await prisma.$transaction(writes);
  return { ok: true, total: await recalculateTotal(invoiceId) };
}

/**
 * The admin's save. Lines may still be unweighed and unpriced — the load has
 * not left yet.
 */
export async function saveInvoiceItems(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  await assertDraft(invoiceId);

  const result = await writeLines(invoiceId, form, { strict: false });
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.errors,
      message: "چند مقدار معتبر نیست",
    };
  }

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/fleet");
  return { ok: true, message: "ذخیره شد" };
}

/**
 * The fleet's one big button: the weights and prices from the shop door, the
 * paid/unpaid answer, and the invoice going final, all in one submit.
 *
 * Unlike the admin's actions this reports a finalized invoice back to the form
 * instead of redirecting — the driver is standing on a doorstep and should land
 * back on their own screen, not on an admin page.
 */
export async function submitDelivery(
  invoiceId: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { status: true },
  });
  if (!invoice) {
    return { ok: false, message: "این فاکتور پیدا نشد." };
  }
  if (invoice.status !== "DRAFT") {
    return { ok: false, message: "این فاکتور قبلاً ثبت شده است." };
  }

  const items = await prisma.invoiceItem.count({ where: { invoiceId } });
  if (items === 0) {
    return { ok: false, message: "این فاکتور هیچ ردیفی ندارد." };
  }

  const result = await writeLines(invoiceId, form, { strict: true });
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: result.errors,
      message: "وزن و قیمت همه‌ی ردیف‌ها را کامل کنید",
    };
  }

  // The driver answers for the whole invoice, so the part-paid amount follows:
  // paid leaves nothing owing, unpaid starts the debt at the full total.
  const paid = text(form, "paid") === "true";
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "FINAL", paid, paidAmount: paid ? result.total : ZERO },
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/fleet");
  revalidatePath("/finance");
  return { ok: true, message: "ثبت شد" };
}

/**
 * `itemId` is bound rather than posted: React reuses a button's `name` to encode
 * its `formAction`, so a delete button living inside the editing form cannot
 * carry a form field of its own.
 */
export async function deleteInvoiceItem(itemId: string, returnTo?: string) {
  const item = await prisma.invoiceItem.findUnique({
    where: { id: itemId },
    select: { invoiceId: true },
  });
  if (!item) redirect("/invoices");
  await assertDraft(item.invoiceId);

  await prisma.invoiceItem.delete({ where: { id: itemId } });
  await recalculateTotal(item.invoiceId);
  revalidatePath(`/invoices/${item.invoiceId}`);
  revalidatePath("/fleet");
  // The fleet deletes lines from its own screen and must land back on it.
  redirect(returnTo ?? `/invoices/${item.invoiceId}`);
}

export async function setInvoiceStatus(form: FormData) {
  const id = text(form, "id");
  const status = text(form, "status") === "FINAL" ? "FINAL" : "DRAFT";

  await prisma.invoice.update({ where: { id }, data: { status } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/fleet");
  redirect(`/invoices/${id}`);
}

/**
 * Settles or unsettles the whole invoice. Part-payments taken on `/finance` are
 * cleared either way: this button is about the invoice as a whole, so leaving a
 * stale part-payment behind would quietly understate the debt it reopens.
 */
export async function setInvoicePaid(form: FormData) {
  const id = text(form, "id");
  const paid = text(form, "paid") === "true";

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: { total: true },
  });
  if (!invoice) redirect("/invoices");

  await prisma.invoice.update({
    where: { id },
    data: { paid, paidAmount: paid ? invoice.total : ZERO },
  });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/fleet");
  revalidatePath("/finance");
  redirect(`/invoices/${id}`);
}

export async function deleteInvoice(form: FormData) {
  const id = text(form, "id");
  const day = normalizeDay(text(form, "day"));

  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  revalidatePath("/fleet");
  revalidatePath("/finance");
  redirect(`/invoices?day=${day}`);
}
