import Link from "next/link";

import { deleteCustomer } from "@/app/actions/customers";
import { Banner } from "@/components/banner";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { btnGhost, btnPrimary, card, input, rowBorder, td, th } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const { q = "", error } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">مشتری‌ها</h1>
          <p className="mt-1 text-sm opacity-60">
            {customers.length} مشتری ثبت شده است
          </p>
        </div>
        <Link href="/customers/new" className={btnPrimary}>
          مشتری جدید
        </Link>
      </div>

      {error ? (
        <div className="mb-4">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          className={`${input} max-w-xs`}
          placeholder="جستجوی نام یا آدرس…"
        />
        <button type="submit" className={btnGhost}>
          جستجو
        </button>
      </form>

      {customers.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          هنوز مشتری‌ای ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr>
                <th className={th}>نام</th>
                <th className={th}>تماس</th>
                <th className={th}>آدرس</th>
                <th className={th}>نقشه</th>
                <th className={th}>فاکتورها</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className={rowBorder}>
                  <td className={`${td} font-medium`}>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="hover:underline"
                    >
                      {customer.name}
                    </Link>
                  </td>
                  <td className={td} dir="ltr">
                    {customer.phone ?? "—"}
                  </td>
                  <td className={`${td} max-w-[16rem] truncate opacity-70`}>
                    {customer.address ?? "—"}
                  </td>
                  <td className={td}>
                    {customer.lat !== null && customer.lng !== null ? (
                      <a
                        className="text-emerald-700 hover:underline dark:text-emerald-400"
                        href={`https://www.openstreetmap.org/?mlat=${customer.lat}&mlon=${customer.lng}#map=17/${customer.lat}/${customer.lng}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        مشاهده
                      </a>
                    ) : (
                      <span className="opacity-40">—</span>
                    )}
                  </td>
                  <td className={`${td} opacity-70`}>
                    {customer._count.invoices}
                  </td>
                  <td className={`${td} text-end`}>
                    <form action={deleteCustomer} className="inline">
                      <input type="hidden" name="id" value={customer.id} />
                      <ConfirmButton
                        message={`«${customer.name}» حذف شود؟`}
                        className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        حذف
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
