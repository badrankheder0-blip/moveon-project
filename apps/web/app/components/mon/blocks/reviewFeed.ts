import { readItems } from "../links";
import { formatDate, servicesOf, type PageCopy } from "./content";
import type { ReviewItem } from "./Reviews";

/**
 * The review cards the inner pages show.
 *
 * Customers' own words once moderation has published reviews that say
 * something (`GET /api/reviews`); until then — or if the feed is down — the
 * quotes on the Reviews page in the CMS (`page-reviews`, `reviews.N.*`).
 * The two are never mixed, as on the homepage. The public feed carries no
 * name and no service, so a published review shows the page's "m.on
 * customer" line and belongs to no filter chip.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface PublishedReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export async function fetchPublishedReviews(): Promise<PublishedReview[]> {
  const url = `${API}/api/reviews?limit=50`;
  try {
    const response = await fetch(url, { next: { revalidate: 60, tags: ["cms"] } });
    if (!response.ok) {
      console.error(`[reviews-feed] "reviews" could not be loaded from ${url} — HTTP ${response.status}`);
      return [];
    }
    const payload = (await response.json()) as { items?: PublishedReview[] };
    return payload.items ?? [];
  } catch (error) {
    console.error(`[reviews-feed] "reviews" could not be loaded from ${url} — ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/** The CMS quotes, optionally only one service's. */
export function cmsReviews(page: PageCopy, service?: string): ReviewItem[] {
  const copy = page.sections["page-reviews"] ?? {};
  const names = new Map(servicesOf(page).map((s) => [s.id, s.name]));
  return readItems(copy, "reviews", ["text", "name", "date", "service"])
    .filter((review) => review.text && (!service || review.service === service))
    .map((review) => {
      const group = names.get(review.service) ?? review.service;
      return {
        text: review.text,
        name: review.name,
        meta: [formatDate(review.date, page.locale), group].filter(Boolean).join(" · "),
        group,
      };
    });
}

/** Published reviews when there are any worth showing, else the CMS quotes. */
export function siteReviews(page: PageCopy, published: PublishedReview[]): ReviewItem[] {
  const name = page.sections["page-reviews"]?.["feed.customerName"]?.trim() ?? "";
  const fromFeed = published
    .filter((review) => review.rating >= 4 && review.comment?.trim())
    .map((review) => ({ text: review.comment?.trim() ?? "", name, meta: formatDate(review.createdAt, page.locale), group: "" }));
  return fromFeed.length ? fromFeed : cmsReviews(page);
}
