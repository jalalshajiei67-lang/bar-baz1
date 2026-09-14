import { prisma } from "@/lib/db";
import { faDayShort, isoDay } from "@/lib/format";

/** How many past lines to scan when looking up a fruit's last agreed price. */
const HISTORY_LIMIT = 400;

type PriceHistoryRow = {
  fruitId: string;
  unitPrice: { toString(): string };
  invoice: { day: Date };
};

/** Rows arrive newest-first, so the first hit per fruit is the latest price. */
function latestPerFruit(rows: PriceHistoryRow[]) {
  const latest = new Map<string, { price: string; day: string }>();
  for (const row of rows) {
    if (!latest.has(row.fruitId)) {
      latest.set(row.fruitId, {
        // Bare digits: the price field groups them for display itself.
        price: String(Math.round(Number(row.unitPrice.toString()))),
        day: isoDay(row.invoice.day),
      });
    }
  }
  return latest;
}

const historySelect = {
  fruitId: true,
  unitPrice: true,
  invoice: { select: { day: true } },
} as const;

const historyOrder = [
  { invoice: { day: "desc" } },
  { createdAt: "desc" },
] as const;

export type PriceHint = { price: string; note: string };

/**
 * The last price each fruit was sold at, ready to show beside a price field.
 *
 * Prices are bargained per customer, so the useful hint is what this shop paid
 * last; anyone else's last price is only a fallback for a fruit this customer
 * has never bought.
 */
export async function lastPrices(
  invoiceId: string,
  customerId: string,
): Promise<Map<string, PriceHint>> {
  const [customerPrices, anyPrices] = await Promise.all([
    prisma.invoiceItem.findMany({
      where: {
        unitPrice: { gt: 0 },
        invoiceId: { not: invoiceId },
        invoice: { customerId },
      },
      orderBy: [...historyOrder],
      take: HISTORY_LIMIT,
      select: historySelect,
    }),
    prisma.invoiceItem.findMany({
      where: { unitPrice: { gt: 0 }, invoiceId: { not: invoiceId } },
      orderBy: [...historyOrder],
      take: HISTORY_LIMIT,
      select: historySelect,
    }),
  ]);

  const byCustomer = latestPerFruit(customerPrices);
  const byAnyone = latestPerFruit(anyPrices);

  const hints = new Map<string, PriceHint>();
  for (const fruitId of new Set([...byCustomer.keys(), ...byAnyone.keys()])) {
    const mine = byCustomer.get(fruitId);
    const last = mine ?? byAnyone.get(fruitId);
    if (!last) continue;
    hints.set(fruitId, {
      price: last.price,
      note: `${mine ? "همین مشتری" : "فاکتور دیگر"} · ${faDayShort(last.day)}`,
    });
  }
  return hints;
}
