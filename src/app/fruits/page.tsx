import { deleteFruit, renameFruit, toggleFruit } from "@/app/actions/fruits";
import { Banner } from "@/components/banner";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDayShort, isoDay, money } from "@/lib/format";
import { card, input, rowBorder, td, th } from "@/lib/ui";

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
      // The last price this fruit actually sold for — there is no price list
      // any more, every price is agreed on the invoice itself.
      invoiceItems: {
        where: { unitPrice: { gt: 0 } },
        orderBy: [{ invoice: { day: "desc" } }, { createdAt: "desc" }],
        take: 1,
        select: { unitPrice: true, invoice: { select: { day: true } } },
      },
      _count: { select: { invoiceItems: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">میوه‌ها</h1>
          <p className="mt-1 text-sm opacity-60">
            قیمت هر میوه هنگام ثبت ردیف، داخل خود فاکتور وارد می‌شود
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
                <th className={th}>آخرین قیمت فروش</th>
                <th className={th}>وضعیت</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {fruits.map((fruit) => {
                const last = fruit.invoiceItems[0];
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
                        <span className="whitespace-nowrap">
                          {money(last.unitPrice)}
                          <span className="opacity-50">
                            {" "}
                            / {faDayShort(isoDay(last.invoice.day))}
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
        فهرست انتخاب میوه در فاکتورها کنار برود.
      </p>
    </main>
  );
}
