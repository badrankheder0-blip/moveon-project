import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteTheme } from "@/lib/site/theme";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Contact (the prototype's `#/contact`): the hero, three quick ways to help
 * and the message form, which reaches the website inbox as a contact lead
 * (`POST /api/leads`). CMS section `page-contact`.
 *
 * A quick-help card whose address is a bare `tel:` calls the number in
 * Settings → Contact and shows it; while no number is set it shows its own
 * text and links nowhere.
 */

const SECTION = "page-contact";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const [page, site] = await Promise.all([loadPage(params.locale, SECTION), fetchSiteTheme()]);
  const { c } = page;
  const phone = site.contact["contact.phone"]?.trim() ?? "";

  const quick = cardItems(page, "quick").map((item) => {
    if (item.href !== "tel:") return item;
    return phone ? { ...item, text: `⁦${phone}⁩`, href: `tel:${phone.replace(/[^\d+]/g, "")}` } : { ...item, href: "" };
  });

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("quick.eyebrow")} title={c("quick.title")} items={quick} />
      <FormBlock
        anchor="form"
        kind="contact"
        locale={params.locale}
        copy={formCopyOf(page)}
        fields={[
          fieldOf(page, "name", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel"),
          fieldOf(page, "topic", "select"),
          fieldOf(page, "message", "area", { required: true }),
        ]}
      />
    </>
  );
}
