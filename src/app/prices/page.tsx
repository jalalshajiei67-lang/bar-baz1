import Link from "next/link";

import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDay,
  isoDay,
  normalizeDay,
  shiftDay,
  todayISO,
} from "@/lib/format";
import { btnGhost, card, input } from "@/lib/ui";

import { PriceTable, type PriceRow } from "./price-table";

export const dynamic = "force-dynamic";

/** How far back to look for a fruit's previous price. */
const LOOKBACK_DAYS = 120;

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const day = normalizeDay((await searchParams).day);
  const target = dayToDate(day);
  const today = todayISO();

  const [fruits, todaysPrices, history] = await Promise.all([
    prisma.fruit.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.dailyPrice.findMany({
      where: { day: target },
      select: { fruitId: true, price: true },
    }),
    prisma.dailyPrice.findMany({
      where: {
        day: { lt: target, gte: dayToDate(shiftDay(day, -LOOKBACK_DAYS)) },
      },
      orderBy: { day: "desc" },
      select: { fruitId: true, price: true, day: true },
    }),
  ]);

  const current = new Map(
    todaysPrices.map((row) => [row.fruitId, row.price.toString()]),
  );

  const previous = new Map<string, { price: string; day: string }>();
  for (const row of history) {
    if (!previous.has(row.fruitId)) {
      previous.set(row.fruitId, {
        price: row.price.toString(),
        day: isoDay(row.day),
      });
    }
  }

  const rows: PriceRow[] = fruits.map((fruit) => ({
    fruitId: fruit.id,
    name: fruit.name,
    current: current.get(fruit.id) ?? "",
    previous: previous.get(fruit.id)?.price ?? null,
    previousDay: previous.get(fruit.id)?.day ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">قیمت روز</h1>
      <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-2">
        <Link href={`/prices?day=${shiftDay(day, -1)}`} className={btnGhost}>
          روز قبل
        </Link>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="day"
            defaultValue={day}
            className={`${input} w-auto py-1.5`}
            dir="ltr"
          />
          <button type="submit" className={btnGhost}>
            نمایش
          </button>
        </form>
        <Link href={`/prices?day=${shiftDay(day, 1)}`} className={btnGhost}>
          روز بعد
        </Link>
        {day !== today ? (
          <Link href={`/prices?day=${today}`} className={btnGhost}>
            امروز
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          ابتدا در صفحه‌ی{" "}
          <Link href="/fruits" className="underline">
            میوه‌ها
          </Link>{" "}
          چند میوه اضافه کنید.
        </div>
      ) : (
        <PriceTable day={day} rows={rows} />
      )}
    </main>
  );
}
