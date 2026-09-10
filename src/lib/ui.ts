/** Shared Tailwind class strings, so every screen looks like the same app. */

export const card =
  "rounded-xl border border-black/10 bg-black/[0.015] dark:border-white/15 dark:bg-white/[0.03]";

export const input =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition placeholder:opacity-40 focus:border-black/45 disabled:opacity-50 dark:border-white/20 dark:bg-white/5 dark:focus:border-white/55";

export const label = "mb-1 block text-xs font-medium opacity-70";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimary = `${btn} bg-emerald-600 text-white hover:bg-emerald-700`;

export const btnGhost = `${btn} border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10`;

export const btnDanger = `${btn} text-red-600 hover:bg-red-500/10 dark:text-red-400`;

export const th =
  "px-3 py-2 text-start text-xs font-medium uppercase tracking-wide opacity-50";

export const td = "px-3 py-2 align-middle";

export const rowBorder = "border-t border-black/8 dark:border-white/10";

export const fieldError = "mt-1 text-xs text-red-600 dark:text-red-400";

/* Phone-sized variants. The invoice is filled in standing at a shop door, one
   thumb on the screen, so its controls are taller than the desk-bound forms. */

export const inputLarge =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-base outline-none transition placeholder:opacity-40 focus:border-black/45 disabled:opacity-50 dark:border-white/20 dark:bg-white/5 dark:focus:border-white/55";

export const btnLarge =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimaryLarge = `${btnLarge} bg-emerald-600 text-white hover:bg-emerald-700`;
