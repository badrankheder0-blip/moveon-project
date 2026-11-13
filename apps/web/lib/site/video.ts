import { isSafeVideoSrc } from "@mon/core";

/**
 * The clip for a video slot, or undefined when there is none to play.
 *
 * Clips are `content_blocks` rows of kind "video" (seeded empty in
 * `packages/db/src/image-content.ts`): a `/videos/...` file the site ships or
 * an https URL, usually a dashboard upload. Empty means "no clip", and the
 * caller shows the slot's poster photo instead.
 *
 * The API already refuses anything else; the value is checked again here
 * because it goes straight into a `<video src>`, and a row written around the
 * API must not reach a visitor. Unlike a photo there is no shipped-file check:
 * a `/videos/` path that is missing simply fails to load, and the `<video>`
 * keeps showing its poster.
 */
export function videoSrc(copy: Record<string, string>, slot: string): string | undefined {
  const value = copy[slot]?.trim();
  return value && isSafeVideoSrc(value) ? value : undefined;
}
