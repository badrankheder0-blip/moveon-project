import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { ctaOf, loadPage } from "@/app/components/mon/blocks/content";
import { faqCategories, faqHubCopy, loadFaqStore } from "@/app/components/mon/blocks/faq";
import { FaqSearch } from "@/app/components/mon/blocks/FaqSearch";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ClosingCta } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * One FAQ category (the prototype's v14 `#/faq/<cat>`): the FAQ's hero and
 * search, a way back to all categories, that category's questions and the
 * closing pair. An unknown slug is a 404.
 */

const SECTION = "page-faq";

export async function generateMetadata({ params }: { params: { locale: Locale; category: string } }): Promise<Metadata> {
  const page = await loadPage(params.locale, SECTION);
  const cat = faqCategories(page, await loadFaqStore(params.locale, page.copy)).find((entry) => entry.slug === decodeURIComponent(params.category));
  const faq = page.c("meta.title");
  return cat ? { title: faq ? `${cat.title} · ${faq}` : cat.title } : {};
}

export default async function FaqCategoryPage({ params }: { params: { locale: Locale; category: string } }) {
  const page = await loadPage(params.locale, SECTION);
  const cats = faqCategories(page, await loadFaqStore(params.locale, page.copy));
  const slug = decodeURIComponent(params.category);
  if (!cats.some((cat) => cat.slug === slug)) notFound();

  return (
    <>
      <PageHero {...heroOf(page)} />
      <FaqSearch copy={faqHubCopy(page)} cats={cats} selected={slug} />
      <ClosingCta cta={ctaOf(page)} question />
    </>
  );
}