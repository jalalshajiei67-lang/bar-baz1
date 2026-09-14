import Link from "next/link";

import { deleteFleet, renameFleet, toggleFleet } from "@/app/actions/fleets";
import { Banner } from "@/components/banner";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { card, input, rowBorder, td, th } from "@/lib/ui";

import { FleetForm } from "./fleet-form";

export const dynamic = "force-dynamic";

export default async function FleetsPage(props: PageProps<"/fleets">) {
  const { error } = await props.searchParams;

  const fleets = await prisma.fleet.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">ناوگان</h1>
        <p className="mt-1 text-sm opacity-60">
          ماشین‌هایی که بار را به قنادی‌ها می‌رسانند
        </p>
      </div>

      {error ? (
        <div className="mb-4">
          <Banner tone="error">{error}</Banner>
        </div>
      ) : null}

      <div className={`${card} mb-6 p-4`}>
        <FleetForm />
      </div>

      {fleets.length === 0 ? (
        <div className={`${card} p-8 text-center text-sm opacity-60`}>
          هنوز ناوگانی ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr>
                <th className={th}>نام</th>
                <th className={th}>فاکتورها</th>
                <th className={th}>وضعیت</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {fleets.map((fleet) => (
                <tr key={fleet.id} className={rowBorder}>
                  <td className={td}>
                    <form action={renameFleet} className="flex gap-2">
                      <input type="hidden" name="id" value={fleet.id} />
                      <input
                        name="name"
                        defaultValue={fleet.name}
                        className={`${input} max-w-[12rem] py-1`}
                        aria-label={`نام ${fleet.name}`}
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
                    <Link
                      href={`/fleet/${fleet.id}`}
                      className="whitespace-nowrap underline"
                    >
                      {fleet._count.invoices} فاکتور
                    </Link>
                  </td>
                  <td className={td}>
                    <form action={toggleFleet}>
                      <input type="hidden" name="id" value={fleet.id} />
                      <button
                        type="submit"
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          fleet.active
                            ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-black/5 opacity-60 dark:bg-white/10"
                        }`}
                      >
                        {fleet.active ? "فعال" : "غیرفعال"}
                      </button>
                    </form>
                  </td>
                  <td className={`${td} text-end`}>
                    <form action={deleteFleet} className="inline">
                      <input type="hidden" name="id" value={fleet.id} />
                      <ConfirmButton
                        message={`«${fleet.name}» حذف شود؟`}
                        className="rounded-lg px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
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

      <p className="mt-4 text-xs opacity-50">
        ناوگانی که فاکتور ثبت‌شده دارد حذف نمی‌شود؛ آن را غیرفعال کنید تا از
        فهرست انتخاب در فاکتور جدید کنار برود. هر راننده صفحه‌ی خودش را از{" "}
        <Link href="/fleet" className="underline">
          /fleet
        </Link>{" "}
        باز می‌کند.
      </p>
    </main>
  );
}
