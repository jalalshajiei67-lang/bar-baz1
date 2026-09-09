"use client";

import { useActionState, useEffect, useRef } from "react";

import { createFruit } from "@/app/actions/fruits";
import { SubmitButton } from "@/components/buttons";
import { fieldError, input } from "@/lib/ui";
import { emptyState } from "@/lib/validation";

export function FruitForm() {
  const [state, formAction] = useActionState(createFruit, emptyState);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the field after a successful add so the next name can be typed straight away.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap gap-2">
      <div className="min-w-[12rem] flex-1">
        <input
          name="name"
          className={input}
          placeholder="نام میوه، مثلاً توت‌فرنگی"
          autoComplete="off"
        />
        {state.fieldErrors?.name ? (
          <p className={fieldError}>{state.fieldErrors.name}</p>
        ) : null}
      </div>
      <input type="hidden" name="unit" value="kg" />
      <SubmitButton pendingLabel="…">افزودن</SubmitButton>
    </form>
  );
}
