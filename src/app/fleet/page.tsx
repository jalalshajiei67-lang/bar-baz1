import Link from "next/link";

import { prisma } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { card } from "@/lib/ui";

export const dynamic = "force-dynamic";

/**
 * The driver taps their own vehicle once and bookmarks the page it opens, so
 * this picker is only ever seen on a phone that has not been set up yet.
 */
export default async function FleetPickerPage() {
  const day = todayISO();
  const fleets = await prisma.fleet.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { invoices: { where: { day: new Date(`${day}T00:00:00.000Z`) } } },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold tracking-tight">ناوگان شما</h1>
      <p className="mt-1 text-sm opacity-60">
        ماشین خودتان را انتخاب کنید و صفحه را نشان کنید تا دفعه‌ی بعد مستقیم باز
        شود.
      </p>

      {fleets.length === 0 ? (
        <div className={`${card} mt-6 p-8 text-center text-sm opacity-60`}>
          هنوز ناوگانی ثبت نشده است.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {fleets.map((fleet) => (
            <li key={fleet.id}>
              <Link
                href={`/fleet/${fleet.id}`}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-4 text-base font-medium transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/35"
              >
                <span>{fleet.name}</span>
                <span className="text-sm font-normal opacity-60">
                  {fleet._count.invoices} بار امروز
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
