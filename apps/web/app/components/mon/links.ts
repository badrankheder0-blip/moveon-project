import type { Locale } from "@/lib/i18n/config";

/**
 * Links an admin types into the CMS, turned into hrefs.
 *
 * The CMS stores site paths without the language ("/kontakt", "/#services"),
 * so the same row works in all four locales; this adds the locale prefix.
 * External addresses, mail and phone links pass through unchanged. Anything
 * else — a `javascript:` URL included — becomes the homepage rather than
 * reaching an `href`.
 */
export function siteHref(locale: Locale, href: string | undefined): string {
  const value = href?.trim() ?? "";

  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (value.startsWith("#")) return `/${locale}${value}`;
  if (value.startsWith("/") && !value.startsWith("//")) {
    return value === "/" ? `/${locale}` : `/${locale}${value}`;
  }

  return `/${locale}`;
}

/** True for addresses off the site, which open in a new tab. */
export function isExternal(href: string | undefined): boolean {
  return /^https?:/i.test(href?.trim() ?? "");
}

/** A CMS row map, by slot. */
export type Copy = Record<string, string>;

/**
 * A numbered list out of a CMS section: `prefix.1.field`, `prefix.2.field`, …
 *
 * Stops at the first number with none of the fields filled, so an admin
 * shortens a list by clearing its last item.
 */
export function readItems<K extends string>(
  copy: Copy,
  prefix: string,
  fields: readonly K[],
  options: { max?: number; untrimmed?: readonly K[] } = {},
): Record<K, string>[] {
  const items: Record<K, string>[] = [];
  const max = options.max ?? 24;

  for (let n = 1; n <= max; n += 1) {
    const raw = Object.fromEntries(fields.map((field) => [field, copy[`${prefix}.${n}.${field}`] ?? ""])) as Record<K, string>;
    if (fields.every((field) => !raw[field].trim())) break;
    // Text that continues a sentence (" to make room…") keeps its leading space.
    const item = Object.fromEntries(
      fields.map((field) => [field, options.untrimmed?.includes(field) ? raw[field] : raw[field].trim()]),
    ) as Record<K, string>;
    items.push(item);
  }

  return items;
}

/** Two letters for an avatar, from a name. */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "·"
  );
}
