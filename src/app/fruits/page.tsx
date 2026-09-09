import Link from "next/link";

import { deleteFruit, renameFruit, toggleFruit } from "@/app/actions/fruits";
import { Banner } from "@/components/banner";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDayShort, isoDay, money, todayISO } from "@/lib/format";
import { btnGhost, card, input, rowBorder, td, th } from "@/lib/ui";

import { FruitForm } from "./fruit-form";

export const dynamic = "force-dynamic";

export default async function FruitsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const fruits = await prisma.fruit.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      prices: { orderBy: { day: "desc" }, take: 1 },
      _count: { select: { invoiceItems: true } },
    },
  });

  const today = todayISO();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">میوه‌ها</h1>
          <p className="mt-1 text-sm opacity-60">
            قیمت‌ها در صفحه‌ی{" "}
            <Link href={`/prices?day=${today}`} className="underline">
              قیمت روز
            </Link>{" "}
            وارد می‌شوند
          </p>
        </div>
      </div>

      {error ? (
        <div className="mb-4">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      <div className={`${card} mb-6 p-4`}>
        <FruitForm />
      </div>

      {fruits.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          هنوز میوه‌ای ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr>
                <th className={th}>نام</th>
                <th className={th}>آخرین قیمت</th>
                <th className={th}>وضعیت</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {fruits.map((fruit) => {
                const last = fruit.prices[0];
                return (
                  <tr key={fruit.id} className={rowBorder}>
                    <td className={td}>
                      <form action={renameFruit} className="flex gap-2">
                        <input type="hidden" name="id" value={fruit.id} />
                        <input
                          name="name"
                          defaultValue={fruit.name}
                          className={`${input} max-w-[12rem] py-1`}
                          aria-label={`نام ${fruit.name}`}
                        />
                        <button
                          type="submit"
                          className="rounded-lg px-2 text-xs opacity-60 hover:opacity-100"
                        >
                          ثبت نام
                        </button>
                      </form>
                    </td>
                    <td className={td}>
                      {last ? (
                        <span>
                          {money(last.price)}
                          <span className="opacity-50">
                            {" "}
                            / {faDayShort(isoDay(last.day))}
                          </span>
                        </span>
                      ) : (
                        <span className="opacity-40">—</span>
                      )}
                    </td>
                    <td className={td}>
                      <form action={toggleFruit}>
                        <input type="hidden" name="id" value={fruit.id} />
                        <button
                          type="submit"
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            fruit.active
                              ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-black/5 opacity-60 dark:bg-white/10"
                          }`}
                        >
                          {fruit.active ? "فعال" : "غیرفعال"}
                        </button>
                      </form>
                    </td>
                    <td className={`${td} text-end`}>
                      <form action={deleteFruit} className="inline">
                        <input type="hidden" name="id" value={fruit.id} />
                        <ConfirmButton
                          message={`«${fruit.name}» حذف شود؟`}
                          className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
                        >
                          حذف
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs opacity-50">
        میوه‌ای که در فاکتوری استفاده شده حذف نمی‌شود؛ آن را غیرفعال کنید تا از
        فهرست قیمت روز کنار برود.{" "}
        <Link href="/prices" className={`${btnGhost} ms-1 px-2 py-0.5 text-xs`}>
          رفتن به قیمت روز
        </Link>
      </p>
    </main>
  );
}
