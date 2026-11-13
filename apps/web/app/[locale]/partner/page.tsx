import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { StepsBlock } from "@/app/components/mon/blocks/client";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Partnerships (the prototype's `#/partners`): the hero, who m.on works
 * with, how a partnership runs and the partner request, which reaches the
 * website inbox as a partner lead (`POST /api/leads`). CMS section
 * `page-partner`.
 */

const SECTION = "page-partner";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function PartnerPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} />
      <section style={{ position: "relative" }}>
        <StepsBlock eyebrow={c("steps.eyebrow")} title={c("steps.title")} sets={[{ items: items("steps", ["title", "text"]) }]} />
      </section>
      <FormBlock
        anchor="apply"
        kind="partner"
        locale={params.locale}
        copy={formCopyOf(page)}
        fields={[
          fieldOf(page, "company", "text", { required: true, wide: true }),
          fieldOf(page, "name", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel"),
          fieldOf(page, "type", "select"),
          fieldOf(page, "message", "area"),
        ]}
      />
    </>
  );
}
