import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ReviewsBlock } from "@/app/components/mon/blocks/Reviews";
import { fetchPublishedReviews, siteReviews } from "@/app/components/mon/blocks/reviewFeed";
import { ClosingCta } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Reviews (the prototype's `#/reviews`): the hero, every review with chips
 * to filter by service, and the closing card.
 *
 * The cards are the customers' own reviews once moderation has published
 * any (`GET /api/reviews`); until then the quotes of the CMS section
 * `page-reviews`, which carry their service and so feed the chips.
 */

const SECTION = "page-reviews";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function ReviewsPage({ params }: { params: { locale: Locale } }) {
  const [page, published] = await Promise.all([loadPage(params.locale, SECTION), fetchPublishedReviews()]);
  const { c } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <ReviewsBlock eyebrow={c("list.eyebrow")} title={c("list.title")} items={siteReviews(page, published)} allLabel={c("list.all")} chips />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
