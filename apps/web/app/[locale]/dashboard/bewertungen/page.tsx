import { redirect } from "next/navigation";

/** Reviews are left on the completed booking in the account (see middleware.ts). */
export default async function OldReviews({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/konto/auftraege`);
}
