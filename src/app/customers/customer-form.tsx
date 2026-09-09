"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { Banner } from "@/components/banner";
import { SubmitButton } from "@/components/buttons";
import { LocationField } from "@/components/location-field";
import { btnGhost, fieldError, input, label } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export type CustomerFormValues = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

export function CustomerForm({ customer }: { customer?: CustomerFormValues }) {
  const action = customer ? updateCustomer.bind(null, customer.id) : createCustomer;
  const [state, formAction] = useActionState(action, emptyState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="grid gap-4">
      {state.ok && state.message ? (
        <Banner tone="success">{state.message}</Banner>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">
            نام قنادی / مشتری
          </label>
          <input
            id="name"
            name="name"
            className={input}
            defaultValue={customer?.name ?? ""}
            placeholder="مثلاً قنادی شیرین"
            autoComplete="off"
            autoFocus
          />
          {errors.name ? <p className={fieldError}>{errors.name}</p> : null}
        </div>

        <div>
          <label className={label} htmlFor="phone">
            شماره تماس
          </label>
          <input
            id="phone"
            name="phone"
            className={input}
            defaultValue={customer?.phone ?? ""}
            placeholder="۰۹۱۲…"
            inputMode="tel"
            dir="ltr"
          />
          {errors.phone ? <p className={fieldError}>{errors.phone}</p> : null}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="address">
          آدرس
        </label>
        <input
          id="address"
          name="address"
          className={input}
          defaultValue={customer?.address ?? ""}
          placeholder="خیابان، پلاک…"
        />
        {errors.address ? <p className={fieldError}>{errors.address}</p> : null}
      </div>

      <LocationField
        initialLat={customer?.lat ?? null}
        initialLng={customer?.lng ?? null}
      />

      <div>
        <label className={label} htmlFor="note">
          توضیح
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          className={input}
          defaultValue={customer?.note ?? ""}
          placeholder="ساعت تحویل، نام مسئول خرید…"
        />
        {errors.note ? <p className={fieldError}>{errors.note}</p> : null}
      </div>

      <div className="flex items-center gap-2">
        <SubmitButton pendingLabel="در حال ذخیره…">ذخیره</SubmitButton>
        <Link href="/customers" className={btnGhost}>
          انصراف
        </Link>
      </div>
    </form>
  );
}
