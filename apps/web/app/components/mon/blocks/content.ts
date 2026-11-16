import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/config";
import { imageSrc } from "@/lib/site/image";
import { fetchSiteContent } from "@/lib/site/theme";

import { readItems, siteHref, type Copy } from "../links";
import type { StoryData } from "./client";
import type { FieldSpec, FormCopy } from "./FormBlock";
import type { LinkSpec } from "./kit";
import type { CtaCopy } from "./Sections";

/**
 * Reading an inner page's CMS section.
 *
 * Every inner page is one section of `content_blocks` (`page-about`,
 * `service-moving`, …; rows in packages/db/src/pages-content.ts). The blocks
 * the prototype shares with the homepage — the closing pair, the numbers, the
 * moving types, the expectation cards, before & after and the moving day —
 * are read from the `home` section, so the office edits them once for the
 * whole site, as the prototype does. Links are stored without the language
 * and get it here.
 */

export interface PageCopy {
  locale: Locale;
  copy: Copy;
  home: Copy;
  chrome: Copy;
  sections: Record<string, Copy>;
  /** A slot's text, trimmed; "" when the row is missing. */
  c: (slot: string) => string;
  /** A slot holding a link, with the locale added. */
  href: (slot: string) => string;
  /** A button: `slot` is its text, `slot + "Href"` its address. Undefined without text. */
  link: (slot: string) => LinkSpec | undefined;
  /** A photo slot, if it holds a usable picture. */
  img: (slot: string) => string | undefined;
  /** A numbered list `prefix.1.field`, … */
  items: <K extends string>(prefix: string, fields: readonly K[]) => Record<K, string>[];
  /** A text slot split into its non-empty lines. */
  lines: (slot: string) => string[];
}

export function pageCopy(locale: Locale, sections: Record<string, Copy>, section: string): PageCopy {
  const copy = sections[section] ?? {};
  const c = (slot: string) => copy[slot]?.trim() ?? "";
  const href = (slot: string) => siteHref(locale, c(slot));
  return {
    locale,
    copy,
    home: sections.home ?? {},
    chrome: sections.chrome ?? {},
    sections,
    c,
    href,
    link: (slot) => (c(slot) ? { label: c(slot), href: href(`${slot}Href`) } : undefined),
    img: (slot) => imageSrc(copy, slot),
    items: (prefix, fields) => readItems(copy, prefix, fields),
    lines: (slot) =>
      c(slot)
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
  };
}

/** Every section for the locale — the same cached read the layout makes. */
export async function loadPage(locale: Locale, section: string): Promise<PageCopy> {
  return pageCopy(locale, await fetchSiteContent(locale), section);
}

/** The tab title and description: `meta.title` / `meta.description`. */
export async function pageMetadata(locale: Locale, section: string): Promise<Metadata> {
  const sections = await fetchSiteContent(locale);
  const copy = sections[section] ?? {};
  const title = copy["meta.title"]?.trim();
  const description = copy["meta.description"]?.trim();
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  };
}

/** The closing pair, from the homepage's rows. */
export function ctaOf(page: PageCopy): CtaCopy {
  const h = (slot: string) => page.home[`cta.${slot}`]?.trim() ?? "";
  return {
    qTitle: h("qTitle"),
    qText: h("qText"),
    qBtn: h("qBtn"),
    qHref: siteHref(page.locale, h("qHref")),
    eyebrow: h("eyebrow"),
    title: h("title"),
    sub: h("sub"),
    btn: h("btn"),
    href: siteHref(page.locale, h("href")),
    img: imageSrc(page.home, "cta.img") ?? "",
  };
}

/** The homepage's numbers. */
export function statsOf(page: PageCopy) {
  return readItems(page.home, "stats", ["value", "label"]);
}

/** The homepage's expectation cards. */
export function mythsOf(page: PageCopy) {
  const h = (slot: string) => page.home[slot]?.trim() ?? "";
  return {
    eyebrow: h("myths.eyebrow"),
    title: h("myths.title"),
    sub: h("myths.sub"),
    frontLabel: h("myths.frontLabel"),
    backLabel: h("myths.backLabel"),
    hint: h("myths.hint"),
    items: readItems(page.home, "myths", ["front", "back"]),
  };
}

/** The homepage's before & after. */
export function compareOf(page: PageCopy) {
  const h = (slot: string) => page.home[slot]?.trim() ?? "";
  return {
    eyebrow: h("compare.eyebrow"),
    title: h("compare.title"),
    sub: h("compare.sub"),
    before: imageSrc(page.home, "compare.before") ?? "",
    after: imageSrc(page.home, "compare.after") ?? "",
    beforeLabel: h("compare.beforeLabel"),
    afterLabel: h("compare.afterLabel"),
  };
}

/**
 * Every service's day, hour by hour (the prototype's v14 `storyB`), in the
 * services menu's order: moving is the homepage's own moving day (`home`,
 * `story.*`), the others their service section's `story.*` rows. The tab
 * names are the services menu's.
 */
const STORY_SECTIONS: Record<string, string> = {
  moving: "home",
  painting: "service-renovation",
  cleaning: "service-cleaning",
  clearance: "service-disposal",
};

export function storiesOf(sections: Record<string, Copy>): StoryData[] {
  return readItems(sections.chrome ?? {}, "mega", ["id", "name"])
    .filter((service) => STORY_SECTIONS[service.id])
    .map((service) => {
      const copy = sections[STORY_SECTIONS[service.id]!] ?? {};
      const c = (slot: string) => copy[slot]?.trim() ?? "";
      return {
        id: service.id,
        name: service.name,
        eyebrow: c("story.eyebrow"),
        title: c("story.title"),
        sub: c("story.sub"),
        steps: readItems(copy, "story", ["time", "title", "text"]).map((step, i) => ({
          ...step,
          img: imageSrc(copy, `story.${i + 1}.img`) ?? "",
        })),
      };
    })
    .filter((story) => story.steps.length);
}

/** The homepage's moving types. */
export function audiencesOf(page: PageCopy) {
  const h = (slot: string) => page.home[slot]?.trim() ?? "";
  return {
    eyebrow: h("audiences.eyebrow"),
    title: h("audiences.title"),
    sub: h("audiences.sub"),
    tabs: readItems(page.home, "audiences", ["tab", "title", "body", "linkText", "linkHref", "after", "btn", "btnHref", "img"], {
      untrimmed: ["after"],
    }).map((tab) => ({ ...tab, linkHref: siteHref(page.locale, tab.linkHref), btnHref: siteHref(page.locale, tab.btnHref) })),
  };
}

/** The services as the header's menu names them: id → name, photo, page. */
export function servicesOf(page: PageCopy) {
  return readItems(page.chrome, "mega", ["id", "name", "short", "img", "href"]).map((service) => ({
    ...service,
    href: siteHref(page.locale, service.href),
  }));
}

/** A lead form's words: `form.*`. */
export function formCopyOf(page: PageCopy): FormCopy {
  const { c } = page;
  return {
    eyebrow: c("form.eyebrow"),
    title: c("form.title"),
    sub: c("form.sub"),
    submit: c("form.submit"),
    sentTitle: c("form.sentTitle"),
    sentText: c("form.sentText"),
    sendAnother: c("form.sendAnother"),
    errFill: c("form.errFill"),
    errEmail: c("form.errEmail"),
    errSend: c("form.errSend"),
  };
}

/**
 * One field of a lead form, labelled by `form.<name>`; a select's choices are
 * the lines of `form.<name>Options` unless given.
 */
export function fieldOf(
  page: PageCopy,
  name: string,
  type: FieldSpec["type"],
  options: { required?: boolean; wide?: boolean; choices?: string[] } = {},
): FieldSpec {
  return {
    name,
    type,
    label: page.c(`form.${name}`),
    ...(options.required ? { required: true } : {}),
    ...(options.wide || type === "area" ? { wide: true } : {}),
    ...(type === "select" ? { options: options.choices ?? page.lines(`form.${name}Options`) } : {}),
    // An optional hint inside the empty field: `form.<name>Placeholder`.
    ...(page.c(`form.${name}Placeholder`) ? { placeholder: page.c(`form.${name}Placeholder`) } : {}),
  };
}

/** "12 Sept 2026", in the page's language, as the prototype writes review dates. */
export function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return value;
  const tag = { de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" }[locale];
  return date.toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}
