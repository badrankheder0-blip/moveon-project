import type { Metadata } from "next";
import { Suspense } from "react";

import { Planner } from "@/app/components/booking/Planner";
import { Footer } from "@/app/components/site/Footer";
import { isLocale, type Locale } from "@/lib/i18n/config";
import type { BookingConfig } from "@/app/components/booking/Planner";
import { markSrc } from "@/lib/site/defaults";
import { fetchSiteContent, fetchSiteTheme } from "@/lib/site/theme";

/**
 * The services the office offers (Dashboard → Services), so the first paint
 * already shows the right cards; the planner reads them again on the client.
 * Null on any failure — the planner then offers its own four.
 */
async function fetchBookingServices(): Promise<BookingConfig | null> {
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/services`;
  try {
    const response = await fetch(url, { next: { revalidate: 30 } });
    if (!response.ok) {
      console.error(`[planner] services could not be loaded from ${url} — HTTP ${response.status}`);
      return null;
    }
    const payload = (await response.json()) as Partial<BookingConfig>;
    return Array.isArray(payload.services) ? { services: payload.services, common: Array.isArray(payload.common) ? payload.common : [] } : null;
  } catch (error) {
    console.error(`[planner] services could not be loaded from ${url} — ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

/**
 * The booking planner — moving, renovation, cleaning and junk removal in one
 * plan.
 *
 * Rendered on the server only to read what the dashboard edits: the planner's
 * photos (`planner` section) and the site footer. Everything after that is the
 * client component, which keeps its step in the URL. The route stays bare in
 * `SiteChrome` — the marketing nav would offer a way out of a checkout — but
 * the planner's design closes with the site's own footer, so it renders it.
 */

export const metadata: Metadata = {
  title: "Buchungsplaner",
};

export default async function PlannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "de";

  const [site, sections, services] = await Promise.all([fetchSiteTheme(), fetchSiteContent(locale), fetchBookingServices()]);

  const footerCopy = Object.fromEntries(
    Object.entries(sections.footer ?? {}).map(([slot, value]) => [`footer.${slot}`, value]),
  );
  const brandName = site.brand["brand.name"]?.trim() || "m.on";

  return (
    // useSearchParams needs a boundary, and the frame is worth showing while
    // the URL resolves.
    <Suspense fallback={<div className="min-h-screen bg-surface-page" aria-busy="true" />}>
      <Planner
        images={sections.planner ?? {}}
        services={services}
        footer={<Footer copy={footerCopy} locale={locale} brandName={brandName} mark={markSrc(site.brand["brand.mark"])} />}
      />
    </Suspense>
  );
}
