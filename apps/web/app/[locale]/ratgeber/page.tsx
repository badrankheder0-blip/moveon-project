import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { guidesOf } from "@/app/components/mon/blocks/guides";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ArticleCards, ClosingCta } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";
import { siteHref } from "@/app/components/mon/links";

/**
 * The guides (the prototype's `#/guides`): the hero, a card per guide and
 * the closing pair. Each guide opens at /ratgeber/<slug>. `/blog` redirects
 * here. CMS section `page-blog`.
 */

const SECTION = "page-blog";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function GuidesPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c } = page;
  const cards = guidesOf(page).map((guide) => ({
    href: siteHref(page.locale, `/ratgeber/${guide.slug}`),
    img: guide.img,
    cat: guide.cat,
    read: `${guide.minutes} ${c("list.minRead")}`,
    title: guide.title,
    excerpt: guide.excerpt,
  }));

  return (
    <>
      <PageHero {...heroOf(page)} />
      <ArticleCards items={cards} more={c("list.more")} pt="clamp(40px,5vw,64px)" />
      <ClosingCta cta={ctaOf(page)} question />
    </>
  );
}
