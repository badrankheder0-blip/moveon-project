import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fieldOf, formCopyOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { FormBlock } from "@/app/components/mon/blocks/FormBlock";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { RolesBlock } from "@/app/components/mon/blocks/Roles";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * Jobs (the prototype's `#/jobs`): the hero, what the crew can count on,
 * the open roles and a short application, which reaches the website inbox
 * as a job lead (`POST /api/leads`). "Apply" on a role picks it in the form.
 * CMS section `page-jobs`.
 */

const SECTION = "page-jobs";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function JobsPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items } = page;
  const roles = items("roles", ["title", "text", "type", "place"]);

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} />
      <RolesBlock eyebrow={c("roles.eyebrow")} title={c("roles.title")} apply={c("roles.apply")} roles={roles} formId="apply" />
      <FormBlock
        anchor="apply"
        kind="job"
        locale={params.locale}
        copy={formCopyOf(page)}
        fields={[
          fieldOf(page, "name", "text", { required: true }),
          fieldOf(page, "email", "email", { required: true }),
          fieldOf(page, "phone", "tel", { required: true }),
          fieldOf(page, "role", "select", { choices: roles.map((role) => role.title) }),
          fieldOf(page, "message", "area"),
        ]}
      />
    </>
  );
}
