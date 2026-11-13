import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { LegalFrame, legalMetadata } from "@/app/components/mon/blocks/LegalFrame";

/** The terms of service, in the website prototype's legal frame. CMS section `page-terms`. */

const SECTION = "page-terms";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return legalMetadata(params.locale, SECTION);
}

export default function Page({ params }: { params: { locale: Locale } }) {
  return <LegalFrame locale={params.locale} section={SECTION} />;
}