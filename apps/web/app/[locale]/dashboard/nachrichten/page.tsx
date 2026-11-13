import { redirect } from "next/navigation";

/**
 * The account's messages are its notifications now (see middleware.ts); a
 * support conversation continues in the site's chat.
 */
export default async function OldMessages({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/konto/benachrichtigungen`);
}
