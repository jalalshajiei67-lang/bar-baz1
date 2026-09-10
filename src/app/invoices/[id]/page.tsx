import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteInvoice,
  setInvoicePaid,
  setInvoiceStatus,
} from "@/app/actions/invoices";
import { Banner } from "@/components/banner";
import { ConfirmButton, PrintButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDay, faDayShort, isoDay, kg, money } from "@/lib/format";
import { btnGhost, btnPrimary, card, rowBorder, td, th } from "@/lib/ui";

import { AddItemForm, type FruitOption } from "./add-item-form";
import { ItemsEditor, type EditableItem } from "./items-editor";

export const dynamic = "force-dynamic";

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

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { createdAt: "asc" },
        include: { fruit: { select: { name: true } } },
      },
    },
  });

  if (!invoice) notFound();

  const day = isoDay(invoice.day);
  const isDraft = invoice.status === "DRAFT";

  // Prices are bargained per customer, so the useful hint is what this shop
  // paid last; anyone else's last price is only a fallback for a new fruit.
  const [activeFruits, customerPrices, anyPrices] = await Promise.all([
    prisma.fruit.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.invoiceItem.findMany({
      where: {
        unitPrice: { gt: 0 },
        invoiceId: { not: invoice.id },
        invoice: { customerId: invoice.customerId },
      },
      orderBy: [{ invoice: { day: "desc" } }, { createdAt: "desc" }],
      take: HISTORY_LIMIT,
      select: {
        fruitId: true,
        unitPrice: true,
        invoice: { select: { day: true } },
      },
    }),
    prisma.invoiceItem.findMany({
      where: { unitPrice: { gt: 0 }, invoiceId: { not: invoice.id } },
      orderBy: [{ invoice: { day: "desc" } }, { createdAt: "desc" }],
      take: HISTORY_LIMIT,
      select: {
        fruitId: true,
        unitPrice: true,
        invoice: { select: { day: true } },
      },
    }),
  ]);

  const byCustomer = latestPerFruit(customerPrices);
  const byAnyone = latestPerFruit(anyPrices);

  const fruits: FruitOption[] = activeFruits.map((fruit) => {
    const mine = byCustomer.get(fruit.id);
    const last = mine ?? byAnyone.get(fruit.id);
    return {
      id: fruit.id,
      name: fruit.name,
      lastPrice: last?.price ?? "",
      lastPriceNote: last
        ? `${mine ? "همین مشتری" : "فاکتور دیگر"} · ${faDayShort(last.day)}`
        : null,
    };
  });

  const editableItems: EditableItem[] = invoice.items.map((item) => ({
    id: item.id,
    name: item.fruit.name,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
  }));

  const itemsTable = (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>میوه</th>
            <th className={th}>وزن</th>
            <th className={th}>قیمت</th>
            <th className={th}>مبلغ</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.length === 0 ? (
            <tr className={rowBorder}>
              <td className={`${td} py-6 text-center opacity-60`} colSpan={4}>
                هنوز ردیفی اضافه نشده است.
              </td>
            </tr>
          ) : (
            invoice.items.map((item) => (
              <tr key={item.id} className={rowBorder}>
                <td className={`${td} font-medium`}>{item.fruit.name}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {kg(item.quantity)}
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {Number(item.unitPrice) > 0 ? (
                    money(item.unitPrice)
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
                </td>
                <td
                  className={`${td} font-medium whitespace-nowrap tabular-nums`}
                >
                  {money(item.lineTotal)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
            {invoice.customer.name}
          </h1>
          <p className="mt-0.5 text-sm opacity-60">{faDay(day)}</p>
          {invoice.customer.address ? (
            <p className="mt-0.5 text-sm opacity-60">
              {invoice.customer.address}
            </p>
          ) : null}
        </div>

        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
            isDraft
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {isDraft ? "پیش‌نویس" : "نهایی"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 print:hidden">
        <PrintButton className={btnGhost} />
        <form action={setInvoiceStatus}>
          <input type="hidden" name="id" value={invoice.id} />
          <input
            type="hidden"
            name="status"
            value={isDraft ? "FINAL" : "DRAFT"}
          />
          <button type="submit" className={isDraft ? btnPrimary : btnGhost}>
            {isDraft ? "ذخیره" : "بازگرداندن به پیش‌نویس"}
          </button>
        </form>
        <form action={deleteInvoice} className="ms-auto">
          <input type="hidden" name="id" value={invoice.id} />
          <input type="hidden" name="day" value={day} />
          <ConfirmButton message="این فاکتور حذف شود؟">حذف</ConfirmButton>
        </form>
      </div>

      {error ? (
        <div className="mt-4 print:hidden">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      {isDraft ? (
        <>
          <div className={`${card} mt-5 p-4 print:hidden`}>
            {activeFruits.length === 0 ? (
              <p className="text-sm opacity-70">
                ابتدا در صفحه‌ی{" "}
                <Link href="/fruits" className="underline">
                  میوه‌ها
                </Link>{" "}
                چند میوه اضافه کنید.
              </p>
            ) : (
              <AddItemForm invoiceId={invoice.id} fruits={fruits} />
            )}
          </div>

          {invoice.items.length === 0 ? (
            <div
              className={`${card} mt-5 p-8 text-center text-sm opacity-60 print:hidden`}
            >
              هنوز ردیفی اضافه نشده است.
            </div>
          ) : (
            <div className="mt-5">
              <ItemsEditor invoiceId={invoice.id} items={editableItems} />
            </div>
          )}

          <div className="mt-5 hidden print:block">{itemsTable}</div>
        </>
      ) : (
        <div className="mt-5">{itemsTable}</div>
      )}

      <div
        className={`mt-4 items-center justify-between rounded-xl bg-emerald-600/10 px-4 py-3 print:flex ${
          isDraft ? "hidden" : "flex"
        }`}
      >
        <span className="text-sm font-medium">جمع کل فاکتور</span>
        <span className="text-lg font-semibold tabular-nums">
          {money(invoice.total)}{" "}
          <span className="text-sm font-normal opacity-70">تومان</span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 print:hidden">
        <form action={setInvoicePaid}>
          <input type="hidden" name="id" value={invoice.id} />
          <input type="hidden" name="paid" value="true" />
          <button
            type="submit"
            disabled={invoice.paid}
            className={`w-full rounded-xl px-4 py-4 text-base font-semibold transition disabled:cursor-not-allowed ${
              invoice.paid
                ? "bg-emerald-600 text-white opacity-100"
                : "border-2 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 dark:text-emerald-400"
            }`}
          >
            پرداخت شده ✓
          </button>
        </form>
        <form action={setInvoicePaid}>
          <input type="hidden" name="id" value={invoice.id} />
          <input type="hidden" name="paid" value="false" />
          <button
            type="submit"
            disabled={!invoice.paid}
            className={`w-full rounded-xl px-4 py-4 text-base font-semibold transition disabled:cursor-not-allowed ${
              !invoice.paid
                ? "bg-red-600 text-white opacity-100"
                : "border-2 border-red-600/30 text-red-700 hover:bg-red-600/10 dark:text-red-400"
            }`}
          >
            پرداخت نشده ✕
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs opacity-50 print:hidden">
        قیمت هر ردیف همان چیزی است که با این مشتری توافق شده و روی فاکتور ذخیره
        می‌شود؛ فاکتورهای دیگر با آن عوض نمی‌شوند.
      </p>
    </main>
  );
}
