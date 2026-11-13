import { redirect } from "next/navigation";

/**
 * The old monthly billing total. Invoices & payments (`/admin/rechnungen`)
 * and Reports (`/admin/berichte`) replaced it, so an old bookmark lands on
 * the invoices instead of a dead end.
 */
export default function BillingPage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/admin/rechnungen`);
}
