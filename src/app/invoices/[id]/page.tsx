import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteInvoice,
  deleteInvoiceItem,
  setInvoicePaid,
  setInvoiceStatus,
  updateInvoiceItem,
} from "@/app/actions/invoices";
import { Banner } from "@/components/banner";
import { ConfirmButton, PrintButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDay, isoDay, kg, money } from "@/lib/format";
import {
  btnGhost,
  btnPrimary,
  card,
  input,
  rowBorder,
  td,
  th,
} from "@/lib/ui";

import { AddItemForm, type PricedFruit } from "./add-item-form";

export const dynamic = "force-dynamic";

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

  const prices = await prisma.dailyPrice.findMany({
    where: { day: invoice.day, fruit: { active: true } },
    orderBy: { fruit: { name: "asc" } },
    include: { fruit: { select: { id: true, name: true } } },
  });

  const fruits: PricedFruit[] = prices.map((row) => ({
    id: row.fruit.id,
    name: row.fruit.name,
    price: row.price.toString(),
  }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {invoice.customer.name}
          </h1>
          <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>
          {invoice.customer.address ? (
            <p className="mt-0.5 text-sm opacity-60">
              {invoice.customer.address}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              isDraft
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {isDraft ? "پیش‌نویس" : "نهایی"}
          </span>
          <PrintButton className={btnGhost} />
          <form action={setInvoiceStatus}>
            <input type="hidden" name="id" value={invoice.id} />
            <input
              type="hidden"
              name="status"
              value={isDraft ? "FINAL" : "DRAFT"}
            />
            <button type="submit" className={isDraft ? btnPrimary : btnGhost}>
              {isDraft ? "نهایی کردن" : "بازگرداندن به پیش‌نویس"}
            </button>
          </form>
          <form action={deleteInvoice}>
            <input type="hidden" name="id" value={invoice.id} />
            <input type="hidden" name="day" value={day} />
            <ConfirmButton message="این فاکتور حذف شود؟">حذف</ConfirmButton>
          </form>
        </div>
      </div>

      {error ? (
        <div className="mb-4 print:hidden">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      {isDraft ? (
        <div className={`${card} mb-6 p-4 print:hidden`}>
          {fruits.length === 0 ? (
            <p className="text-sm opacity-70">
              برای این تاریخ هیچ قیمتی ثبت نشده است.{" "}
              <Link href={`/prices?day=${day}`} className="underline">
                ابتدا قیمت روز را وارد کنید
              </Link>
              .
            </p>
          ) : (
            <AddItemForm invoiceId={invoice.id} fruits={fruits} />
          )}
        </div>
      ) : null}

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr>
              <th className={th}>میوه</th>
              <th className={th}>وزن (کیلوگرم)</th>
              <th className={th}>قیمت هر کیلو</th>
              <th className={th}>مبلغ</th>
              {isDraft ? <th className={`${th} print:hidden`} /> : null}
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr className={rowBorder}>
                <td className={`${td} py-6 text-center opacity-60`} colSpan={5}>
                  هنوز ردیفی اضافه نشده است.
                </td>
              </tr>
            ) : (
              invoice.items.map((item) => (
                <tr key={item.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>{item.fruit.name}</td>
                  <td className={td} dir="ltr">
                    {isDraft ? (
                      <form
                        action={updateInvoiceItem}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="itemId" value={item.id} />
                        <input
                          name="quantity"
                          defaultValue={item.quantity.toString()}
                          className={`${input} w-24 py-1`}
                          inputMode="decimal"
                          aria-label={`وزن ${item.fruit.name}`}
                        />
                        <button
                          type="submit"
                          className="rounded px-1 text-xs opacity-60 hover:opacity-100 print:hidden"
                        >
                          ثبت
                        </button>
                      </form>
                    ) : (
                      kg(item.quantity)
                    )}
                  </td>
                  <td className={td}>{money(item.unitPrice)}</td>
                  <td className={`${td} font-medium`}>{money(item.lineTotal)}</td>
                  {isDraft ? (
                    <td className={`${td} text-end print:hidden`}>
                      <form action={deleteInvoiceItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <ConfirmButton
                          message={`ردیف «${item.fruit.name}» حذف شود؟`}
                          className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          حذف
                        </ConfirmButton>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600/10 px-4 py-3">
        <span className="text-sm font-medium">جمع کل فاکتور</span>
        <span className="text-lg font-semibold">
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
        قیمت هر ردیف در لحظه‌ی ثبت از قیمت همان روز برداشته می‌شود؛ تغییر بعدی
        قیمت‌ها این فاکتور را عوض نمی‌کند.
      </p>
    </main>
  );
}
