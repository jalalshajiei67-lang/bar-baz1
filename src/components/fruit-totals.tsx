import { kg, money, toNum, type Numeric } from "@/lib/format";
import { card, rowBorder, td, th } from "@/lib/ui";

export type DeliveredItem = {
  quantity: Numeric;
  packCount: number | null;
  lineTotal: Numeric;
  fruit: { id: string; name: string };
};

type FruitTotal = {
  id: string;
  name: string;
  kg: number;
  boxes: number;
  loose: boolean;
  amount: number;
};

/** Each fruit on its own: how much of it went out across these invoice lines. */
export function totalByFruit(items: DeliveredItem[]): FruitTotal[] {
  const byFruit = new Map<string, FruitTotal>();
  for (const item of items) {
    const entry = byFruit.get(item.fruit.id) ?? {
      id: item.fruit.id,
      name: item.fruit.name,
      kg: 0,
      boxes: 0,
      loose: false,
      amount: 0,
    };
    entry.kg += toNum(item.quantity);
    entry.boxes += item.packCount ?? 0;
    entry.loose ||= item.packCount === null;
    entry.amount += toNum(item.lineTotal);
    byFruit.set(item.fruit.id, entry);
  }
  return [...byFruit.values()].sort((a, b) => b.kg - a.kg);
}

/** The "delivered fruit" table, with a grand total row. Nothing when empty. */
export function FruitTotalsTable({
  items,
  className = "",
}: {
  items: DeliveredItem[];
  className?: string;
}) {
  const rows = totalByFruit(items);
  if (rows.length === 0) return null;

  const totalKg = rows.reduce((sum, row) => sum + row.kg, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className={`${card} overflow-x-auto ${className}`}>
      <div className="p-4 pb-0">
        <h2 className="text-sm font-semibold">میوه‌های تحویل‌شده</h2>
      </div>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr>
            <th className={th}>میوه</th>
            <th className={th}>کیلوگرم</th>
            <th className={th}>جعبه</th>
            <th className={th}>مبلغ (تومان)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={rowBorder}>
              <td className={`${td} font-medium`}>{row.name}</td>
              <td className={`${td} tabular-nums`}>{kg(row.kg)}</td>
              <td className={`${td} tabular-nums opacity-70`}>
                {row.boxes > 0 ? row.boxes : ""}
                {row.boxes > 0 && row.loose ? " + " : ""}
                {row.loose ? "فله" : ""}
              </td>
              <td className={`${td} tabular-nums`}>{money(row.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={rowBorder}>
            <td className={`${td} opacity-60`}>جمع کل</td>
            <td className={`${td} font-semibold tabular-nums`}>{kg(totalKg)}</td>
            <td className={td} />
            <td className={`${td} font-semibold tabular-nums`}>{money(totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
