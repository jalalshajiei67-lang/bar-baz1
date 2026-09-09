"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  customerInput,
  fieldErrors,
  optionalNumber,
  optionalText,
  text,
  type ActionState,
} from "@/lib/validation";

function readForm(form: FormData) {
  return customerInput.safeParse({
    name: text(form, "name"),
    address: optionalText(form, "address"),
    phone: optionalText(form, "phone"),
    note: optionalText(form, "note"),
    lat: optionalNumber(form, "lat"),
    lng: optionalNumber(form, "lng"),
  });
}

export async function createCustomer(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = readForm(form);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  }

  const customer = await prisma.customer.create({ data: parsed.data });
  revalidatePath("/customers");
  redirect(`/customers/${customer.id}?saved=1`);
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = readForm(form);
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  }

  await prisma.customer.update({ where: { id }, data: parsed.data });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { ok: true, message: "ذخیره شد" };
}

export async function deleteCustomer(form: FormData) {
  const id = text(form, "id");
  if (!id) redirect("/customers");

  const invoices = await prisma.invoice.count({ where: { customerId: id } });
  if (invoices > 0) {
    redirect(
      `/customers?error=${encodeURIComponent(
        "این مشتری فاکتور ثبت‌شده دارد و حذف نمی‌شود. ابتدا فاکتورهایش را حذف کنید.",
      )}`,
    );
  }

  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
  redirect("/customers");
}
