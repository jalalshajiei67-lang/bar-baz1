import Link from "next/link";
import { notFound } from "next/navigation";

import { submitDelivery } from "@/app/actions/invoices";
import {
  ItemsEditor,
  type EditableItem,
} from "@/app/invoices/[id]/items-editor";
import { NeshanRouteLink } from "@/components/neshan-route-link";
import { prisma } from "@/lib/db";
import { faDay, isoDay, kg, money } from "@/lib/format";
import { lastPrices } from "@/lib/price-history";
import { btnGhost, card, rowBorder, td, th } from "@/lib/ui";

import { PaidChoice } from "./paid-choice";

export const dynamic = "force-dynamic";

/**
 * The screen the driver fills in at the shop door: the boxes the admin sent,
 * the weight off the scale, the price bargained on the spot, paid or not, and
 * one button that commits the lot.
 */
export default async function FleetInvoicePage(
  props: PageProps<"/fleet/[fleetId]/[invoiceId]">,
) {
  const { fleetId, invoiceId } = await props.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      fleet: { select: { id: true, name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: { fruit: { select: { id: true, name: true } } },
      },
    },
  });

  // Reached through a fleet's own URL, so a load belonging to another vehicle
  // is not this page's to show.
  if (!invoice || invoice.fleetId !== fleetId) notFound();

  const day = isoDay(invoice.day);
  const isDraft = invoice.status === "DRAFT";
  const backHref = `/fleet/${fleetId}?day=${day}`;

  const hints = isDraft
    ? await lastPrices(invoice.id, invoice.customerId)
    : new Map();

  const editableItems: EditableItem[] = invoice.items.map((item) => {
    const hint = hints.get(item.fruit.id);
    return {
      id: item.id,
      name: item.fruit.name,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toString(),
      packCount: item.packCount === null ? "" : String(item.packCount),
      lastPrice: hint?.price ?? "",
      lastPriceNote: hint?.note ?? null,
    };
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
      <Link href={backHref} className="text-sm underline opacity-70">
        ← بارهای {invoice.fleet?.name ?? "ناوگان"}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
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
          {isDraft ? "در انتظار" : "ثبت شد"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        {invoice.customer.phone ? (
          <a href={`tel:${invoice.customer.phone}`} className={btnGhost}>
            تماس
          </a>
        ) : null}
        {invoice.customer.lat !== null && invoice.customer.lng !== null ? (
          <NeshanRouteLink
            lat={invoice.customer.lat}
            lng={invoice.customer.lng}
            className={btnGhost}
          >
            مسیر
          </NeshanRouteLink>
        ) : null}
      </div>

      {invoice.items.length === 0 ? (
        <div className={`${card} mt-5 p-8 text-center text-sm opacity-60`}>
          برای این مشتری هنوز میوه‌ای بار نشده است.
        </div>
      ) : isDraft ? (
        <div className="mt-5">
          <ItemsEditor
            items={editableItems}
            action={submitDelivery.bind(null, invoice.id)}
            submitLabel="ثبت نهایی بار"
            pendingLabel="در حال ثبت…"
            returnTo={`/fleet/${fleetId}/${invoice.id}`}
            lockPacks
            extra={<PaidChoice defaultPaid={invoice.paid} />}
          />
        </div>
      ) : (
        <>
          <div className={`${card} mt-5 overflow-x-auto`}>
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
                {invoice.items.map((item) => (
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
                      {kg(item.quantity)}
                    </td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      {money(item.unitPrice)}
                    </td>
                    <td
                      className={`${td} font-medium whitespace-nowrap tabular-nums`}
                    >
                      {money(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-600/10 px-4 py-3">
            <span className="text-sm font-medium">جمع کل</span>
            <span className="text-lg font-semibold tabular-nums">
              {money(invoice.total)}{" "}
              <span className="text-sm font-normal opacity-70">تومان</span>
            </span>
          </div>

          <p
            className={`mt-3 text-center text-base font-semibold ${
              invoice.paid
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {invoice.paid ? "پرداخت شده ✓" : "پرداخت نشده ✕"}
          </p>

          <p className="mt-4 text-xs opacity-50">
            این بار ثبت شده است. برای اصلاح، از ادمین بخواهید فاکتور را به
            پیش‌نویس برگرداند.
          </p>
        </>
      )}
    </main>
  );
}
