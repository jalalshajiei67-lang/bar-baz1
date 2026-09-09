import { z } from "zod";

/** What every server action returns to a `useActionState` form. */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const emptyState: ActionState = { ok: false };

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/**
 * Persian and Arabic digits typed on a local keyboard become ASCII, and the
 * Persian decimal mark becomes ".", so "۳٫۱۲۳" and "3.123" both validate.
 */
export function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩٫٬]/g, (char) => {
    if (char === "٫") return ".";
    if (char === "٬") return "";
    const persian = PERSIAN_DIGITS.indexOf(char);
    if (persian >= 0) return String(persian);
    return String(ARABIC_DIGITS.indexOf(char));
  });
}

/** FormData value -> trimmed string ("" when absent). Text is left as typed. */
export function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Same, for number fields: digits are normalized so "۳٫۱۲۳" parses. */
export function numeric(form: FormData, key: string): string {
  return normalizeDigits(text(form, key));
}

/** FormData value -> trimmed string or null when empty. */
export function optionalText(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

/** FormData value -> number or null when empty/unparsable. */
export function optionalNumber(form: FormData, key: string): number | null {
  const value = numeric(form, key);
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Flatten a ZodError into { field: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

export const customerInput = z.object({
  name: z.string().min(1, "نام مشتری الزامی است").max(120, "نام خیلی طولانی است"),
  address: z.string().max(300, "آدرس خیلی طولانی است").nullable(),
  phone: z.string().max(40, "شماره تماس معتبر نیست").nullable(),
  note: z.string().max(500, "توضیح خیلی طولانی است").nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export const fruitInput = z.object({
  name: z.string().min(1, "نام میوه الزامی است").max(80, "نام خیلی طولانی است"),
  unit: z.string().min(1).max(16),
});

export const dayInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ معتبر نیست");

/** Price per kg, in Toman. Kept as a string so it reaches Prisma.Decimal intact. */
export const priceInput = z
  .string()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "قیمت معتبر نیست")
  .refine((v) => Number(v) > 0, "قیمت باید بزرگ‌تر از صفر باشد");

/** Weight in kg, up to 3 decimals — e.g. 3.123. */
export const quantityInput = z
  .string()
  .regex(/^\d{1,7}(\.\d{1,3})?$/, "وزن معتبر نیست (مثلاً ۳.۱۲۳)")
  .refine((v) => Number(v) > 0, "وزن باید بزرگ‌تر از صفر باشد");
