"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { fieldErrors, fruitInput, text, type ActionState } from "@/lib/validation";

export async function createFruit(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = fruitInput.safeParse({
    name: text(form, "name"),
    unit: text(form, "unit") || "kg",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await prisma.fruit.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { ok: false, fieldErrors: { name: "این میوه قبلاً ثبت شده است" } };
  }

  await prisma.fruit.create({ data: parsed.data });
  revalidatePath("/fruits");
  revalidatePath("/prices");
  return { ok: true, message: "اضافه شد" };
}

export async function renameFruit(form: FormData) {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id || !name) redirect("/fruits");

  try {
    await prisma.fruit.update({ where: { id }, data: { name } });
  } catch {
    redirect(`/fruits?error=${encodeURIComponent("نام تکراری است")}`);
  }
  revalidatePath("/fruits");
  redirect("/fruits");
}

export async function toggleFruit(form: FormData) {
  const id = text(form, "id");
  const fruit = await prisma.fruit.findUnique({ where: { id } });
  if (!fruit) redirect("/fruits");

  await prisma.fruit.update({
    where: { id },
    data: { active: !fruit.active },
  });
  revalidatePath("/fruits");
  revalidatePath("/prices");
  redirect("/fruits");
}

export async function deleteFruit(form: FormData) {
  const id = text(form, "id");
  if (!id) redirect("/fruits");

  const used = await prisma.invoiceItem.count({ where: { fruitId: id } });
  if (used > 0) {
    redirect(
      `/fruits?error=${encodeURIComponent(
        "این میوه در فاکتورها استفاده شده است. به‌جای حذف، آن را غیرفعال کنید.",
      )}`,
    );
  }

  await prisma.fruit.delete({ where: { id } });
  revalidatePath("/fruits");
  revalidatePath("/prices");
  redirect("/fruits");
}
