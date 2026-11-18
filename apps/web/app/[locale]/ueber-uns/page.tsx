import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ctaOf, loadPage, pageMetadata, statsOf } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards, ClosingCta, Split, Stats } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * About m.on (the prototype's `#/about`): the hero, how we work beside a
 * photo, the numbers, four promises and the closing pair. CMS section
 * `page-about` — the numbers too (`stats.N.value` / `.label`); only while it
 * has none does the page show the homepage's.
 */

const SECTION = "page-about";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function AboutPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items, img, lines } = page;
  const ownStats = items("stats", ["value", "label"]);

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Split
        eyebrow={c("split.eyebrow")}
        title={c("split.title")}
        paras={lines("split.body")}
        bullets={items("split.points", ["text"]).map((point) => point.text)}
        img={img("split.img") ?? ""}
        flip
      />
      <Stats items={ownStats.length ? ownStats : statsOf(page)} />
      <Cards eyebrow={c("promises.eyebrow")} title={c("promises.title")} items={cardItems(page, "promises")} center />
      <ClosingCta cta={ctaOf(page)} question />
    </>
  );
}
