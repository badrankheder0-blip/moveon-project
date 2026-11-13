import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { ChecklistBlock } from "@/app/components/mon/blocks/Checklist";
import { audiencesOf, ctaOf, loadPage, pageMetadata } from "@/app/components/mon/blocks/content";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { Audiences, ClosingCta } from "@/app/components/mon/blocks/Sections";
import { heroOf } from "@/app/components/mon/blocks/ServicePage";

/**
 * The moving plan (the prototype's `#/moving-plan`): the hero, the
 * homepage's moving types, the week-by-week checklist and the closing card.
 * CMS section `page-how-it-works`.
 */

const SECTION = "page-how-it-works";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  return pageMetadata(params.locale, SECTION);
}

export default async function MovingPlanPage({ params }: { params: { locale: Locale } }) {
  const page = await loadPage(params.locale, SECTION);
  const { c, items } = page;
  const phases = items("plan", ["title", "tasks"]).map((phase) => ({
    title: phase.title,
    tasks: phase.tasks
      .split("\n")
      .map((task) => task.trim())
      .filter(Boolean),
  }));

  return (
    <>
      <PageHero {...heroOf(page)} />
      <Audiences {...audiencesOf(page)} />
      <ChecklistBlock eyebrow={c("check.eyebrow")} title={c("check.title")} sub={c("check.sub")} progress={c("check.progress")} phases={phases} />
      <ClosingCta cta={ctaOf(page)} />
    </>
  );
}
