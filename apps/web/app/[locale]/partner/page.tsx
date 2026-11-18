import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { StepsBlock } from "@/app/components/mon/blocks/client";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { ImageTiles } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Partnerships (the prototype's `#/partners`): the hero, the four services a
 * partner can book (the booking planner's pictures, name only), how a
 * partnership starts, and the partner request with an optional file (beside
 * it, what the file should hold and what happens after sending), which
 * reaches the website inbox as a partner lead and is mailed to the office
 * with the file attached (`POST /api/leads/with-file`). CMS section
 * `page-partner`.
 */

const SECTION = "page-partner";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function PartnerPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items, img } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <ImageTiles
        eyebrow={c("cards.eyebrow")}
        title={c("cards.title")}
        items={items("cards", ["title"]).map((card, i) => ({ title: card.title, img: img(`cards.${i + 1}.img`) ?? "" }))}
      />
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
          fieldOf(page, "firstName", "text", { required: true }),
          fieldOf(page, "lastName", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel"),
          fieldOf(page, "message", "area"),
        ]}
        guide={{
          title: c("form.guide.title"),
          items: items("form.guide", ["title", "text"]),
          afterTitle: c("form.after.title"),
          afterText: c("form.after.text"),
        }}
        upload={{
          label: c("form.file"),
          hint: c("form.fileHint"),
          choose: c("form.fileChoose"),
          remove: c("form.fileRemove"),
          errType: c("form.fileErrType"),
          errSize: c("form.fileErrSize"),
        }}
      />
    </>
  );
}
