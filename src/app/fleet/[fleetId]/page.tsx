import Link from "next/link";
import { notFound } from "next/navigation";

import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { prisma } from "@/lib/db";
import { dayToDate, faDay, money, normalizeDay, shiftDay, todayISO } from "@/lib/format";
import { btnGhost, card } from "@/lib/ui";

export const dynamic = "force-dynamic";

/** The driver's round for one day: which shops, and what is still to weigh. */
export default async function FleetDayPage(
  props: PageProps<"/fleet/[fleetId]">,
) {
  const { fleetId } = await props.params;
  const day = normalizeDay((await props.searchParams).day);
  const today = todayISO();

  const fleet = await prisma.fleet.findUnique({
    where: { id: fleetId },
    select: { id: true, name: true },
  });
  if (!fleet) notFound();

  const invoices = await prisma.invoice.findMany({
    where: { fleetId, day: dayToDate(day) },
    orderBy: { createdAt: "asc" },
    include: {
      customer: { select: { name: true, address: true } },
      items: { select: { packCount: true } },
    },
  });

  const remaining = invoices.filter(
    (invoice) => invoice.status === "DRAFT",
  ).length;
  const basePath = `/fleet/${fleetId}`;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">{fleet.name}</h1>
      <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>

      <div className="mt-4 mb-5 flex flex-wrap items-center gap-2">
        <Link href={`${basePath}?day=${shiftDay(day, -1)}`} className={btnGhost}>
          روز قبل
        </Link>
        <JalaliDatePicker day={day} basePath={basePath} />
        <Link href={`${basePath}?day=${shiftDay(day, 1)}`} className={btnGhost}>
          روز بعد
        </Link>
        {day !== today ? (
          <Link href={`${basePath}?day=${today}`} className={btnGhost}>
            امروز
          </Link>
        ) : null}
      </div>

      {invoices.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          برای این روز باری به شما سپرده نشده است.
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm opacity-70">
            {remaining > 0
              ? `${remaining} بار از ${invoices.length} بار هنوز ثبت نشده است.`
              : `هر ${invoices.length} بار ثبت شده است.`}
          </p>

          <ul className="grid gap-3">
            {invoices.map((invoice) => {
              const packs = invoice.items.reduce(
                (sum, item) => sum + (item.packCount ?? 0),
                0,
              );
              const loose = invoice.items.some(
                (item) => item.packCount === null,
              );
              const done = invoice.status !== "DRAFT";

              return (
                <li key={invoice.id}>
                  <Link
                    href={`${basePath}/${invoice.id}`}
                    className="block rounded-xl border border-black/10 p-4 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/35"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-base font-medium">
                        {invoice.customer.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                          done
                            ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {done ? "ثبت شد" : "در انتظار"}
                      </span>
                    </div>

                    {invoice.customer.address ? (
                      <p className="mt-1 text-sm opacity-60">
                        {invoice.customer.address}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm opacity-70">
                      {invoice.items.length} میوه
                      {packs > 0 ? ` · ${packs} جعبه` : ""}
                      {loose ? " · فله" : ""}
                    </p>

                    {done ? (
                      <p className="mt-2 text-sm">
                        <span className="font-semibold tabular-nums">
                          {money(invoice.total)}
                        </span>
                        <span className="opacity-60"> تومان · </span>
                        <span
                          className={
                            invoice.paid
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }
                        >
                          {invoice.paid ? "پرداخت شده" : "پرداخت نشده"}
                        </span>
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
