import { redis } from "../../lib/redis.js";

/**
 * The cache in front of the website's public reads (`/api/site/theme`,
 * `/api/site/content`), kept apart from the routes so the draft publishers
 * can clear it too: content and settings now change on "Save & publish", not
 * on the request that edits them.
 */

export const SETTINGS_CACHE_KEY = "site:settings:v1";
export const CONTENT_CACHE_PREFIX = "site:content:v1:";
export const CACHE_TTL_SECONDS = 300;

/** Clears both caches so an edit is live on the next request, not after a TTL. */
export async function invalidateSiteCache(): Promise<void> {
  await redis.del(SETTINGS_CACHE_KEY).catch(() => undefined);

  // Scanned rather than enumerated. `section` is a free-text query parameter,
  // so the cached key space is whatever has been requested — every `page-*`
  // frame, not the five names the old list happened to carry. Enumerating left
  // an edit to any other section waiting out the full TTL, which read as the
  // dashboard silently ignoring the change.
  let cursor = "0";

  try {
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${CONTENT_CACHE_PREFIX}*`, "COUNT", 250);

      cursor = next;

      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  } catch {
    // The write itself is already committed. A cache that cannot be cleared
    // must not turn that into a failed request; the entries expire on their
    // own TTL.
  }
}
