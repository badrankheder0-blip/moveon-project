import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { CitiesBlock } from "@/app/components/mon/blocks/Cities";
import { ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ClosingCta, Split } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Locations (the prototype's `#/locations`): the hero, the NRW map with its
 * routes, the postcode check beside the cities served and the closing card.
 * CMS section `page-locations`; the postcode check also asks the service
 * zones drawn in the dashboard.
 */

const SECTION = "page-locations";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function LocationsPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items, img, lines, href } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Split eyebrow={c("split.eyebrow")} title={c("split.title")} paras={lines("split.body")} img={img("split.img") ?? ""} map />
      <CitiesBlock
        plz={{
          eyebrow: c("plz.eyebrow"),
          title: c("plz.title"),
          button: c("plz.button"),
          placeholder: c("plz.placeholder"),
          yes: c("plz.yes"),
          yesText: c("plz.yesText"),
          yesLink: c("plz.yesLink"),
          yesHref: href("plz.yesLinkHref"),
          no: c("plz.no"),
          noText: c("plz.noText"),
          noLink: c("plz.noLink"),
          noHref: href("plz.noLinkHref"),
          bad: c("plz.bad"),
          prefixes: c("plz.prefixes"),
        }}
        citiesTitle={c("cities.title")}
        cities={items("cities", ["name"]).map((city) => city.name)}
        note={c("cities.note")}
      />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
