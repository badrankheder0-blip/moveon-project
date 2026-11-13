import { redirect } from "next/navigation";

/** Moved to the account: /konto/auftraege (see middleware.ts). */
export default async function OldOrders({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/konto/auftraege`);
}
