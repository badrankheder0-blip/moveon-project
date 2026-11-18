import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Drops every cached page and CMS read, called by the API right after
 * "Save & publish" (apps/api site-cache.ts, revalidateWebsite) so a published
 * edit — added, changed or removed — is on the site at the next request
 * instead of after the one-minute expiry and a stale reload.
 *
 * Only the API can call it: the token is derived from the session-hint
 * secret both processes share (next.config.js puts JWT_HINT_SECRET into this
 * process's environment).
 */

export const dynamic = "force-dynamic";

function expected(): Buffer | null {
  const secret = process.env.JWT_HINT_SECRET;
  if (!secret) return null;
  return Buffer.from(createHash("sha256").update(`mon:cms-revalidate:v1:${secret}`).digest("hex"));
}

export async function POST(request: Request) {
  const want = expected();
  const got = Buffer.from(request.headers.get("x-mon-revalidate") ?? "");
  if (!want || got.length !== want.length || !timingSafeEqual(got, want)) {
    return Response.json({ ok: false }, { status: 403 });
  }

  revalidateTag("cms");
  revalidatePath("/", "layout");
  return Response.json({ ok: true, at: new Date().toISOString() });
}
