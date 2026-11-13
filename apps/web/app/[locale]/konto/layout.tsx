import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccountShell } from "@/app/components/account/AccountShell";

const TITLE: Record<string, string> = { de: "Mein Konto", en: "My account", ar: "حسابي", tr: "Hesabım" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: TITLE[locale] ?? "Mein Konto", robots: { index: false, follow: false } };
}

/** Every /konto page shares the account card, so it stays put between sections. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
