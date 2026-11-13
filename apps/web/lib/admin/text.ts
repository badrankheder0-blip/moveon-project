import { useCallback } from "react";

import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The admin dashboard's words, one dictionary per screen.
 *
 * The public site and the customer pages keep theirs in the shared catalogue
 * (lib/i18n/catalogue.ts). The dashboard has some thousand strings of its
 * own that nothing else reads, so each screen carries its dictionary next to
 * it instead of growing that file: the type below still makes a missing
 * language a compile error, and a screen's words load with the screen.
 *
 *     const TEXT = defineText({ title: { de: "Aufträge", en: "Orders", ar: "الطلبات", tr: "Siparişler" } });
 *     const tx = useText(TEXT);
 *     tx("title");
 *     tx("count", { n: 3 });   // "{n} orders" → "3 orders"
 */

export type Words = Record<Locale, string>;

export function defineText<const T extends Record<string, Words>>(text: T): T {
  return text;
}

export type TextFn<T extends Record<string, Words>> = (key: keyof T & string, values?: Record<string, string | number>) => string;

export function fill(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

export function useText<T extends Record<string, Words>>(text: T): TextFn<T> {
  const { locale } = useI18n();

  return useCallback((key, values) => fill(text[key]?.[locale] ?? text[key]?.de ?? key, values), [text, locale]);
}
