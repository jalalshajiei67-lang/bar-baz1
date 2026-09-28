import Link from "next/link";
import { notFound } from "next/navigation";

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
  todayISO,
} from "@/lib/format";
import { fromJalali, jalaliMonthLength, toJalali } from "@/lib/jalali";
import { btnGhost, card, rowBorder, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

type MonthGroup = {
  key: string;
  monthStart: Date;
  invoiceCount: number;
  totalKg: number;
};

/** "YYYY-MM-DD" shifted by n Jalali months, clamped to the target month's length. */
function shiftJalaliMonth(day: string, delta: number): string {
  const current = toJalali(dayToDate(day));
  let month = current.month + delta;
  let year = current.year;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }
  const length = jalaliMonthLength(year, month);
  return isoDay(fromJalali({ year, month, day: Math.min(current.day, length) }));
}

/**
 * A fleet's delivery history, grouped by Jalali month. The admin gets here by
 * clicking a fleet's invoice count on `/fleets`; the driver's own `/fleet/[id]`
 * screen (singular) is a separate, day-based page for weighing loads.
 */
export default async function FleetHistoryPage(
  props: PageProps<"/fleets/[fleetId]">,
) {
  const { fleetId } = await props.params;
  const day = normalizeDay((await props.searchParams).day);
  const today = todayISO();

  const fleet = await prisma.fleet.findUnique({
    where: { id: fleetId },
    select: { id: true, name: true, active: true },
  });
  if (!fleet) notFound();

  const jalaliMonth = toJalali(dayToDate(day));
  const monthStart = fromJalali({ ...jalaliMonth, day: 1 });
  const selectedKey = `${jalaliMonth.year}-${String(jalaliMonth.month).padStart(2, "0")}`;
  const todayJalali = toJalali(dayToDate(today));
  const isCurrentMonth =
    jalaliMonth.year === todayJalali.year && jalaliMonth.month === todayJalali.month;

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
      customer: { select: { name: true } },
      items: { select: { quantity: true } },
    },
  });

  const enriched = invoices.map((invoice) => {
    const j = toJalali(invoice.day);
    return {
      invoice,
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
  const selected = groups.get(selectedKey);
  const selectedInvoices = enriched.filter((row) => row.key === selectedKey);

  const prevMonthDay = shiftJalaliMonth(day, -1);
  const nextMonthDay = shiftJalaliMonth(day, 1);

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
        <div className="flex items-center justify-between gap-2">
          <Link href={`/fleets/${fleet.id}?day=${prevMonthDay}`} className={btnGhost}>
            ماه قبل
          </Link>
          <span className="text-sm font-medium">{faMonth(monthStart)}</span>
          <Link href={`/fleets/${fleet.id}?day=${nextMonthDay}`} className={btnGhost}>
            ماه بعد
          </Link>
        </div>

        {!isCurrentMonth ? (
          <div className="mt-2 text-center">
            <Link
              href={`/fleets/${fleet.id}`}
              className="text-xs underline opacity-60 hover:opacity-100"
            >
              بازگشت به ماه جاری
            </Link>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {selected?.invoiceCount ?? 0}
            </div>
            <div className="text-xs opacity-60">فاکتور تحویل‌شده</div>
          </div>
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              {kg(selected?.totalKg ?? 0)}
            </div>
            <div className="text-xs opacity-60">کیلوگرم</div>
          </div>
        </div>
      </div>

      {selectedInvoices.length === 0 ? (
        <div className={`${card} mb-6 p-8 text-center text-sm opacity-60`}>
          در {faMonth(monthStart)} فاکتوری برای این ناوگان ثبت نشده است.
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
                      href={`/fleets/${fleet.id}?day=${isoDay(group.monthStart)}`}
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
