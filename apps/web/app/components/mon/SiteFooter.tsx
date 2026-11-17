import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";

import { isExternal, readItems, siteHref, type Copy } from "./links";

/**
 * The public footer, as the website prototype draws it: a grey band with the
 * lockup and a "Home" link, a rule, then the copyright line, the social icons
 * and the small links (guides, guarantees, legal pages).
 *
 * The words, the links and the four social addresses (Instagram, TikTok,
 * X/Twitter, Facebook) are rows of the CMS section `chrome`. The four icons
 * always show, in each network's colour; one becomes a link once its address
 * is filled in.
 */

/** The four networks, in the order the footer shows them. */
const SOCIALS = ["instagram", "tiktok", "twitter", "facebook"] as const;
type Social = (typeof SOCIALS)[number];

const SOCIAL_LABEL: Record<Social, string> = { instagram: "Instagram", tiktok: "TikTok", twitter: "X (Twitter)", facebook: "Facebook" };

/** Each network's logo, white on its own colour. */
function SocialGlyph({ name }: { name: Social }) {
  if (name === "instagram") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r=".6" fill="currentColor" />
      </svg>
    );
  }
  const d: Record<Exclude<Social, "instagram">, string> = {
    tiktok:
      "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
    twitter: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
    facebook: "M14 22v-8.4h2.8l.45-3.3H14V8.2c0-.95.27-1.6 1.63-1.6h1.73V3.66c-.3-.04-1.33-.13-2.53-.13-2.5 0-4.2 1.53-4.2 4.33v2.44H7.8v3.3h2.83V22z",
  };
  const size = name === "facebook" ? 20 : 15;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={name === "tiktok" ? "is-tiktok" : undefined}>
      <path d={d[name]} />
    </svg>
  );
}

/** Each network's own colour, and its soft shadow. */
const SOCIAL_COLOURS: Record<Social, [string, string]> = {
  instagram: ["radial-gradient(circle at 30% 107%,#fdf497 0%,#fdf497 5%,#fd5949 45%,#d6249f 60%,#285aeb 90%)", "#d6249f40"],
  tiktok: ["#010101", "#01010133"],
  twitter: ["#000000", "#00000033"],
  facebook: ["#1877f2", "#1877f240"],
};

export function SiteFooter({ copy, locale, logo }: { copy: Copy; locale: Locale; logo: string }) {
  const links = readItems(copy, "footer.links", ["label", "href"]);

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
          <div className="m-socials">
            {SOCIALS.map((name) => {
              const href = copy[`footer.${name}`]?.trim();
              const style = { ["--so-bg" as string]: SOCIAL_COLOURS[name][0], ["--so-sh" as string]: SOCIAL_COLOURS[name][1] };
              // Shown before its address is filled in, just not a link yet.
              return href ? (
                <a key={name} href={href} aria-label={SOCIAL_LABEL[name]} title={SOCIAL_LABEL[name]} target="_blank" rel="noopener noreferrer" style={style}>
                  <SocialGlyph name={name} />
                </a>
              ) : (
                <span key={name} role="img" aria-label={SOCIAL_LABEL[name]} title={SOCIAL_LABEL[name]} style={style}>
                  <SocialGlyph name={name} />
                </span>
              );
            })}
          </div>
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
