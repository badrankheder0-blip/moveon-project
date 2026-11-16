import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchJobs, jobsText } from "@/lib/site/jobs";
import { loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { RolesBlock } from "@/app/components/mon/blocks/Roles";
import { Cards } from "@/app/components/mon/blocks/Sections";
import { cardItems, heroOf } from "@/app/components/mon/blocks/ServicePage";
import { siteHref } from "@/app/components/mon/links";

/**
 * Jobs (the prototype's `#/jobs`): the hero, what the crew can count on and
 * the open roles. The roles are the dashboard's job postings (Admin → Stellen),
 * each with a details page and an application page of its own; the rest is
 * the CMS section `page-jobs`.
 */

const SECTION = "page-jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function JobsPage({ params }: { params: { locale: Locale } }) {
  const [page, jobs] = await Promise.all([loadPage(params.locale, SECTION), fetchJobs()]);
  const { c } = page;
  const t = jobsText(params.locale);

  const roles = jobs.map((job) => ({
    title: job.title,
    text: job.summary,
    type: t[job.employmentType],
    place: job.location,
    href: siteHref(params.locale, `/jobs/${job.slug}`),
    applyHref: siteHref(params.locale, `/jobs/${job.slug}/bewerben`),
  }));

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Cards eyebrow={c("cards.eyebrow")} title={c("cards.title")} items={cardItems(page, "cards")} />
      <RolesBlock eyebrow={c("roles.eyebrow")} title={c("roles.title")} apply={c("roles.apply")} roles={roles} />
    </>
  );
}
