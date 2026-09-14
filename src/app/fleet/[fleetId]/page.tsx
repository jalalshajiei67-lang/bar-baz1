import Link from "next/link";
import { notFound } from "next/navigation";

import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { prisma } from "@/lib/db";
import {
  dayToDate,
  faDay,
  faDayShort,
  isoDay,
  money,
  normalizeDay,
  shiftDay,
  todayISO,
} from "@/lib/format";
import { btnGhost, card } from "@/lib/ui";

export const dynamic = "force-dynamic";

type RoundInvoice = {
  id: string;
  day: Date;
  status: "DRAFT" | "FINAL";
  paid: boolean;
  total: { toString(): string };
  customer: { name: string; address: string | null };
  items: { packCount: number | null }[];
};

const roundSelect = {
  customer: { select: { name: true, address: true } },
  items: { select: { packCount: true } },
} as const;

/** One shop on the round. Same card whether it is still to do or already done. */
function LoadCard({
  invoice,
  basePath,
  today,
}: {
  invoice: RoundInvoice;
  basePath: string;
  today: string;
}) {
  const day = isoDay(invoice.day);
  const packs = invoice.items.reduce(
    (sum, item) => sum + (item.packCount ?? 0),
    0,
  );
  const loose = invoice.items.some((item) => item.packCount === null);
  const done = invoice.status !== "DRAFT";

  return (
    <li>
      <Link
        href={`${basePath}/${invoice.id}`}
        className="block rounded-xl border border-black/10 p-4 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/35"
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-base font-medium">{invoice.customer.name}</span>
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

        {/* A load left over from another day is easy to miss, so it says which. */}
        {day !== today ? (
          <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-400">
            {faDayShort(day)}
          </p>
        ) : null}

        {invoice.customer.address ? (
          <p className="mt-1 text-sm opacity-60">{invoice.customer.address}</p>
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
}

/**
 * The driver's whole world: everything still to weigh, then a day-by-day look
 * back at finished rounds. This page links nowhere else in the app — the only
 * way in is the link the admin sends, and there is no page that lists the
 * fleets, so one driver cannot wander into another's round.
 */
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

  const [outstanding, doneThatDay] = await Promise.all([
    // Any date, not just today: a load created for tomorrow or left over from
    // yesterday must not look like no load at all. Oldest first — those are
    // the ones at risk of being forgotten.
    prisma.invoice.findMany({
      where: { fleetId, status: "DRAFT" },
      orderBy: [{ day: "asc" }, { createdAt: "asc" }],
      include: roundSelect,
    }),
    prisma.invoice.findMany({
      where: { fleetId, status: "FINAL", day: dayToDate(day) },
      orderBy: { createdAt: "asc" },
      include: roundSelect,
    }),
  ]);

  const basePath = `/fleet/${fleetId}`;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">{fleet.name}</h1>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold">
          در انتظار
          {outstanding.length > 0 ? (
            <span className="opacity-60"> ({outstanding.length})</span>
          ) : null}
        </h2>

        {outstanding.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm opacity-60`}>
            باری در انتظار شما نیست.
          </div>
        ) : (
          <ul className="grid gap-3">
            {outstanding.map((invoice) => (
              <LoadCard
                key={invoice.id}
                invoice={invoice}
                basePath={basePath}
                today={today}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 border-t border-black/10 pt-6 dark:border-white/15">
        <h2 className="text-sm font-semibold">بارهای ثبت‌شده</h2>
        <p className="mt-1 text-sm opacity-60">{faDay(day)}</p>

        <div className="mt-3 mb-4 flex flex-wrap items-center gap-2">
          <Link
            href={`${basePath}?day=${shiftDay(day, -1)}`}
            className={btnGhost}
          >
            روز قبل
          </Link>
          <JalaliDatePicker day={day} basePath={basePath} />
          <Link
            href={`${basePath}?day=${shiftDay(day, 1)}`}
            className={btnGhost}
          >
            روز بعد
          </Link>
          {day !== today ? (
            <Link href={`${basePath}?day=${today}`} className={btnGhost}>
              امروز
            </Link>
          ) : null}
        </div>

        {doneThatDay.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm opacity-60`}>
            در این روز باری ثبت نکرده‌اید.
          </div>
        ) : (
          <ul className="grid gap-3">
            {doneThatDay.map((invoice) => (
              <LoadCard
                key={invoice.id}
                invoice={invoice}
                basePath={basePath}
                today={today}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
