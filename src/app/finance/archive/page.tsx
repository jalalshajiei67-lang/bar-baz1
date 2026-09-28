import Link from "next/link";

import { PeriodNav } from "@/components/period-nav";
import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDayShort,
  isoDay,
  money,
  normalizeDay,
  tehranDay,
  toNum,
} from "@/lib/format";
import {
  normalizePeriod,
  periodLabel,
  periodRange,
  tehranMidnight,
} from "@/lib/periods";
import { btnGhost, card, input, label, rowBorder, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

/** The list stops here; the totals above it still count every row. */
const ROW_LIMIT = 300;

type Entry = {
  key: string;
  day: string;
  createdAt: Date;
  customerId: string;
  customerName: string;
  kind: "invoice" | "payment";
  amount: number;
  note: string | null;
  invoiceId?: string;
};

type Totals = { name: string; invoiced: number; paid: number };

export default async function FinanceArchivePage(
  props: PageProps<"/finance/archive">,
) {
  const params = await props.searchParams;
  const period = normalizePeriod(params.period);
  const day = normalizeDay(params.day);
  const customerId =
    typeof params.customer === "string" && params.customer ? params.customer : "";
  const range = periodRange(period, day);

  const [customers, invoices, payments] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: {
        status: "FINAL",
        ...(customerId ? { customerId } : {}),
        ...(range
          ? { day: { gte: dayToDate(range.start), lt: dayToDate(range.end) } }
          : {}),
      },
      select: {
        id: true,
        day: true,
        createdAt: true,
        total: true,
        note: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    }),
    prisma.payment.findMany({
      where: {
        ...(customerId ? { customerId } : {}),
        ...(range
          ? {
              createdAt: {
                gte: tehranMidnight(range.start),
                lt: tehranMidnight(range.end),
              },
            }
          : {}),
      },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        note: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    }),
  ]);

  const entries: Entry[] = [
    ...invoices.map((invoice) => ({
      key: `i-${invoice.id}`,
      day: isoDay(invoice.day),
      createdAt: invoice.createdAt,
      customerId: invoice.customerId,
      customerName: invoice.customer.name,
      kind: "invoice" as const,
      amount: toNum(invoice.total),
      note: invoice.note,
      invoiceId: invoice.id,
    })),
    ...payments.map((payment) => ({
      key: `p-${payment.id}`,
      day: tehranDay(payment.createdAt),
      createdAt: payment.createdAt,
      customerId: payment.customerId,
      customerName: payment.customer.name,
      kind: "payment" as const,
      amount: toNum(payment.amount),
      note: payment.note,
    })),
  ].sort(
    (a, b) =>
      b.day.localeCompare(a.day) || b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const byCustomer = new Map<string, Totals>();
  let invoiced = 0;
  let paid = 0;
  for (const entry of entries) {
    const totals = byCustomer.get(entry.customerId) ?? {
      name: entry.customerName,
      invoiced: 0,
      paid: 0,
    };
    if (entry.kind === "invoice") {
      totals.invoiced += entry.amount;
      invoiced += entry.amount;
    } else {
      totals.paid += entry.amount;
      paid += entry.amount;
    }
    byCustomer.set(entry.customerId, totals);
  }
  const customerTotals = [...byCustomer.entries()]
    .map(([id, totals]) => ({ id, ...totals }))
    .sort((a, b) => b.invoiced - a.invoiced || b.paid - a.paid);

  const selectedName = customers.find((c) => c.id === customerId)?.name;

  const customerHref = (id: string) =>
    `/finance/archive?${new URLSearchParams({ period, day, customer: id })}`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">بایگانی مالی</h1>
        <Link href="/finance" className={`${btnGhost} text-xs`}>
          بازگشت به مالی
        </Link>
      </div>
      <p className="mt-1 text-sm opacity-60">
        {selectedName ?? "همه‌ی مشتری‌ها"} · {periodLabel(period, day)}
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="day" value={day} />
        <div className="min-w-[12rem] flex-1">
          <label className={label} htmlFor="customer">
            مشتری
          </label>
          <select
            id="customer"
            name="customer"
            defaultValue={customerId}
            className={input}
          >
            <option value="">همه‌ی مشتری‌ها</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={btnGhost}>
          نمایش
        </button>
      </form>

      <div className="mt-3">
        <PeriodNav
          basePath="/finance/archive"
          period={period}
          day={day}
          params={customerId ? { customer: customerId } : {}}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="فاکتور شده" value={invoiced} />
        <Stat label="دریافت شده" value={paid} tone="good" />
        <Stat
          label="اختلاف (فاکتور − دریافت)"
          value={invoiced - paid}
          tone={invoiced - paid > 0 ? "bad" : undefined}
        />
      </div>

      {!customerId && customerTotals.length > 0 ? (
        <div className={`${card} mt-6 overflow-x-auto`}>
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr>
                <th className={th}>مشتری</th>
                <th className={th}>فاکتور شده</th>
                <th className={th}>دریافت شده</th>
                <th className={th}>اختلاف</th>
              </tr>
            </thead>
            <tbody>
              {customerTotals.map((row) => (
                <tr key={row.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>
                    <Link href={customerHref(row.id)} className="hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className={`${td} tabular-nums`}>{money(row.invoiced)}</td>
                  <td className={`${td} tabular-nums text-emerald-700 dark:text-emerald-400`}>
                    {money(row.paid)}
                  </td>
                  <td className={`${td} tabular-nums`}>{money(row.invoiced - row.paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2 className="mt-8 text-sm font-semibold">تراکنش‌ها</h2>
      {entries.length === 0 ? (
        <div className={`${card} mt-3 p-8 text-center text-sm opacity-60`}>
          در این بازه تراکنشی نیست.
        </div>
      ) : (
        <ul className={`${card} mt-3 px-4`}>
          {entries.slice(0, ROW_LIMIT).map((entry, index) => (
            <li
              key={entry.key}
              className={`${index > 0 ? rowBorder : ""} flex items-start gap-3 py-2.5`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  {entry.kind === "invoice" ? (
                    <Link href={`/invoices/${entry.invoiceId}`} className="font-medium hover:underline">
                      فاکتور
                    </Link>
                  ) : (
                    <span className="font-medium">
                      {entry.amount < 0 ? "برگشت پرداخت" : "پرداخت"}
                    </span>
                  )}
                  {customerId ? null : (
                    <span className="truncate opacity-70">{entry.customerName}</span>
                  )}
                </div>
                <p className="text-xs opacity-50">
                  {faDayShort(entry.day)}
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-semibold tabular-nums ${
                  entry.kind === "payment"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : ""
                }`}
              >
                {entry.kind === "payment" && entry.amount > 0 ? "+" : ""}
                {money(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {entries.length > ROW_LIMIT ? (
        <p className="mt-2 text-xs opacity-50">
          {ROW_LIMIT} تراکنش آخر نمایش داده شد؛ برای دیدن بقیه بازه را کوچک‌تر کنید.
        </p>
      ) : null}

      <p className="mt-6 text-xs opacity-50">
        فقط فاکتورهای نهایی شمرده می‌شوند. پرداخت‌ها از زمان اضافه شدن یادداشت
        پرداخت ثبت می‌شوند؛ پرداخت‌های قبل از آن اینجا نیستند.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "bad"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className={`${card} p-4`}>
      <div className="text-xs opacity-60">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>
        {money(value)} <span className="text-xs font-normal opacity-60">تومان</span>
      </div>
    </div>
  );
}
