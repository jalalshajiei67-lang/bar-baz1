"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dayToDate } from "@/lib/format";
import {
  dayInput,
  numeric,
  priceInput,
  text,
  type ActionState,
} from "@/lib/validation";

/**
 * Saves the whole price table for one day in a single transaction.
 * An empty field removes that fruit's price for the day; every other day is
 * left untouched, which is what makes the table an archive.
 */
export async function saveDailyPrices(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsedDay = dayInput.safeParse(text(form, "day"));
  if (!parsedDay.success) {
    return { ok: false, message: "تاریخ معتبر نیست" };
  }
  const day = dayToDate(parsedDay.data);

  const fruits = await prisma.fruit.findMany({
    where: { active: true },
    select: { id: true, name: true },
  });

  const errors: Record<string, string> = {};
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const fruit of fruits) {
    const raw = numeric(form, `price_${fruit.id}`);

    if (raw === "") {
      writes.push(
        prisma.dailyPrice.deleteMany({ where: { fruitId: fruit.id, day } }),
      );
      continue;
    }

    const parsed = priceInput.safeParse(raw);
    if (!parsed.success) {
      errors[`price_${fruit.id}`] = parsed.error.issues[0].message;
      continue;
    }

    const price = new Prisma.Decimal(parsed.data);
    writes.push(
      prisma.dailyPrice.upsert({
        where: { fruitId_day: { fruitId: fruit.id, day } },
        create: { fruitId: fruit.id, day, price },
        update: { price },
      }),
    );
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, fieldErrors: errors, message: "چند قیمت معتبر نیست" };
  }

  await prisma.$transaction(writes);
  revalidatePath("/prices");
  return { ok: true, message: "قیمت‌های امروز ذخیره شد" };
}
