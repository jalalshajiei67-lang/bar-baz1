import Link from "next/link";

import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDay,
  faMonth,
  kg,
  money,
  normalizeDay,
  shiftDay,
  todayISO,
} from "@/lib/format";
import { fromJalali, toJalali } from "@/lib/jalali";
import { btnGhost, card, rowBorder, td, th } from "@/lib/ui";

import { NewInvoiceForm } from "./new-invoice-form";

export const dynamic = "force-dynamic";

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const day = normalizeDay((await props.searchParams).day);
  const today = todayISO();

  const jalaliMonth = toJalali(dayToDate(day));
  const monthStart = fromJalali({ ...jalaliMonth, day: 1 });
  const monthEnd = fromJalali(
    jalaliMonth.month === 12
      ? { year: jalaliMonth.year + 1, month: 1, day: 1 }
      : { year: jalaliMonth.year, month: jalaliMonth.month + 1, day: 1 },
  );

  const [invoices, customers, fleets, unpaidInvoices, monthItems] =
    await Promise.all([
    prisma.invoice.findMany({
      where: { day: dayToDate(day) },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { name: true } },
        fleet: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.fleet.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: { paid: false, status: "FINAL" },
      orderBy: { day: "desc" },
      select: {
        customerId: true,
        total: true,
        paidAmount: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.invoiceItem.findMany({
      where: {
        invoice: { day: { gte: monthStart, lt: monthEnd }, status: "FINAL" },
      },
      select: { quantity: true, fruit: { select: { id: true, name: true } } },
    }),
  ]);

  const dayTotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );

  const debtByCustomer = new Map<string, { name: string; total: number }>();
  for (const invoice of unpaidInvoices) {
    const entry = debtByCustomer.get(invoice.customerId) ?? {
      name: invoice.customer.name,
      total: 0,
    };
    // Part-payments taken on /finance have already come off this invoice.
    entry.total += Math.max(Number(invoice.total) - Number(invoice.paidAmount), 0);
    debtByCustomer.set(invoice.customerId, entry);
  }
  const debtors = [...debtByCustomer.entries()]
    .map(([customerId, entry]) => ({ customerId, ...entry }))
    .filter((debtor) => debtor.total > 0)
    .sort((a, b) => b.total - a.total);
  const debtTotal = debtors.reduce((sum, debtor) => sum + debtor.total, 0);

  const fruitTotals = new Map<string, { name: string; total: number }>();
  for (const item of monthItems) {
    const entry = fruitTotals.get(item.fruit.id) ?? {
      name: item.fruit.name,
      total: 0,
    };
    entry.total += Number(item.quantity);
    fruitTotals.set(item.fruit.id, entry);
  }
  const fruitSales = [...fruitTotals.entries()]
    .map(([fruitId, entry]) => ({ fruitId, ...entry }))
    .sort((a, b) => b.total - a.total);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">فاکتورها</h1>
      <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-2">
        <Link href={`/invoices?day=${shiftDay(day, -1)}`} className={btnGhost}>
          روز قبل
        </Link>
        <JalaliDatePicker day={day} basePath="/invoices" />
        <Link href={`/invoices?day=${shiftDay(day, 1)}`} className={btnGhost}>
          روز بعد
        </Link>
        {day !== today ? (
          <Link href={`/invoices?day=${today}`} className={btnGhost}>
            امروز
          </Link>
        ) : null}
      </div>

      <div className={`${card} mb-6 p-4`}>
        {customers.length === 0 ? (
          <p className="text-sm opacity-60">
            ابتدا در صفحه‌ی{" "}
            <Link href="/customers/new" className="underline">
              مشتری‌ها
            </Link>{" "}
            یک مشتری اضافه کنید.
          </p>
        ) : fleets.length === 0 ? (
          <p className="text-sm opacity-60">
            ابتدا در صفحه‌ی{" "}
            <Link href="/fleets" className="underline">
              ناوگان
            </Link>{" "}
            ماشین‌هایتان را اضافه کنید.
          </p>
        ) : (
          <NewInvoiceForm day={day} customers={customers} fleets={fleets} />
        )}
      </div>

      {debtors.length > 0 ? (
        <div className={`${card} mb-6 p-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">بدهکاران</h2>
            <Link href="/finance" className={`${btnGhost} text-xs`}>
              مدیریت پرداخت‌ها
            </Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>مشتری</th>
                  <th className={th}>مانده (تومان)</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((debtor) => (
                  <tr key={debtor.customerId} className={rowBorder}>
                    <td className={`${td} font-medium`}>{debtor.name}</td>
                    <td
                      className={`${td} font-semibold tabular-nums text-red-600 dark:text-red-400`}
                    >
                      {money(debtor.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={rowBorder}>
                  <td className={`${td} opacity-60`}>جمع کل</td>
                  <td className={`${td} font-semibold tabular-nums`}>
                    {money(debtTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          برای این روز فاکتوری ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr>
                <th className={th}>مشتری</th>
                <th className={th}>ناوگان</th>
                <th className={th}>ردیف</th>
                <th className={th}>وضعیت</th>
                <th className={th}>مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="hover:underline"
                    >
                      {invoice.customer.name}
                    </Link>
                  </td>
                  <td className={`${td} opacity-70`}>
                    {invoice.fleet?.name ?? "—"}
                  </td>
                  <td className={`${td} opacity-70`}>{invoice._count.items}</td>
                  <td className={td}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        invoice.status === "FINAL"
                          ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {invoice.status === "FINAL" ? "نهایی" : "پیش‌نویس"}
                    </span>
                  </td>
                  <td className={`${td} font-medium`}>{money(invoice.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={rowBorder}>
                <td className={`${td} opacity-60`} colSpan={4}>
                  جمع کل روز
                </td>
                <td className={`${td} font-semibold`}>{money(dayTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className={`${card} mt-6 p-4`}>
        <h2 className="text-sm font-semibold">
          جمع فروش میوه‌ها در {faMonth(monthStart)}
        </h2>
        {fruitSales.length === 0 ? (
          <p className="mt-3 text-sm opacity-60">
            در این ماه فروشی ثبت نشده است.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>میوه</th>
                  <th className={th}>جمع فروش (کیلوگرم)</th>
                </tr>
              </thead>
              <tbody>
                {fruitSales.map((fruit) => (
                  <tr key={fruit.fruitId} className={rowBorder}>
                    <td className={`${td} font-medium`}>{fruit.name}</td>
                    <td className={`${td} font-semibold`}>
                      {kg(fruit.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
