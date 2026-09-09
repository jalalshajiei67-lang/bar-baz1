"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "خانه" },
  { href: "/customers", label: "مشتری‌ها" },
  { href: "/fruits", label: "میوه‌ها" },
  { href: "/prices", label: "قیمت روز" },
  { href: "/invoices", label: "فاکتورها" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[500] border-b border-black/10 bg-white/85 backdrop-blur print:hidden dark:border-white/10 dark:bg-black/70">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-1 px-4 py-2.5">
        <span className="me-3 text-sm font-semibold tracking-tight">بار-باز</span>
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-2.5 py-1.5 text-sm transition ${
                active
                  ? "bg-emerald-600/10 font-medium text-emerald-700 dark:text-emerald-400"
                  : "opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
