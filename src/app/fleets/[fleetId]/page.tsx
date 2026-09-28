import Link from "next/link";
import { notFound } from "next/navigation";

import { FruitTotalsTable } from "@/components/fruit-totals";
import { PeriodNav } from "@/components/period-nav";
import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDay,
  faMonth,
  isoDay,
  kg,
  money,
  normalizeDay,
  toNum,
} from "@/lib/format";
import { fromJalali, toJalali } from "@/lib/jalali";
import { normalizePeriod, periodLabel, periodRange } from "@/lib/periods";
import { card, rowBorder, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

type MonthGroup = {
  key: string;
  monthStart: Date;
  invoiceCount: number;
  totalKg: number;
};

/**
 * A fleet's delivery history: an archive for any period (all time, or a Jalali
 * year, month, week or day) above a month-by-month summary. The admin gets here by
 * clicking a fleet's invoice count on `/fleets`; the driver's own `/fleet/[id]`
 * screen (singular) is a separate, day-based page for weighing loads.
 */
export default async function FleetHistoryPage(
  props: PageProps<"/fleets/[fleetId]">,
) {
  const { fleetId } = await props.params;
  const searchParams = await props.searchParams;
  const day = normalizeDay(searchParams.day);
  const period = normalizePeriod(searchParams.period);
  const range = periodRange(period, day);

  const fleet = await prisma.fleet.findUnique({
    where: { id: fleetId },
    select: { id: true, name: true, active: true },
  });
  if (!fleet) notFound();

  const selectedJalali = toJalali(dayToDate(day));
  const selectedKey =
    period === "month"
      ? `${selectedJalali.year}-${String(selectedJalali.month).padStart(2, "0")}`
      : null;

  // All of this fleet's finished deliveries, ever — grouped in JS by Jalali
  // month since Postgres doesn't know the Jalali calendar. Fine at this
  // business's scale; if it ever grows large, add a `day` range filter here
  // and page the month-history table separately.
  const invoices = await prisma.invoice.findMany({
    where: { fleetId, status: "FINAL" },
    orderBy: { day: "desc" },
    select: {
      id: true,
      day: true,
      total: true,
      customerId: true,
      customer: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          packCount: true,
          lineTotal: true,
          fruit: { select: { id: true, name: true } },
        },
      },
    },
  });

  const enriched = invoices.map((invoice) => {
    const j = toJalali(invoice.day);
    return {
      invoice,
      day: isoDay(invoice.day),
      key: `${j.year}-${String(j.month).padStart(2, "0")}`,
      jalaliYear: j.year,
      jalaliMonth: j.month,
      invoiceKg: invoice.items.reduce((sum, item) => sum + toNum(item.quantity), 0),
    };
  });

  const groups = new Map<string, MonthGroup>();
  for (const row of enriched) {
    const group = groups.get(row.key) ?? {
      key: row.key,
      monthStart: fromJalali({ year: row.jalaliYear, month: row.jalaliMonth, day: 1 }),
      invoiceCount: 0,
      totalKg: 0,
    };
    group.invoiceCount += 1;
    group.totalKg += row.invoiceKg;
    groups.set(row.key, group);
  }
  // `invoices` came ordered by day desc, so groups were inserted in that same
  // chronological order — no extra sort needed.
  const history = [...groups.values()];

  const selectedInvoices = range
    ? enriched.filter((row) => row.day >= range.start && row.day < range.end)
    : enriched;
  const selectedKg = selectedInvoices.reduce((sum, row) => sum + row.invoiceKg, 0);
  const selectedAmount = selectedInvoices.reduce(
    (sum, row) => sum + toNum(row.invoice.total),
    0,
  );

  const byCustomer = new Map<string, { name: string; count: number; kg: number; amount: number }>();
  for (const row of selectedInvoices) {
    const entry = byCustomer.get(row.invoice.customerId) ?? {
      name: row.invoice.customer.name,
      count: 0,
      kg: 0,
      amount: 0,
    };
    entry.count += 1;
    entry.kg += row.invoiceKg;
    entry.amount += toNum(row.invoice.total);
    byCustomer.set(row.invoice.customerId, entry);
  }
  const customerTotals = [...byCustomer.entries()]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/fleets" className="text-sm opacity-60 hover:underline">
        ← ناوگان
      </Link>

      <div className="mt-2 mb-6 flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{fleet.name}</h1>
        {!fleet.active ? (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs opacity-60 dark:bg-white/10">
            غیرفعال
          </span>
        ) : null}
      </div>

      <div className={`${card} mb-6 p-4`}>
        <h2 className="text-sm font-semibold">بایگانی</h2>
        <p className="mt-0.5 mb-3 text-xs opacity-60">{periodLabel(period, day)}</p>

        <PeriodNav basePath={`/fleets/${fleet.id}`} period={period} day={day} />

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {selectedInvoices.length}
            </div>
            <div className="text-xs opacity-60">فاکتور تحویل‌شده</div>
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">{kg(selectedKg)}</div>
            <div className="text-xs opacity-60">کیلوگرم</div>
          </div>
          <div className="col-span-2 rounded-lg bg-black/[0.03] py-2 dark:bg-white/[0.04]">
            <div className="text-2xl font-semibold tabular-nums">
              {money(selectedAmount)}
            </div>
            <div className="text-xs opacity-60">جمع فاکتورها (تومان)</div>
          </div>
        </div>
      </div>

      <FruitTotalsTable
        items={selectedInvoices.flatMap((row) => row.invoice.items)}
        className="mb-6"
      />

      {customerTotals.length > 1 ? (
        <div className={`${card} mb-6 overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>مشتری</th>
                <th className={th}>فاکتور</th>
                <th className={th}>کیلوگرم</th>
                <th className={th}>مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {customerTotals.map((row) => (
                <tr key={row.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>{row.name}</td>
                  <td className={`${td} tabular-nums opacity-70`}>{row.count}</td>
                  <td className={`${td} tabular-nums opacity-70`}>{kg(row.kg)}</td>
                  <td className={`${td} tabular-nums`}>{money(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedInvoices.length === 0 ? (
        <div className={`${card} mb-6 p-8 text-center text-sm opacity-60`}>
          در این بازه فاکتوری برای این ناوگان ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} mb-6 overflow-x-auto`}>
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr>
                <th className={th}>مشتری</th>
                <th className={th}>تاریخ</th>
                <th className={th}>کیلوگرم</th>
                <th className={th}>مبلغ (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoices.map(({ invoice, invoiceKg }) => (
                <tr key={invoice.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.customer.name}
                    </Link>
                  </td>
                  <td className={`${td} opacity-70`}>{faDay(isoDay(invoice.day))}</td>
                  <td className={`${td} tabular-nums`}>{kg(invoiceKg)}</td>
                  <td className={`${td} font-medium tabular-nums`}>
                    {money(invoice.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`${card} overflow-x-auto`}>
        <div className="p-4 pb-0">
          <h2 className="text-sm font-semibold">سابقه ماه به ماه</h2>
        </div>
        {history.length === 0 ? (
          <p className="p-4 text-sm opacity-60">
            هنوز فاکتور نهایی‌شده‌ای برای این ناوگان ثبت نشده است.
          </p>
        ) : (
          <table className="mt-2 w-full min-w-[20rem] text-sm">
            <thead>
              <tr>
                <th className={th}>ماه</th>
                <th className={th}>فاکتور</th>
                <th className={th}>کیلوگرم</th>
              </tr>
            </thead>
            <tbody>
              {history.map((group) => (
                <tr key={group.key} className={rowBorder}>
                  <td className={td}>
                    <Link
                      href={`/fleets/${fleet.id}?period=month&day=${isoDay(group.monthStart)}`}
                      className={`hover:underline ${
                        group.key === selectedKey ? "font-semibold" : ""
                      }`}
                    >
                      {faMonth(group.monthStart)}
                    </Link>
                  </td>
                  <td className={`${td} tabular-nums opacity-70`}>{group.invoiceCount}</td>
                  <td className={`${td} tabular-nums opacity-70`}>{kg(group.totalKg)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
