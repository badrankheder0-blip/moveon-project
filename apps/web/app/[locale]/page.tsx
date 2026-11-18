import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/lib/i18n/config";
import { fetchSiteContent } from "@/lib/site/theme";
import { storiesOf } from "@/app/components/mon/blocks/content";
import { HomePage, type Testimonial } from "@/app/components/mon/home/HomePage";
import { readItems, type Copy } from "@/app/components/mon/links";

/**
 * The homepage, as the m.on website prototype draws it (m-on-website).
 *
 * A server component: every word and photo comes from the CMS section
 * `home`, and the testimonials from the review feed once moderation has
 * published any. The hero panels, the carousel, the before/after handle,
 * the tabs, the flip cards, the moving day and the FAQ are the only client
 * islands (components/mon/home/Interactive.tsx).
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * A minute, as on the reviews page: a review published in moderation should
 * reach the homepage while the moderator is still looking.
 */
const REVIEWS_REVALIDATE_SECONDS = 60;

/** What `GET /api/reviews` returns — deliberately nothing about the reviewer. */
interface PublishedReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

/**
 * Records that the review feed could not be read. The section falls back to
 * the CMS quotes, which is right for a visitor and exactly why it must not
 * happen silently; the same shape as `[site-content]` in `lib/site/theme.ts`.
 */
function reportFeedFailure(feed: string, url: string, reason: string) {
  console.error(`[home-feed] "${feed}" could not be loaded from ${url} — ${reason}`);
}

async function fetchPublishedReviews(): Promise<PublishedReview[]> {
  const url = `${API}/api/reviews?limit=20`;

  try {
    const response = await fetch(url, { next: { revalidate: REVIEWS_REVALIDATE_SECONDS, tags: ["cms"] } });
    if (!response.ok) {
      reportFeedFailure("reviews", url, `HTTP ${response.status}`);
      return [];
    }

    const payload = (await response.json()) as { items?: PublishedReview[] };
    return payload.items ?? [];
  } catch (error) {
    reportFeedFailure("reviews", url, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/** "12 Sept 2026", in the page's language, as the prototype writes review dates. */
function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const tag = { de: "de-DE", en: "en-GB", tr: "tr-TR", ar: "ar-u-nu-latn" }[locale];
  return date.toLocaleDateString(tag, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * The three review cards.
 *
 * Customers' own words once moderation has published reviews that say
 * something; until then — or if the feed is down — the three quotes in the
 * CMS. The two are never mixed: a hand-picked quote beside real ones would
 * read as one of them. Only four- and five-star reviews with a comment
 * qualify, since the cards carry no stars. The public feed has no names, so a
 * published review shows the reviews page's "m.on customer" line.
 */
function pickTestimonials(copy: Copy, reviewsCopy: Copy, published: PublishedReview[], locale: Locale): Testimonial[] {
  const customerName = reviewsCopy["feed.customerName"] ?? "";

  const fromFeed = published
    .filter((review) => review.rating >= 4 && review.comment?.trim())
    .slice(0, 3)
    .map((review) => ({
      key: review.id,
      text: review.comment?.trim() ?? "",
      name: customerName,
      meta: formatDate(review.createdAt, locale),
    }));

  if (fromFeed.length > 0) return fromFeed;

  return readItems(copy, "reviews", ["text", "name", "date"])
    .filter((review) => review.text)
    .slice(0, 3)
    .map((review, i) => ({
      key: `cms-${i}`,
      text: review.text,
      name: review.name,
      meta: review.date ? formatDate(review.date, locale) : "",
    }));
}

export default async function Page({
  params,
}: {
  // Not `Locale`: the segment is whatever the URL held.
  params: { locale: string };
}) {
  const { locale } = params;

  // `[locale]` matches any single path segment, so `/favicon.ico` and every
  // scanner's probe would otherwise reach the API as a "locale".
  if (!isLocale(locale)) notFound();

  const [sections, published] = await Promise.all([fetchSiteContent(locale), fetchPublishedReviews()]);
  const copy: Copy = sections.home ?? {};
  const testimonials = pickTestimonials(copy, sections["page-reviews"] ?? {}, published, locale);

  return <HomePage copy={copy} locale={locale} testimonials={testimonials} stories={storiesOf(sections)} />;
}
