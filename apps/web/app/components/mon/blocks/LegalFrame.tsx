import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";

import { siteHref, type Copy } from "../links";
import { PageHero } from "./PageHero";
import { LegalDoc } from "./Sections";

/**
 * The legal pages in the prototype's frame (`#/legal/:doc`): the "LEGAL"
 * hero, a rail of the three documents beside the open one, its review note
 * and its numbered sections.
 *
 * The texts are the statutory ones of legal-content.ts (`page-privacy`,
 * `page-terms`, `page-imprint`: `hero.headline`, `notice`, `N.title` /
 * `N.body`), not the prototype's placeholder drafts; pages-content.ts adds
 * each section's small label and tab title, which also names it in the rail.
 */

export const LEGAL_DOCS = [
  { section: "page-privacy", route: "/datenschutz" },
  { section: "page-terms", route: "/agb" },
  { section: "page-imprint", route: "/impressum" },
] as const;

/** `1.title` / `1.body`, `2.title` / `2.body`, … until the first gap. */
function numbered(copy: Copy) {
  const out: { title: string; body: string }[] = [];
  for (let n = 1; n <= 40; n += 1) {
    // The frame numbers the sections itself; a title's own "3. " would double it.
    const title = (copy[`${n}.title`]?.trim() ?? "").replace(/^\d+\.\s*/, "");
    const body = copy[`${n}.body`]?.trim() ?? "";
    if (!title && !body) break;
    out.push({ title, body });
  }
  return out;
}

export async function legalMetadata(locale: Locale, section: string): Promise<Metadata> {
  const copy = (await fetchSiteContent(locale))[section] ?? {};
  const title = copy["meta.title"]?.trim() || copy["hero.headline"]?.trim();
  return title ? { title } : {};
}

export async function LegalFrame({ locale, section, extra }: { locale: Locale; section: string; extra?: { label: string; route: string } }) {
  const sections = await fetchSiteContent(locale);
  const copy = sections[section] ?? {};
  const c = (slot: string) => copy[slot]?.trim() ?? "";

  const docs = [
    ...LEGAL_DOCS.map((doc) => {
      const own = sections[doc.section] ?? {};
      return {
        label: own["meta.title"]?.trim() || own["hero.headline"]?.trim() || doc.route,
        href: siteHref(locale, doc.route),
        current: doc.section === section,
      };
    }),
    ...(extra ? [{ label: extra.label, href: siteHref(locale, extra.route), current: true }] : []),
  ];

  return (
    <>
      <PageHero eyebrow={c("hero.eyebrow")} title={c("hero.headline")} sub={c("hero.subline")} />
      <LegalDoc docs={docs} note={c("notice")} sections={numbered(copy)} />
    </>
  );
}
