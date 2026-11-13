import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { faqCategories, faqHubCopy, loadFaqStore } from "@/app/components/mon/blocks/faq";
import { FaqSearch } from "@/app/components/mon/blocks/FaqSearch";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ClosingCta } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * The FAQ (the prototype's v14 `#/faq`): the hero, a search over every
 * answer, a card per category — the FAQ's topics and each service's
 * questions — and the closing pair. A category opens at /faq/<slug>.
 * CMS section `page-faq` (see components/mon/blocks/faq.ts).
 */

const SECTION = "page-faq";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function FaqPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);

  return (
    <>
      <PageHero {...heroOf(page)} />
      <FaqSearch copy={faqHubCopy(page)} cats={faqCategories(page, await loadFaqStore(params.locale, page.copy))} />
      <ClosingCta cta={ctaOf(page)} question />
    </>
  );
}
