import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { StepsBlock } from "@/app/components/mon/blocks/client";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Business accounts (the prototype's `#/business`): the hero, six reasons
 * companies choose m.on, how a business move runs and the request form,
 * which reaches the website inbox as a business lead (`POST /api/leads`).
 * The prototype ends on the form, without the closing pair. CMS section
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
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} />
      <section style={{ position: "relative" }}>
        <StepsBlock eyebrow={c("steps.eyebrow")} title={c("steps.title")} sets={[{ items: items("steps", ["title", "text"]) }]} />
      </section>
      <FormBlock
        anchor="form"
        kind="business"
        locale={params.locale}
        copy={formCopyOf(page)}
        fields={[
          fieldOf(page, "company", "text", { required: true, wide: true }),
          fieldOf(page, "name", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel"),
          fieldOf(page, "size", "select"),
          fieldOf(page, "message", "area"),
        ]}
      />
    </>
  );
}
