import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteCustomer } from "@/app/actions/customers";
import { Banner } from "@/components/banner";
import { ConfirmButton } from "@/components/buttons";
import { prisma } from "@/lib/db";
import { faDayShort, isoDay, money } from "@/lib/format";
import { neshanUrl } from "@/lib/neshan";
import { btnGhost, card, rowBorder, td, th } from "@/lib/ui";

import { CustomerForm } from "../customer-form";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { day: "desc" },
        take: 10,
        select: { id: true, day: true, total: true, status: true },
      },
    },
  });

  if (!customer) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{customer.name}</h1>
        <div className="flex items-center gap-2">
          {customer.lat !== null && customer.lng !== null ? (
            <a
              href={neshanUrl(customer.lat, customer.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className={btnGhost}
            >
              مسیریابی با نشان
            </a>
          ) : null}
          <form action={deleteCustomer}>
            <input type="hidden" name="id" value={customer.id} />
            <ConfirmButton message={`«${customer.name}» حذف شود؟`}>
              حذف مشتری
            </ConfirmButton>
          </form>
        </div>
      </div>

      {saved ? (
        <div className="mb-4">
          <Banner tone="success">مشتری ثبت شد.</Banner>
        </div>
      ) : null}

      <CustomerForm
        customer={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          note: customer.note,
          lat: customer.lat,
          lng: customer.lng,
        }}
      />

      <h2 className="mt-10 mb-3 text-sm font-medium opacity-70">
        آخرین فاکتورها
      </h2>

      {customer.invoices.length === 0 ? (
        <div className={`${card} p-6 text-center text-sm opacity-60`}>
          هنوز فاکتوری برای این مشتری ثبت نشده است.
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>تاریخ</th>
                <th className={th}>وضعیت</th>
                <th className={th}>مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {customer.invoices.map((invoice) => (
                <tr key={invoice.id} className={rowBorder}>
                  <td className={td}>
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="hover:underline"
                    >
                      {faDayShort(isoDay(invoice.day))}
                    </Link>
                  </td>
                  <td className={`${td} opacity-70`}>
                    {invoice.status === "FINAL" ? "نهایی" : "پیش‌نویس"}
                  </td>
                  <td className={td}>{money(invoice.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
