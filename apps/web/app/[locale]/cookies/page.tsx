import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { CookieChoice } from "@/app/components/mon/blocks/CookieChoice";
import { LEGAL_DOCS } from "@/app/components/mon/blocks/LegalFrame";
import { PageHero } from "@/app/components/mon/blocks/PageHero";
import { LegalDoc } from "@/app/components/mon/blocks/Sections";
import { readItems, siteHref } from "@/app/components/mon/links";

/**
 * The cookie policy, in the website prototype's legal frame: the documents'
 * rail with this page added to it, the policy's clauses and the controller
 * details as numbered sections, then the cookie choice drawn as the cookie
 * card, so a visitor can change it after the card has gone.
 *
 * The prototype has no cookie page; the words are the CMS section
 * `page-legal-cookie` (page-content.ts): `doc.*`, `clause.N.*`, `card.*`,
 * `consent.*`.
 */

const SECTION = "page-legal-cookie";

export async function generateMetadata({ params }: { params: { locale: Locale } }): Promise<Metadata> {
  const copy = (await fetchSiteContent(params.locale))[SECTION] ?? {};
  const title = copy["doc.title"]?.trim();
  return title ? { title } : {};
}

export default async function CookiesPage({ params }: { params: { locale: Locale } }) {
  const locale = params.locale;
  const sections = await fetchSiteContent(locale);
  const copy = sections[SECTION] ?? {};
  const c = (slot: string) => copy[slot]?.trim() ?? "";
  const strip = (title: string) => title.replace(/^\d+\.\s*/, "");

  const docs = [
    ...LEGAL_DOCS.map((doc) => {
      const own = sections[doc.section] ?? {};
      return { label: own["meta.title"]?.trim() || own["hero.headline"]?.trim() || doc.route, href: siteHref(locale, doc.route), current: false };
    }),
    { label: c("doc.title"), href: siteHref(locale, "/cookies"), current: true },
  ];

  const clauses = readItems(copy, "clause", ["title", "body"]).map((clause) => ({ title: strip(clause.title), body: clause.body }));
  const card = readItems(copy, "card", ["label", "lines"]);
  if (c("card.title") && card.length) {
    clauses.push({ title: strip(c("card.title")), body: card.map((entry) => `${entry.label}\n${entry.lines}`).join("\n\n") });
  }

  return (
    <>
      <PageHero eyebrow={sections["page-privacy"]?.["hero.eyebrow"]?.trim() || c("doc.eyebrow")} title={c("doc.title")} sub={c("doc.meta")} />
      <LegalDoc docs={docs} sections={clauses}>
        <CookieChoice
          title={c("consent.title")}
          body={c("consent.body")}
          accept={c("consent.accept")}
          reject={c("consent.reject")}
          privacyHref={siteHref(locale, "/datenschutz")}
        />
      </LegalDoc>
    </>
  );
}
