import Link from "next/link";

import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDay,
  money,
  normalizeDay,
  shiftDay,
  todayISO,
} from "@/lib/format";
import { btnGhost, card, input, rowBorder, td, th } from "@/lib/ui";

import { NewInvoiceForm } from "./new-invoice-form";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string }>;
}) {
  const day = normalizeDay((await searchParams).day);
  const today = todayISO();

  const [invoices, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { day: dayToDate(day) },
      orderBy: { createdAt: "asc" },
      include: {
        customer: { select: { name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const dayTotal = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">فاکتورها</h1>
      <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>

      <div className="mt-4 mb-6 flex flex-wrap items-center gap-2">
        <Link href={`/invoices?day=${shiftDay(day, -1)}`} className={btnGhost}>
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
        ) : (
          <NewInvoiceForm day={day} customers={customers} />
        )}
      </div>

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
                <td className={`${td} opacity-60`} colSpan={3}>
                  جمع کل روز
                </td>
                <td className={`${td} font-semibold`}>{money(dayTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </main>
  );
}
