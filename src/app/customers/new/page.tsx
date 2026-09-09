import { CustomerForm } from "../customer-form";

export default function NewCustomerPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">مشتری جدید</h1>
      <CustomerForm />
    </main>
  );
}
