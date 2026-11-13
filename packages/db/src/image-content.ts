/**
 * The public pages' photographs, as editable content blocks.
 *
 * Every photo the site shows used to be a path hardcoded in a page component,
 * so replacing one — a stock image with another company's truck on it, say —
 * needed a developer. Each is now a `content_blocks` row of kind "image" whose
 * value is the picture's `/images/...` path (a file in `apps/web/public`) or an
 * https URL. The seeded value is the file the page shipped with, which the
 * page also keeps as its built-in fallback, so a database without these rows
 * renders exactly as before.
 *
 * A photograph does not change with the language, so each row carries the
 * same value in all four locales and the API writes an edit to all four at
 * once. The rows still exist per locale because `content_blocks` is keyed by
 * (section, slot, locale) and the public read is per locale; one row per
 * locale keeps that read a single indexed query with no special case.
 *
 * Alt texts are not here: where a photo has one it is already a text row in
 * its section, translated like any other copy.
 *
 * The slot sits next to the text it illustrates (`strip.1.poster` beside
 * `strip.1.label`), and its sort order places it there in the editor too.
 */

import { HOME_CONTENT } from "./home-content.js";
import type { ContentSeed } from "./page-content.js";
import { PAGES_CONTENT } from "./pages-content.js";

/** Shorthand: an image row is one value repeated across the locales. */
function image(section: string, slot: string, label: string, sortOrder: number, src: string): ContentSeed {
  return {
    section,
    slot,
    kind: "image",
    label,
    sortOrder,
    values: { de: src, en: src, ar: src, tr: src },
  };
}

const PLANNER = "planner";

export const IMAGE_CONTENT: ContentSeed[] = [
  // The inner pages' photos moved with their copy to pages-content.ts.

  // ══ Booking planner (/rechner) ═════════════════════════════════════
  // The two "who is booking?" cards and the four service cards. Supplied with
  // the planner prototype as m.on-branded illustrations.
  image(PLANNER, "welcome.private.image", "Welcome — private customer card: picture", 1, "/images/planner/private.webp"),
  image(PLANNER, "welcome.business.image", "Welcome — business customer card: picture", 2, "/images/planner/business.webp"),
  image(PLANNER, "services.moving.image", "Services — moving card: picture", 3, "/images/planner/service-moving.webp"),
  image(PLANNER, "services.renovation.image", "Services — renovation card: picture", 4, "/images/planner/service-renovation.webp"),
  image(PLANNER, "services.cleaning.image", "Services — cleaning card: picture", 5, "/images/planner/service-cleaning.webp"),
  image(PLANNER, "services.disposal.image", "Services — junk removal card: picture", 6, "/images/planner/service-disposal.webp"),
];

/**
 * The public pages' video clips, as content blocks of kind "video".
 *
 * Held to the photos' rules: one value in all four locales, a `/videos/...`
 * path (a file in `apps/web/public/videos`) or an https URL — a dashboard
 * upload. Empty means "no clip": the panel shows its poster photo, which is
 * what every row is seeded as, because the clips themselves have not been
 * delivered yet.
 */
export const VIDEO_CONTENT: ContentSeed[] = [];

/**
 * The seeded default for a photo or video slot, for the dashboard's reset.
 * The homepage's and the chrome's media live with their copy in
 * home-content.ts, and the inner pages' in pages-content.ts, so they are
 * looked up there too — those first, since they replace older rows here.
 */
export function mediaDefault(section: string, slot: string): string | undefined {
  return [...PAGES_CONTENT, ...HOME_CONTENT, ...IMAGE_CONTENT, ...VIDEO_CONTENT].find(
    (seed) => seed.section === section && seed.slot === slot && (seed.kind === "image" || seed.kind === "video"),
  )?.values.en;
}
