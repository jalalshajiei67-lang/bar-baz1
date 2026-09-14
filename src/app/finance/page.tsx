import Link from "next/link";

import { setInvoiceSettled, settleCustomer } from "@/app/actions/payments";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDayShort, isoDay, money, toNum } from "@/lib/format";
import { btnGhost, card, rowBorder, td, th } from "@/lib/ui";

import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

/** How many just-settled invoices the undo list at the foot of the page keeps. */
const SETTLED_LIMIT = 20;

type OpenInvoice = {
  id: string;
  day: string;
  total: number;
  paidAmount: number;
  remaining: number;
};

type Debtor = {
  id: string;
  name: string;
  invoices: OpenInvoice[];
  remaining: number;
};

export default async function FinancePage() {
  const [openInvoices, settledInvoices] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "FINAL", paid: false },
      orderBy: [{ day: "asc" }, { createdAt: "asc" }],
      include: { customer: { select: { id: true, name: true } } },
    }),
    // Ordered by the last write, so an invoice settled by mistake a moment ago
    // is the first one in the undo list.
    prisma.invoice.findMany({
      where: { status: "FINAL", paid: true },
      orderBy: { updatedAt: "desc" },
      take: SETTLED_LIMIT,
      include: { customer: { select: { id: true, name: true } } },
    }),
  ]);

  const byCustomer = new Map<string, Debtor>();
  for (const invoice of openInvoices) {
    const debtor = byCustomer.get(invoice.customerId) ?? {
      id: invoice.customerId,
      name: invoice.customer.name,
      invoices: [],
      remaining: 0,
    };

    const total = toNum(invoice.total);
    const paidAmount = toNum(invoice.paidAmount);
    // An invoice can only ever be edited down to less than what was paid on it;
    // it owes nothing then, and must not hand the customer a negative debt.
    const remaining = Math.max(total - paidAmount, 0);

    debtor.invoices.push({
      id: invoice.id,
      day: isoDay(invoice.day),
      total,
      paidAmount,
      remaining,
    });
    debtor.remaining += remaining;
    byCustomer.set(invoice.customerId, debtor);
  }

  const debtors = [...byCustomer.values()].sort(
    (a, b) => b.remaining - a.remaining,
  );
  const grandTotal = debtors.reduce((sum, debtor) => sum + debtor.remaining, 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">مالی</h1>
      <p className="mt-1 text-sm opacity-60">
        {debtors.length === 0
          ? "همه‌ی فاکتورها تسویه شده است."
          : `${debtors.length} مشتری بدهکار`}
      </p>

      {debtors.length === 0 ? (
        <div className={`${card} mt-6 p-8 text-center text-sm opacity-60`}>
          فاکتور پرداخت‌نشده‌ای نیست.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {debtors.map((debtor) => (
            <section key={debtor.id} className={`${card} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/customers/${debtor.id}`}
                  className="truncate font-semibold hover:underline"
                >
                  {debtor.name}
                </Link>
                <div className="shrink-0 text-end">
                  <div className="text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {money(debtor.remaining)}
                  </div>
                  <div className="text-xs opacity-50">تومان</div>
                </div>
              </div>

              <ul className="mt-3">
                {debtor.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className={`${rowBorder} flex items-center gap-3 py-2`}
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-sm hover:underline"
                      >
                        {faDayShort(invoice.day)}
                      </Link>
                      <p className="text-xs tabular-nums opacity-60">
                        {money(invoice.total)}
                        {invoice.paidAmount > 0
                          ? ` · ${money(invoice.paidAmount)} پرداخت‌شده`
                          : ""}
                      </p>
                    </div>

                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {money(invoice.remaining)}
                    </span>

                    <form action={setInvoiceSettled} className="shrink-0">
                      <input type="hidden" name="id" value={invoice.id} />
                      <input type="hidden" name="settled" value="true" />
                      <button type="submit" className={`${btnGhost} text-xs`}>
                        پرداخت شد ✓
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              <PaymentForm
                customerId={debtor.id}
                remaining={debtor.remaining}
              />

              <form action={settleCustomer} className="mt-2">
                <input type="hidden" name="customerId" value={debtor.id} />
                <ConfirmButton
                  message={`کل بدهی «${debtor.name}» تسویه‌شده علامت بخورد؟`}
                  className={`${btnGhost} w-full`}
                >
                  تسویه‌ی کامل
                </ConfirmButton>
              </form>
            </section>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between rounded-xl bg-red-500/10 px-4 py-4">
        <span className="text-sm font-medium">جمع کل بدهی‌ها</span>
        <span className="text-xl font-semibold tabular-nums">
          {money(grandTotal)}{" "}
          <span className="text-sm font-normal opacity-70">تومان</span>
        </span>
      </div>

      {settledInvoices.length > 0 ? (
        <details className={`${card} mt-6 p-4`}>
          <summary className="cursor-pointer text-sm font-semibold">
            تسویه‌شده‌های اخیر
          </summary>
          <p className="mt-2 text-xs opacity-50">
            اگر اشتباهی تسویه شد، از اینجا برگردانید.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <thead>
                <tr>
                  <th className={th}>مشتری</th>
                  <th className={th}>تاریخ</th>
                  <th className={th}>مبلغ (تومان)</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {settledInvoices.map((invoice) => (
                  <tr key={invoice.id} className={rowBorder}>
                    <td className={`${td} font-medium`}>
                      {invoice.customer.name}
                    </td>
                    <td className={`${td} opacity-70`}>
                      {faDayShort(isoDay(invoice.day))}
                    </td>
                    <td className={`${td} tabular-nums`}>
                      {money(invoice.total)}
                    </td>
                    <td className={`${td} text-end`}>
                      <form action={setInvoiceSettled}>
                        <input type="hidden" name="id" value={invoice.id} />
                        <input type="hidden" name="settled" value="false" />
                        <button type="submit" className="text-xs underline">
                          برگرداندن
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

      <p className="mt-6 text-xs opacity-50">
        پرداختی هر مشتری از قدیمی‌ترین فاکتور پرداخت‌نشده‌اش کم می‌شود؛ هرچه
        بماند روی فاکتورهای بعدی می‌ماند.
      </p>
    </main>
  );
}
