import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ServicePanels, StepsBlock } from "@/app/components/mon/blocks/client";
import { ctaOf, loadPage, mythsOf, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards, ClosingCta, Myths } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";
import { siteHref } from "@/app/components/mon/links";

/**
 * All services (the prototype's `#/services`): the hero, the four services
 * as photo panels that open on hover, private or business, the expectation
 * cards, how booking works and the closing pair. CMS section `page-services`.
 */

const SECTION = "page-services";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function ServicesPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items, img, link } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <section style={{ position: "relative" }}>
        <ServicePanels
          more={c("panels.more")}
          items={items("panels", ["name", "short", "href"]).map((panel, i) => ({
            ...panel,
            href: siteHref(page.locale, panel.href),
            img: img(`panels.${i + 1}.img`) ?? "",
          }))}
        />
      </section>
      <Cards eyebrow={c("forwho.eyebrow")} title={c("forwho.title")} items={cardItems(page, "forwho")} minW="320px" />
      <Myths {...mythsOf(page)} />
      <section style={{ position: "relative" }}>
        <StepsBlock eyebrow={c("steps.eyebrow")} title={c("steps.title")} img={img("steps.img")} sets={[{ items: items("steps", ["title", "text"]), btn: link("steps.btn") }]} />
      </section>
      <ClosingCta cta={ctaOf(page)} question />
    </>
  );
}
