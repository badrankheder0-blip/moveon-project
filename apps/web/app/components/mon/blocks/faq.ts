import type { Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";

import { readItems, siteHref, type Copy } from "../links";
import { servicesOf, type PageCopy } from "./content";
import type { FaqCategory, FaqHubCopy } from "./FaqSearch";

/**
 * The FAQ's categories, as the dashboard's FAQ screen (admin v11) manages
 * them, all in the CMS section `page-faq`:
 *
 *   - the FAQ's own topics: `topics.N.slug|title|icon`, questions
 *     `topicN.M.q|a`;
 *   - one per service with questions: `svcfaq.N.id|section|slug|icon`, its
 *     questions the service page's own FAQ (`faq.M.q|a` in that section),
 *     named as the services menu names the service;
 *   - categories the office adds: `custom.N.id|title|icon`;
 *   - questions the office adds to any of them: `extra.<category id>.M.q|a`
 *     (a topic's or service's id is its slug);
 *   - `layout.hidden`: the ids of the categories left off the FAQ page.
 *
 * An added question or category name left empty in one language shows the
 * first language it was written in (German, English, Turkish, Arabic).
 * Each category opens at /faq/<id>.
 */

const SECTION = "page-faq";
const ORDER: Locale[] = ["de", "en", "tr", "ar"];

export interface FaqStore {
  /** Copy of `page-faq` in every language, for the fallback. */
  all: Record<Locale, Copy>;
  hidden: Set<string>;
}

export async function loadFaqStore(locale: Locale, current: Copy): Promise<FaqStore> {
  const others = await Promise.all(ORDER.map((loc) => (loc === locale ? Promise.resolve({ [SECTION]: current }) : fetchSiteContent(loc, SECTION))));
  const all = Object.fromEntries(ORDER.map((loc, i) => [loc, others[i]?.[SECTION] ?? {}])) as Record<Locale, Copy>;
  const hidden = new Set(
    (current["layout.hidden"] ?? all.de["layout.hidden"] ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
  return { all, hidden };
}

/** A slot in this language, else the first language that has it. */
function pick(store: FaqStore, locale: Locale, slot: string): string {
  const own = store.all[locale][slot]?.trim();
  if (own) return own;
  for (const loc of ORDER) {
    const value = store.all[loc][slot]?.trim();
    if (value) return value;
  }
  return "";
}

/** The questions the office added to a category, in any language. */
export function extraQuestions(store: FaqStore, locale: Locale, id: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  for (let n = 1; n <= 60; n += 1) {
    const q = pick(store, locale, `extra.${id}.${n}.q`);
    const a = pick(store, locale, `extra.${id}.${n}.a`);
    if (!q && !a) break;
    if (q) out.push({ q, a });
  }
  return out;
}

export function faqCategories(page: PageCopy, store: FaqStore): FaqCategory[] {
  const href = (slug: string) => siteHref(page.locale, `/faq/${slug}`);
  const topics = page.items("topics", ["slug", "title", "icon"]).map((topic, i) => ({
    slug: topic.slug,
    href: href(topic.slug),
    title: topic.title,
    icon: topic.icon,
    items: [...page.items(`topic${i + 1}`, ["q", "a"]).filter((item) => item.q), ...extraQuestions(store, page.locale, topic.slug)],
  }));
  const names = new Map(servicesOf(page).map((service) => [service.id, service.name]));
  const services = page.items("svcfaq", ["id", "section", "slug", "icon"]).map((entry) => ({
    slug: entry.slug,
    href: href(entry.slug),
    title: names.get(entry.id) ?? entry.id,
    icon: entry.icon,
    items: [...readItems(page.sections[entry.section] ?? {}, "faq", ["q", "a"]).filter((item) => item.q), ...extraQuestions(store, page.locale, entry.slug)],
  }));
  const custom = page.items("custom", ["id", "icon"]).map((entry, i) => ({
    slug: entry.id,
    href: href(entry.id),
    title: pick(store, page.locale, `custom.${i + 1}.title`),
    icon: entry.icon,
    items: extraQuestions(store, page.locale, entry.id),
  }));
  return [...topics, ...services, ...custom].filter((cat) => cat.slug && cat.title && cat.items.length && !store.hidden.has(cat.slug));
}

/** A service page's FAQ: its own questions and the ones added on the FAQ screen. */
export async function serviceFaq(page: PageCopy, section: string): Promise<{ q: string; a: string }[]> {
  const own = page.items("faq", ["q", "a"]).filter((item) => item.q);
  const faq = page.sections[SECTION] ?? {};
  const entry = readItems(faq, "svcfaq", ["id", "section", "slug"]).find((item) => item.section === section);
  if (!entry?.slug) return own;
  const store = await loadFaqStore(page.locale, faq);
  return [...own, ...extraQuestions(store, page.locale, entry.slug)];
}

export function faqHubCopy(page: PageCopy): FaqHubCopy {
  const { c } = page;
  return {
    placeholder: c("search.placeholder"),
    empty: c("search.empty"),
    one: c("cats.one"),
    many: c("cats.many"),
    cta: c("cats.cta"),
    back: c("cats.back"),
    backHref: siteHref(page.locale, "/faq"),
  };
}
