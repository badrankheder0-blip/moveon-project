import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { StepsBlock } from "@/app/components/mon/blocks/client";
import { loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Business accounts (the prototype's `#/business`): the hero, five reasons
 * companies choose m.on (in one balanced row) and how a business move runs.
 * There is no request form on the page: the hero button and step 1 send
 * companies to the booking planner's business flow. CMS section
 * `page-for-business`.
 */

const SECTION = "page-for-business";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function ForBusinessPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} balanced />
      <section style={{ position: "relative" }}>
        <StepsBlock eyebrow={c("steps.eyebrow")} title={c("steps.title")} sets={[{ items: items("steps", ["title", "text"]) }]} />
      </section>
    </>
  );
}
