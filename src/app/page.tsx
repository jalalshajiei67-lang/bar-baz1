import Link from "next/link";

import { faDay, todayISO } from "@/lib/format";

const sections = [
  {
    href: "/customers",
    title: "مشتری‌ها",
    description: "قنادی‌ها، شماره تماس و موقعیت روی نقشه تهران",
  },
  {
    href: "/invoices",
    title: "فاکتورها",
    description:
      "برای هر مشتری وزن و قیمت توافقی هر میوه را وارد کنید و جمع کل را ببینید",
  },
  {
    href: "/fruits",
    title: "میوه‌ها",
    description: "افزودن، تغییر نام و غیرفعال کردن میوه‌ها",
  },
];

export default function Home() {
  const today = todayISO();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight">بار-باز</h1>
      <p className="mt-2 text-sm opacity-60">
        مدیریت فاکتور روزانه‌ی پخش میوه — {faDay(today)}
      </p>

      <ul className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="block h-full rounded-xl border border-black/10 p-4 transition hover:border-black/25 dark:border-white/15 dark:hover:border-white/35"
            >
              <span className="block font-medium">{section.title}</span>
              <span className="mt-2 block text-sm opacity-65">
                {section.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs opacity-50 sm:mt-10">
        روال روزانه: فاکتور مشتری را باز کنید ← برای هر میوه وزن و قیمتی که با او
        توافق کرده‌اید را وارد کنید ← جمع کل را ببینید.
      </p>
    </main>
  );
}
