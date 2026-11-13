import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { FaqBlock, StepsBlock } from "@/app/components/mon/blocks/client";
import { ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards, ClosingCta } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";
import { siteHref } from "@/app/components/mon/links";

/**
 * Guarantees & insurance (the prototype's `#/guarantees`): the hero with
 * three facts, six commitments, what happens if something is damaged, the
 * insurance questions and the closing card. CMS section `page-guarantees`.
 */

const SECTION = "page-guarantees";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function GuaranteesPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items, img, link } = page;
  const faq = items("faq", ["q", "a"]);

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} />
      <section style={{ position: "relative" }}>
        <StepsBlock eyebrow={c("steps.eyebrow")} title={c("steps.title")} img={img("steps.img")} sets={[{ items: items("steps", ["title", "text"]), btn: link("steps.btn") }]} />
      </section>
      {faq.length ? (
        <section style={{ position: "relative" }}>
          <FaqBlock eyebrow={c("faq.eyebrow")} eyebrowHref={siteHref(params.locale, "/faq")} title={c("faq.title")} items={faq} />
        </section>
      ) : null}
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
