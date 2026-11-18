import { createHash } from "node:crypto";

import { deriveHintSecret } from "@mon/auth";
import { env } from "@mon/config";

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

/**
 * The website (Next.js) keeps its own copy of every page for up to a minute
 * and, after that, still serves the old copy once while it rebuilds. So an
 * edit published in the dashboard — a word added or removed — could stay on
 * the site through several reloads. This tells the website to drop every
 * cached page now (its POST /api/cms-revalidate), after the API's own cache
 * is cleared, so the next request is built from the published content.
 *
 * Signed with a token both sides derive from the session-hint secret: the
 * website's port is reachable from outside, the route must not be.
 */
const WEB_INTERNAL_URL = process.env.WEB_INTERNAL_URL ?? "http://127.0.0.1:3200";

export function revalidateToken(): string {
  const secret = env.JWT_HINT_SECRET ?? deriveHintSecret(env.JWT_ACCESS_SECRET);
  return createHash("sha256").update(`mon:cms-revalidate:v1:${secret}`).digest("hex");
}

export async function revalidateWebsite(): Promise<void> {
  try {
    const response = await fetch(`${WEB_INTERNAL_URL}/api/cms-revalidate`, {
      method: "POST",
      headers: { "x-mon-revalidate": revalidateToken() },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn(`[site-cache] website revalidate answered ${response.status}`);
  } catch (error) {
    // Published all the same; the pages fall back to their one-minute expiry.
    console.warn("[site-cache] website revalidate failed:", error instanceof Error ? error.message : error);
  }
}

/** Clears both caches, then the website's pages, so an edit is live on the next request, not after a TTL. */
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

  await revalidateWebsite();
}
