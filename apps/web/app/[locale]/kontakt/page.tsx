import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { LinkBanner } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Contact ("Fragen", the prototype's `#/contact`): the headline and intro,
 * the message form straight under them, and one full-width banner pointing
 * to the FAQ. There is no phone contact and no "manage booking" card — the
 * bookings are in the account, reached from the top bar once signed in.
 * CMS section `page-contact`.
 */

const SECTION = "page-contact";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function ContactPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, link } = page;

  return (
    <>
      <PageHero {...heroOf(page)} />
      <FormBlock
        anchor="form"
        kind="contact"
        locale={params.locale}
        copy={formCopyOf(page)}
        fields={[
          fieldOf(page, "firstName", "text", { required: true }),
          fieldOf(page, "lastName", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel"),
          fieldOf(page, "topic", "select"),
          fieldOf(page, "message", "area", { required: true }),
        ]}
      />
      <LinkBanner text={c("faqBanner.text")} link={link("faqBanner.btn")} />
    </>
  );
}
