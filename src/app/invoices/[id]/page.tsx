import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteInvoice,
  saveInvoiceItems,
  setInvoicePaid,
  setInvoiceStatus,
} from "@/app/actions/invoices";
import { Banner } from "@/components/banner";
import { ConfirmButton, PrintButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDay, isoDay, kg, money } from "@/lib/format";
import { btnGhost, btnPrimary, card, rowBorder, td, th } from "@/lib/ui";

import { AddItemForm, type FruitOption } from "./add-item-form";
import { ItemsEditor, type EditableItem } from "./items-editor";

export const dynamic = "force-dynamic";

export default async function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  const { error } = await props.searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      fleet: { select: { id: true, name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { fruit: { select: { name: true } } },
      },
    },
  });

  if (!invoice) notFound();

  const day = isoDay(invoice.day);
  const isDraft = invoice.status === "DRAFT";

  // A payment on /finance can cover part of an invoice: the two buttons below
  // only know paid/unpaid, so the amount already handed over is spelled out.
  const remaining = Math.max(
    Number(invoice.total) - Number(invoice.paidAmount),
    0,
  );
  const partlyPaid = !invoice.paid && Number(invoice.paidAmount) > 0;

  const activeFruits = await prisma.fruit.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const fruits: FruitOption[] = activeFruits;

  const editableItems: EditableItem[] = invoice.items.map((item) => ({
    id: item.id,
    name: item.fruit.name,
    quantity: item.quantity.toString(),
    unitPrice: item.unitPrice.toString(),
    packCount: item.packCount === null ? "" : String(item.packCount),
  }));

  const itemsTable = (
    <div className={`${card} overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className={th}>میوه</th>
            <th className={th}>تعداد</th>
            <th className={th}>وزن</th>
            <th className={th}>قیمت</th>
            <th className={th}>مبلغ</th>
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
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {item.packCount === null ? (
                    <span className="opacity-60">فله</span>
                  ) : (
                    item.packCount
                  )}
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>
                  {Number(item.quantity) > 0 ? (
                    kg(item.quantity)
                  ) : (
                    <span className="opacity-50">—</span>
                  )}
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
          <p className="mt-1 text-sm">
            <span className="opacity-60">ناوگان: </span>
            {invoice.fleet ? (
              <Link
                href={`/fleet/${invoice.fleet.id}?day=${day}`}
                className="font-medium underline print:no-underline"
              >
                {invoice.fleet.name}
              </Link>
            ) : (
              <span className="opacity-60">تعیین نشده</span>
            )}
          </p>
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
            {isDraft ? "نهایی کردن" : "بازگرداندن به پیش‌نویس"}
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
              <ItemsEditor
                items={editableItems}
                action={saveInvoiceItems.bind(null, invoice.id)}
                submitLabel="ذخیره وزن‌ها و قیمت‌ها"
                pendingLabel="در حال ذخیره…"
              />
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

      {partlyPaid ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3 text-sm">
          <span>
            {money(invoice.paidAmount)} تومان از این فاکتور پرداخت شده است
          </span>
          <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
            مانده {money(remaining)}
          </span>
        </div>
      ) : null}

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
        این صفحه‌ی ادمین است: میوه‌ها و تعداد جعبه‌ها را اینجا مشخص کنید. وزن،
        قیمت و پرداخت را ناوگان سر بار ثبت می‌کند.
      </p>
    </main>
  );
}
