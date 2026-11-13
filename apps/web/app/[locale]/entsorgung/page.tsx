import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { pageMetadata } from "@/app/components/mon/blocks/content";
import { ServicePage } from "@/app/components/mon/blocks/ServicePage";

/**
 * The junk removal service page, as the website prototype draws a service page
 * (`#/services/clearance`). Every word, photo and link is a row of the CMS
 * section `service-disposal` (packages/db/src/pages-content.ts).
 */

const SECTION = "service-disposal";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default function Page({ params }: { params: { locale: Locale } }) {
  return <ServicePage locale={params.locale} section={SECTION} />;
}