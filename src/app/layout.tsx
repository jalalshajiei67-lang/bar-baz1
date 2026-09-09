import type { Metadata } from "next";

import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "بار-باز | فاکتور روزانه میوه",
  description: "مدیریت مشتری‌ها، قیمت روزانه میوه و فاکتور روزانه.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Nav />
        {children}
      </body>
    </html>
  );
}
