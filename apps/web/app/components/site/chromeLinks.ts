import type { MessageKey } from "@/lib/i18n/catalogue";
import type { Locale } from "@/lib/i18n/config";

/**
 * What the header and the footer of 357:23886 link to, in one place.
 *
 * The two repeat the same six links and the same red "Book now", so they are
 * listed once here rather than twice — the frame draws them identical, and two
 * copies would drift. A plain module rather than part of either component:
 * the footer is a server component and the nav bar a client one, and a value
 * exported from a client file cannot be read on the server.
 */

/**
 * The main row's links (357:23913, repeated in the footer at 357:24040).
 *
 * Every one is a section of the homepage rather than a page, so from any
 * other page they lead back to the homepage at that section. The ids are
 * agreed with the homepage, which puts them on its sections.
 */
export const SECTION_LINKS = [
  { anchor: "questions", key: "nav.section.questions" },
  { anchor: "moving-plan", key: "nav.section.movingPlan" },
  { anchor: "services", key: "nav.services" },
  { anchor: "six-ways", key: "nav.section.sixWays" },
  { anchor: "reviews", key: "nav.reviews" },
  { anchor: "faqs", key: "nav.section.faqs" },
] as const satisfies readonly { anchor: string; key: MessageKey }[];

/**
 * "Locations" in the utility bar: the homepage's coverage-across-NRW section,
 * the map with "Check your area". It is also what "Moving plan" leads to — a
 * section has one id — so the two links share it.
 */
export const COVERAGE_ANCHOR = "moving-plan";

/** A homepage section, from anywhere on the site. */
export function sectionHref(locale: Locale, anchor: string): string {
  return `/${locale}#${anchor}`;
}

/**
 * "Book now" goes where a booking starts: the calculator, which is also where
 * the old "Instant Quote" button and the basket icon lead.
 */
export const BOOK_PATH = "/rechner";

/** The red pill (357:23934 / 358:24234): 10/24 padding, r88, 16/21 white. */
export const BOOK_NOW_CLASS =
  "inline-flex items-center justify-center rounded-full bg-brand-red px-6 py-2.5 text-body leading-[21px] whitespace-nowrap text-white transition-colors hover:bg-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

export interface SettingLink {
  href: string;
  /** An address off the site opens in a new tab. */
  external: boolean;
}

/**
 * A link an admin typed into a setting (the Jobs page), or null to hide it.
 *
 * The setting is free text, so only the two shapes the dashboard asks for get
 * through: a path on this site, which gains the locale prefix, or an http(s)
 * address. Anything else — a `javascript:` URL included — hides the link
 * rather than reaching an `href`.
 */
export function settingLink(value: string | undefined, locale: Locale): SettingLink | null {
  const url = value?.trim();

  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return { href: `/${locale}${url}`, external: false };
  if (/^https?:\/\/\S+$/i.test(url)) return { href: url, external: true };

  return null;
}
