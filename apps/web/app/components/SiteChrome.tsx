"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { CookieBanner } from "./mon/CookieBanner";
import type { Copy } from "./mon/links";
import { Motion } from "./mon/Motion";
import { NetBackground } from "./mon/NetBackground";
import { SiteHeader } from "./mon/SiteHeader";
import { WhatsAppButton } from "./mon/WhatsAppButton";
import { useI18n } from "@/lib/i18n/provider";

/** What the header shows from the settings, read by the layout on the server. */
export interface ChromeSettings {
  /** `brand.logo`, checked by `logoSrc`. */
  logo: string;
  /** `brand.mark`, checked by `markSrc`. */
  mark: string;
  brandName: string;
  phone?: string | undefined;
  /** `contact.whatsapp`: the floating button's number; none hides it. */
  whatsapp?: string | undefined;
  jobsUrl?: string | undefined;
  /** `brand.background`: the symbol the network behind the page scatters. */
  background?: string | undefined;
}

/**
 * Decides which frame a route gets.
 *
 * Three kinds of page, and they want different chrome:
 *
 *   - **Booking** (the planner and its confirmation) draws its own header;
 *     the marketing nav would offer a way out mid-booking.
 *   - **Dashboard** brings its own sidebar and header, and a floating chat
 *     bubble would sit on top of the content.
 *   - **Public pages** get the website prototype's chrome: the top bar and
 *     header, the footer, the drifting network behind the page, the cookie
 *     card and the contact pill. `.mon-site` is also what scales the page to
 *     the prototype's 85% (mon.css).
 *
 * Done by route prefix rather than by nesting layouts, because the locale
 * segment already owns the providers and splitting it would mean mounting them
 * twice.
 */

// Sign-in, sign-up and the password pages sit inside the header and footer,
// as the website prototype draws its #/login, #/signup and #/forgot.
const BARE_PREFIXES = [
  // The booking confirmation brings the calculator's own header and has no
  // footer; the marketing nav above it would offer a way out of a checkout.
  "/buchen",
  // The booking planner draws its own header and step rail, and renders the
  // site footer itself; the marketing nav would offer a way out mid-booking.
  "/rechner",
];
const APP_PREFIXES = ["/dashboard", "/admin"];

/** The m.on symbol the network scatters among its dots, until Settings names another. */
const NET_SYMBOL = "/images/mon/home/symbol.webp";

export function SiteChrome({
  children,
  footer,
  settings,
  chrome,
}: {
  children: ReactNode;
  /**
   * Rendered by the layout, which is a server component and can read the CMS.
   * Passed through rather than imported so this file stays client-side.
   */
  footer?: ReactNode;
  settings: ChromeSettings;
  /** The CMS section `chrome`: the header's, footer's and widgets' words. */
  chrome: Copy;
}) {
  const pathname = usePathname();
  const { locale } = useI18n();

  // Strip the locale segment so the comparison is route-shaped.
  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";

  const isBare = BARE_PREFIXES.some((prefix) => route.startsWith(prefix));
  const isApp = APP_PREFIXES.some((prefix) => route.startsWith(prefix));

  if (isBare || isApp) {
    // Auth fills the screen; the dashboard shell supplies its own navigation,
    // and the WhatsApp button would overlap the content it floats above.
    return <>{children}</>;
  }

  return (
    <div className="mon-site" id="top">
      <NetBackground symbol={settings.background || NET_SYMBOL} />
      <SiteHeader copy={chrome} logo={settings.logo} />
      <div className="m-main">{children}</div>
      {footer}
      <CookieBanner copy={chrome} locale={locale} />
      <WhatsAppButton number={settings.whatsapp} />
      <Motion />
    </div>
  );
}
