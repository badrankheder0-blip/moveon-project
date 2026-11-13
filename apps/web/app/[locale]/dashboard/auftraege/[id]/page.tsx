import { redirect } from "next/navigation";

/** Moved to the account: /konto/auftraege/[id] (see middleware.ts). */
export default async function OldOrder({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/konto/auftraege/${encodeURIComponent(id)}`);
}
