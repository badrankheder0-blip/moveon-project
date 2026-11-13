import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { LegalFrame, legalMetadata } from "@/app/components/mon/blocks/LegalFrame";

/** The privacy policy, in the website prototype's legal frame. CMS section `page-privacy`. */

const SECTION = "page-privacy";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return legalMetadata(params.locale, SECTION);
}

export default function Page({ params }: { params: { locale: Locale } }) {
  return <LegalFrame locale={params.locale} section={SECTION} />;
}