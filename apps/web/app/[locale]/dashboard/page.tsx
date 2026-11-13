import { redirect } from "next/navigation";

/**
 * The old customer dashboard. Customers now have their account under /konto
 * and the office the admin dashboard; the middleware sends each to theirs, and
 * this covers a request that reaches the page anyway.
 */
export default async function OldDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/konto`);
}
