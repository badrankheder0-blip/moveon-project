import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

import { isExternal, readItems, siteHref, type Copy } from "./links";

/**
 * The public footer, as the website prototype draws it: a grey band with the
 * lockup and a "Home" link, a rule, then the copyright line, the social icons
 * and the small links (guides, guarantees, legal pages).
 *
 * The words, the links and the four social addresses are rows of the CMS
 * section `chrome`; a social icon shows only while its address is filled in.
 */

const SOCIAL_ICONS: Record<string, string> = {
  instagram:
    "M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10a4.5 4.5 0 0 1-4.5 4.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h0",
  youtube:
    "M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4a2.6 2.6 0 0 0-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8a2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z",
  facebook: "M15 3h-2.5A4.5 4.5 0 0 0 8 7.5V10H5.5v3.5H8V21h3.5v-7.5H14l.8-3.5h-3.3V7.8c0-.7.5-1.3 1.2-1.3H15z",
  tiktok: "M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.4 2.6 2.4 4.6 5 5",
};

/** Each network's own colour, and its soft shadow, as the prototype draws the circles. */
const SOCIAL_COLOURS: Record<string, [string, string]> = {
  instagram: ["linear-gradient(45deg,#feda75 0%,#fa7e1e 25%,#d62976 50%,#962fbf 75%,#4f5bd5 100%)", "#d6297640"],
  youtube: ["#ff0000", "#ff000040"],
  facebook: ["#1877f2", "#1877f240"],
  tiktok: ["#010101", "#01010133"],
};

export function SiteFooter({ copy, locale, logo }: { copy: Copy; locale: Locale; logo: string }) {
  const links = readItems(copy, "footer.links", ["label", "href"]);
  const socials = Object.keys(SOCIAL_ICONS).filter((name) => copy[`footer.${name}`]?.trim());

  return (
    <footer className="m-footer">
      <div className="m-footer-in">
        <div className="m-footer-top">
          <Link href={`/${locale}`} aria-label="m.on" style={{ display: "block" }}>
            <img src={logo} alt="m.on" />
          </Link>
          <Link href={`/${locale}`} className="m-footer-home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
            </svg>
            {copy["footer.home"]}
          </Link>
        </div>
        <div className="m-footer-bot">
          <small>{copy["footer.copyright"]}</small>
          {socials.length ? (
            <div className="m-socials">
              {socials.map((name) => (
                <a
                  key={name}
                  href={copy[`footer.${name}`]}
                  aria-label={name}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ["--so-bg" as string]: SOCIAL_COLOURS[name]?.[0], ["--so-sh" as string]: SOCIAL_COLOURS[name]?.[1] }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={SOCIAL_ICONS[name]} />
                  </svg>
                </a>
              ))}
            </div>
          ) : null}
          <nav>
            {links.map((link) => (
              <Link
                key={`${link.label}-${link.href}`}
                href={siteHref(locale, link.href)}
                {...(isExternal(link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
