import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { compareOf, ctaOf, loadPage, mythsOf, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ReviewsBlock } from "@/app/components/mon/blocks/Reviews";
import { fetchPublishedReviews, siteReviews } from "@/app/components/mon/blocks/reviewFeed";
import { Cards, ClosingCta, Compare, Myths } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Why m.on, "Six ways" (the prototype's `#/why`): the hero, the six reasons
 * with photos, the expectation cards, before & after, three reviews and the
 * closing card. CMS section `page-why`.
 */

const SECTION = "page-why";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function WhyPage({ params }: { params: { locale: Locale } }) {
  const [page, published] = await Promise.all([loadPage(params.locale, SECTION), fetchPublishedReviews()]);
  const { c, link } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("reasons.eyebrow")} title={c("reasons.title")} items={cardItems(page, "reasons")} numbered />
      <Myths {...mythsOf(page)} />
      <Compare {...compareOf(page)} />
      <ReviewsBlock eyebrow={c("reviews.eyebrow")} title={c("reviews.title")} items={siteReviews(page, published)} max={3} more={link("reviews.more")} />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
