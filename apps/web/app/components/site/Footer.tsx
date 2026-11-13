import Link from "next/link";
import type { ReactNode } from "react";

import { LanguageMenu } from "@/app/components/site/ChromeControls";
import { BOOK_NOW_CLASS, BOOK_PATH, SECTION_LINKS, sectionHref } from "@/app/components/site/chromeLinks";
import { MESSAGES } from "@/lib/i18n/catalogue";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_MARK } from "@/lib/site/defaults";

type Copy = Record<string, string>;

/**
 * Site footer: "Footer / Inherited inverted" from the v2 homepage (357:24037).
 *
 * Light now — #e9ecef with 12px top corners, where the 101:128 footer it
 * replaces was ink. One 47px row of the mark · the header's six links ·
 * language + a red "Book now", a #292d32 hairline at 20%, then the legal line:
 * © · four round social buttons · Privacy / Terms / Imprint.
 *
 * Link labels come from the catalogue, like the header they repeat (and from
 * the same list, so the two cannot drift). The copyright line, legal labels
 * and social URLs are CMS rows, so an admin can change them, and a social
 * button without a URL is left out rather than pointing at "#".
 */

/** 120px inline at 1440, the frame's 24/16 block padding. */
const SHELL = "mx-auto w-full max-w-[1440px] px-5 md:px-10 2xl:px-[120px]";

/**
 * Pages neither bar links to.
 *
 * The header's links are all sections of the homepage, and its utility bar
 * covers About, Business accounts and Partnerships — which leaves these three
 * pages with no way in from anywhere on the site. They sit on their own quiet
 * row under the main one, so the frame's main row stays exactly as drawn.
 */
const MORE = [
  { path: "/so-funktioniert", key: "nav.howItWorks" },
  { path: "/kontakt", key: "nav.contact" },
  { path: "/ratgeber", key: "nav.guide" },
] as const;

/**
 * The frame's three legal links, plus Cookies.
 *
 * The frame has no "Cookie Policy", but /cookies is where consent can be
 * changed after the banner is gone, and a consent choice that cannot be
 * revisited is not valid consent. So it stays, last and in the same style.
 */
const LEGAL = [
  { path: "/datenschutz", slot: "footer.legal.privacy" },
  { path: "/agb", slot: "footer.legal.terms" },
  { path: "/impressum", slot: "footer.legal.imprint" },
  { path: "/cookies", slot: "footer.legal.cookies" },
] as const;

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

/** 14/18 semibold ink, as in the header, in a 44px-tall hit area. */
const LINK = `inline-flex min-h-11 items-center rounded-md text-body-sm leading-[18px] font-semibold whitespace-nowrap text-text-strong transition-colors hover:text-brand-red ${FOCUS}`;

/** 12/16 regular, the legal line's size. */
const SMALL_LINK = `inline-flex min-h-11 items-center rounded-md text-[12px] leading-4 whitespace-nowrap transition-colors hover:text-brand-red ${FOCUS}`;

export function Footer({
  copy,
  locale,
  brandName,
  mark = DEFAULT_MARK,
}: {
  copy: Copy;
  locale: Locale;
  /** `brand.name` from the settings — the frame's "© 2026 m.on." */
  brandName?: string | undefined;
  /** `brand.mark` from the settings, already checked by `markSrc`. */
  mark?: string;
}) {
  const href = (path: string) => `/${locale}${path}`;
  const brand = brandName || "m.on";

  // Only an http(s) address reaches an href: these are free-text CMS rows.
  const socials = SOCIALS.map((social) => ({ ...social, url: copy[`footer.social.${social.key}`]?.trim() ?? "" }))
    .filter((social) => /^https?:\/\/\S+$/i.test(social.url));

  return (
    <footer className="rounded-t-[12px] bg-neutral-200 text-text-strong">
      <div className={`${SHELL} flex flex-col gap-4 pt-6 pb-4`}>
        {/* ── Main row (357:24038) ─────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <Link href={href("")} className={`shrink-0 rounded-md ${FOCUS}`}>
            {/* "m.on mark" (357:24039): the mark alone, 86x47. */}
            <img src={mark} alt={brand} width={86} height={47} className="h-[47px] w-auto max-w-[180px] object-contain" />
          </Link>

          {/* Last on small screens, where it wraps onto its own lines. */}
          <nav
            aria-label={MESSAGES["footer.navLabel"][locale]}
            className="order-last w-full xl:order-none xl:w-auto"
          >
            <ul className="flex flex-wrap items-center gap-x-3">
              {SECTION_LINKS.map((link) => (
                <li key={link.anchor}>
                  <Link href={sectionHref(locale, link.anchor)} className={LINK}>
                    {MESSAGES[link.key][locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* "App and language" (357:24047): globe + language, then Book now, 16 apart. */}
          <div className="flex items-center gap-4">
            <LanguageMenu variant="footer" placement="above" />

            <Link href={href(BOOK_PATH)} className={BOOK_NOW_CLASS}>
              {MESSAGES["nav.bookNow"][locale]}
            </Link>
          </div>
        </div>

        {/* Kept small — 28px rather than the frame's 44px rows — so the
            footer grows as little as possible past what is drawn. */}
        <ul className="-mt-2 flex flex-wrap items-center gap-x-6">
          {MORE.map((link) => (
            <li key={link.path}>
              <Link
                href={href(link.path)}
                className={`inline-flex min-h-7 items-center rounded-md text-[12px] leading-4 whitespace-nowrap text-text-default transition-colors hover:text-brand-red ${FOCUS}`}
              >
                {MESSAGES[link.key][locale]}
              </Link>
            </li>
          ))}
        </ul>

        {/* "Divider" (357:24052): #292d32 at 20%. */}
        <hr className="border-0 border-t border-neutral-800/20" />

        {/* ── Legal line (357:24053) ───────────────────────────────── */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
          <p className="text-[12px] leading-4">
            © {new Date().getFullYear()} {brand}. {copy["footer.rights"]}
          </p>

          {socials.length > 0 ? (
            <ul className="flex items-center gap-3">
              {socials.map((social) => (
                <li key={social.key}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className={`grid size-11 place-items-center rounded-full bg-neutral-800 text-white transition-colors hover:bg-brand-red ${FOCUS}`}
                  >
                    {social.icon}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <ul className="flex flex-wrap gap-x-4">
            {LEGAL.filter((item) => Boolean(copy[item.slot])).map((item) => (
              <li key={item.path}>
                <Link className={SMALL_LINK} href={href(item.path)}>
                  {copy[item.slot]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ── Social icons (357:24055), white on #292d32, in the frame's order ──── */

const SOCIALS: { key: string; label: string; icon: ReactNode }[] = [
  {
    // "instagram" 18px, 1.5px stroke.
    key: "instagram",
    label: "Instagram",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37ZM17.5 6.5h.01" />
      </svg>
    ),
  },
  {
    // "youtube" 24px, 1.5px stroke.
    key: "youtube",
    label: "YouTube",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17Z" />
        <path d="m10 15 5-3-5-3v6Z" />
      </svg>
    ),
  },
  {
    // "facebook-icon" 16px: an outlined rounded square around a solid "f".
    key: "facebook",
    label: "Facebook",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" stroke="currentColor" />
        <path
          d="M8.6 14.5V9.3H7.1V7.5h1.5V6.2c0-1.5.9-2.3 2.2-2.3h1.3v1.6h-.9c-.6 0-.8.3-.8.8v1.2h1.7l-.3 1.8h-1.4v5.2H8.6Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    // "tiktok-icon" 16px, a solid 12x13 glyph.
    key: "tiktok",
    label: "TikTok",
    icon: (
      <svg width="13" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03a10.7 10.7 0 0 1-4.2-.97c-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75a7.6 7.6 0 0 1-1.35 3.94 7.5 7.5 0 0 1-5.91 3.21 7.3 7.3 0 0 1-4.08-1.03 7.6 7.6 0 0 1-3.65-5.71c-.02-.5-.03-1-.01-1.49a7.4 7.4 0 0 1 2.58-4.96 7.4 7.4 0 0 1 6.15-1.72c.02 1.48-.04 2.96-.04 4.44a3.4 3.4 0 0 0-3.02.37 3.3 3.3 0 0 0-1.36 1.75c-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87a3.4 3.4 0 0 0 2.77-1.61c.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07Z" />
      </svg>
    ),
  },
];
