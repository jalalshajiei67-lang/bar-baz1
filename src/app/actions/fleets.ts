"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { fieldErrors, fleetInput, text, type ActionState } from "@/lib/validation";

export async function createFleet(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = fleetInput.safeParse({ name: text(form, "name") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrors(parsed.error) };
  }

  const existing = await prisma.fleet.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { ok: false, fieldErrors: { name: "این ناوگان قبلاً ثبت شده است" } };
  }

  await prisma.fleet.create({ data: parsed.data });
  revalidatePath("/fleets");
  revalidatePath("/fleet");
  return { ok: true, message: "اضافه شد" };
}

export async function renameFleet(form: FormData) {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id || !name) redirect("/fleets");

  try {
    await prisma.fleet.update({ where: { id }, data: { name } });
  } catch {
    redirect(`/fleets?error=${encodeURIComponent("نام تکراری است")}`);
  }
  revalidatePath("/fleets");
  revalidatePath("/fleet");
  redirect("/fleets");
}

export async function toggleFleet(form: FormData) {
  const id = text(form, "id");
  const fleet = await prisma.fleet.findUnique({ where: { id } });
  if (!fleet) redirect("/fleets");

  await prisma.fleet.update({
    where: { id },
    data: { active: !fleet.active },
  });
  revalidatePath("/fleets");
  revalidatePath("/fleet");
  redirect("/fleets");
}

export async function deleteFleet(form: FormData) {
  const id = text(form, "id");
  if (!id) redirect("/fleets");

  const assigned = await prisma.invoice.count({ where: { fleetId: id } });
  if (assigned > 0) {
    redirect(
      `/fleets?error=${encodeURIComponent(
        "این ناوگان فاکتور ثبت‌شده دارد. به‌جای حذف، آن را غیرفعال کنید.",
      )}`,
    );
  }

  await prisma.fleet.delete({ where: { id } });
  revalidatePath("/fleets");
  revalidatePath("/fleet");
  redirect("/fleets");
}
