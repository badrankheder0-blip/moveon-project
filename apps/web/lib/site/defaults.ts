import { isSafeImageSrc } from "@mon/core";

import shippedImages from "./public-images.json";

/**
 * The shape of the site's theme, and the values it falls back to.
 *
 * Kept apart from `theme.ts` because the client-side `useSiteSettings` hook
 * needs these too, and `theme.ts` now reaches for server-only React and Next
 * APIs. Importing this leaf instead keeps the fetch layer — and the
 * request-scoped failure log it writes to — out of the browser bundle.
 */

export interface SiteTheme {
  theme: Record<string, string>;
  brand: Record<string, string>;
  contact: Record<string, string>;
  seo: Record<string, string>;
  /** Settings → Company: where the booking planner accepts addresses. */
  booking?: { serviceAreas: string; onlyInsideAreas: boolean };
}

/** Falls back to the brand defaults, so a failed fetch never yields an unstyled page. */
export const DEFAULT_THEME: SiteTheme = {
  theme: {
    "color.brand": "#E62039",
    "color.brandHover": "#C4162E",
    "color.ink": "#121214",
    "color.accent": "#FFCB08",
    "color.pageBackground": "#F8F9FA",
    "color.success": "#10B981",
    "color.warning": "#F59E0B",
    "radius.base": "12",
    "font.display": "Outfit",
    "font.body": "DM Sans",
  },
  brand: {
    "brand.name": "m.on",
    "brand.legalName": "m.on GmbH",
    "brand.logo": "/images/brand/logo-lockup.png",
    "brand.mark": "/images/brand/logo.png",
    "brand.tagline": "Moving made simpler, faster, and stress-free.",
  },
  contact: {},
  seo: {},
};

/**
 * The two brand images the chrome is drawn around, used when a setting is
 * empty or unsafe: the lockup (the mark above the wordmark) that the wide
 * header of 357:23886 carries, and the mark alone that every smaller slot draws.
 */
export const DEFAULT_LOGO = "/images/brand/logo-lockup.png";
export const DEFAULT_MARK = "/images/brand/logo.png";

/**
 * The brand image to render: `brand.logo`, or with DEFAULT_MARK as the
 * fallback, `brand.mark`.
 *
 * The API only stores an `/images/...` path or an https URL; the value is
 * checked again because it goes straight into an `<img src>`, and a local
 * path whose file no longer ships falls back rather than showing a broken logo.
 */
export function logoSrc(value: string | undefined, fallback: string = DEFAULT_LOGO): string {
  const trimmed = value?.trim();
  if (!trimmed || !isSafeImageSrc(trimmed)) return fallback;
  if (trimmed.startsWith("/images/") && !(shippedImages as string[]).includes(trimmed)) return fallback;
  return trimmed;
}

/** `brand.mark`, held to the same checks. */
export function markSrc(value: string | undefined): string {
  return logoSrc(value, DEFAULT_MARK);
}
