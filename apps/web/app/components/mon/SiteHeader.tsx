"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useApi } from "@/lib/api";
import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { telHref } from "@/lib/site/useSiteSettings";

import { FLAGS } from "./flags";
import { Arrow } from "./Icons";
import { initialsOf, isExternal, readItems, siteHref, type Copy } from "./links";

/**
 * The public header, as the website prototype draws it: a grey top bar of
 * secondary links with the phone number, then a sticky white bar with the
 * lockup and one grey pill holding the main links, the account, the request
 * basket, a red "Book now" and the language menu. Hovering "Services" opens a
 * menu of the services; a 2px red line along the bottom fills as the page
 * scrolls.
 *
 * Every word and link is a row of the CMS section `chrome`, so the office
 * edits the header from the dashboard. The phone number is the
 * `contact.phone` setting, so it changes in one place for the whole site.
 */

const LANGS: { code: Locale; short: string; name: string }[] = [
  { code: "de", short: "DE", name: "Deutsch" },
  { code: "en", short: "EN", name: "English" },
  { code: "tr", short: "TR", name: "Türkçe" },
  { code: "ar", short: "ع", name: "العربية" },
];

/** The request basket, shared with the service pages' "Add to request" buttons. */
export const CART_KEY = "mon.site-cart";

const PHONE_ICON =
  "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z";

export function SiteHeader({ copy, logo, phone }: { copy: Copy; logo: string; phone?: string | undefined }) {
  const { user, isStaff } = useApi();
  const { locale, setLocale } = useI18n();
  const pathname = usePathname();
  const progress = useRef<HTMLDivElement>(null);

  const [menu, setMenu] = useState(false);
  const [mega, setMega] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<string[]>([]);

  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  const href = (value: string) => siteHref(locale, value);

  // A link into the customer account ("Buchung verwalten", /konto…) is for
  // signed-in customers only: a guest would only meet the sign-in page, and
  // signing in has its own button. /konto itself still sends a guest to the
  // sign-in page and back (middleware.ts).
  const isAccountLink = (target: string) => /^\/konto(\/|$|\?|#)/.test(target.trim());
  const showAccountLinks = Boolean(user) && !isStaff;
  const allTopLinks = readItems(copy, "topbar.links", ["label", "href"]);
  const topLinks = allTopLinks.filter((link) => showAccountLinks || !isAccountLink(link.href));
  const accountLinks = showAccountLinks ? allTopLinks.filter((link) => isAccountLink(link.href)) : [];
  const navLinks = [{ label: copy["nav.home"] ?? "", href: "/" }, ...readItems(copy, "nav.links", ["label", "href"])].filter(
    (link) => link.label,
  );
  const services = readItems(copy, "mega", ["id", "name", "short", "img", "href"]);
  const servicesPath = copy["nav.servicesHref"]?.trim() || "/#services";
  const bookHref = href(copy["nav.bookHref"] || "/rechner");
  const number = phone?.trim() || "";

  // A link is "here" when it names this page; the homepage only for itself.
  const isHere = (target: string) => {
    const path = target.split("#")[0] || "/";
    if (target.includes("#")) return false;
    return path === "/" ? route === "/" : route === path || route.startsWith(`${path}/`);
  };

  useEffect(() => {
    const load = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]") as unknown;
        setCart(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
      } catch {
        setCart([]);
      }
    };
    load();
    // A service page's "Add to request" announces itself, so the badge follows at once.
    window.addEventListener("mon:cart", load);
    return () => window.removeEventListener("mon:cart", load);
  }, [pathname]);

  // Arriving somewhere closes whatever was open.
  useEffect(() => {
    setMenu(false);
    setMega(false);
    setLangOpen(false);
    setCartOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => {
      const el = progress.current;
      if (!el) return;
      const room = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${(room > 0 ? Math.min(1, window.scrollY / room) : 0).toFixed(4)})`;
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-lang]")) setLangOpen(false);
      if (!target?.closest("[data-cart]")) setCartOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setLangOpen(false);
      setCartOpen(false);
      setMega(false);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const removeFromCart = (id: string) => {
    const next = cart.filter((item) => item !== id);
    setCart(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("mon:cart"));
    } catch {
      // A blocked storage only means the basket is not remembered.
    }
  };

  const inCart = services.filter((service) => cart.includes(service.id));
  const cartLabel = `${inCart.length} ${inCart.length === 1 || locale === "tr" ? copy["cart.one"] ?? "" : copy["cart.many"] ?? ""}`;
  const cartHref = inCart.length ? `${bookHref}?services=${inCart.map((s) => s.id).join(",")}` : href(servicesPath);
  const current = LANGS.find((lang) => lang.code === locale) ?? LANGS[0]!;
  // Each language named in the language being read (`lang.de`, … in the CMS).
  const langName = (code: Locale) => copy[`lang.${code}`]?.trim() || LANGS.find((lang) => lang.code === code)?.name || code;

  const accountHref = href(user ? (isStaff ? "/admin" : "/konto") : "/login");
  const accountLabel = user ? copy["nav.account"] : copy["nav.login"];

  return (
    <>
      <div className="m-topbar">
        <div className="m-topbar-in">
          {topLinks.length ? (
            <nav aria-label={copy["topbar.label"] || undefined}>
              {topLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={href(link.href)}
                  aria-current={isHere(link.href) ? "page" : undefined}
                  {...(isExternal(link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
          <a className="m-phone" href={number ? telHref(number) : href("/kontakt")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={PHONE_ICON} />
            </svg>
            {number ? <bdi>{number}</bdi> : copy["topbar.phone"]}
          </a>
        </div>
      </div>

      <header className={`m-header${mega ? " is-mega" : ""}`} onMouseLeave={() => setMega(false)}>
        <div ref={progress} className="m-prog" aria-hidden="true" />
        <div className="m-header-in">
          <Link href={href("/")} aria-label="m.on" className="m-logo">
            <img src={logo} alt="m.on" />
          </Link>

          <div className="m-pill">
            <nav className="m-pill-nav" aria-label={copy["nav.label"] || undefined}>
              {navLinks.map((link) => {
                const isServices = link.href === servicesPath && services.length > 0;
                return (
                  <Link
                    key={`${link.label}-${link.href}`}
                    href={href(link.href)}
                    aria-current={isHere(link.href) ? "page" : undefined}
                    onMouseEnter={() => setMega(isServices)}
                    onFocus={() => setMega(false)}
                  >
                    {link.label}
                    {isServices ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <Link href={accountHref} className="m-acc">
              {user ? (
                <span className="m-acc-ini">{initialsOf(user.fullName || user.email || "")}</span>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21a8 8 0 0 1 16 0" />
                </svg>
              )}
              {accountLabel}
            </Link>

            <div data-cart="1" style={{ position: "relative", flex: "none" }}>
              <button
                type="button"
                className="m-round"
                aria-label={copy["cart.title"]}
                aria-expanded={cartOpen}
                onClick={() => {
                  setCartOpen((open) => !open);
                  setLangOpen(false);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
                  <circle cx="10" cy="20.5" r="1.2" />
                  <circle cx="17" cy="20.5" r="1.2" />
                </svg>
                {inCart.length ? <span className="m-cart-n">{inCart.length}</span> : null}
              </button>
              {cartOpen ? (
                <div className="m-pop" role="dialog" aria-label={copy["cart.title"]}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <b style={{ fontSize: 15, fontWeight: 700, color: "var(--m-ink)" }}>{copy["cart.title"]}</b>
                    <span style={{ fontSize: 12.5, color: "var(--m-muted2)" }}>{cartLabel}</span>
                  </div>
                  {inCart.length === 0 ? (
                    <p style={{ fontSize: 13.5, color: "var(--m-muted)", lineHeight: 1.55, textWrap: "pretty" }}>{copy["cart.empty"]}</p>
                  ) : (
                    inCart.map((service) => (
                      <div key={service.id} className="m-cart-row">
                        <img src={service.img} alt="" />
                        <Link href={href(service.href)} onClick={() => setCartOpen(false)}>
                          {service.name}
                        </Link>
                        <button type="button" className="m-cart-x" aria-label={copy["cart.remove"]} onClick={() => removeFromCart(service.id)}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                            <path d="M6 6l12 12M18 6 6 18" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                  <Link href={cartHref} className="m-cart-go" onClick={() => setCartOpen(false)}>
                    {inCart.length ? copy["cart.go"] : copy["cart.browse"]}
                  </Link>
                </div>
              ) : null}
            </div>

            <Link href={bookHref} className="m-book">
              {copy["nav.book"]}
            </Link>

            <div data-lang="1" style={{ position: "relative" }}>
              <button
                type="button"
                className="m-lang-btn"
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={langName(current.code)}
                onClick={() => setLangOpen((open) => !open)}
              >
                <img className="m-flag" src={FLAGS[current.code]} alt="" />
                <span>{current.short}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: langOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {langOpen ? (
                <div className="m-lang-list" role="listbox" aria-label="Language">
                  {LANGS.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      role="option"
                      lang={lang.code}
                      aria-selected={lang.code === locale}
                      className="m-lang-opt"
                      onClick={() => {
                        setLangOpen(false);
                        setLocale(lang.code);
                      }}
                    >
                      <span className="m-lang-name">
                        <img className="m-flag" src={FLAGS[lang.code]} alt="" />
                        <span>{langName(lang.code)}</span>
                      </span>
                      <small>{lang.short}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" className="m-round m-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((open) => !open)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d={menu ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
              </svg>
            </button>
          </div>
        </div>

        {mega ? (
          <div className="m-mega">
            <div className="m-mega-in">
              {services.map((service) => (
                <Link key={service.id} href={href(service.href)} className="m-mega-item" onClick={() => setMega(false)}>
                  <img src={service.img} alt="" />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <b>{service.name}</b>
                    <small>{service.short}</small>
                  </span>
                </Link>
              ))}
              <Link href={href(servicesPath)} className="m-mega-all" onClick={() => setMega(false)}>
                {copy["mega.all"]}
                <Arrow />
              </Link>
            </div>
          </div>
        ) : null}

        {menu ? (
          <nav className="m-menu">
            {navLinks.map((link) => (
              <Link key={`${link.label}-${link.href}`} href={href(link.href)} onClick={() => setMenu(false)}>
                {link.label}
              </Link>
            ))}
            <div className="m-menu-svcs">
              {services.map((service) => (
                <Link key={service.id} href={href(service.href)} onClick={() => setMenu(false)}>
                  <img src={service.img} alt="" />
                  {service.name}
                </Link>
              ))}
            </div>
            <div className="m-menu-foot">
              {accountLinks.map((link) => (
                <Link key={`${link.label}-${link.href}`} href={href(link.href)} onClick={() => setMenu(false)}>
                  {link.label}
                </Link>
              ))}
              <Link href={accountHref} onClick={() => setMenu(false)}>
                {accountLabel}
              </Link>
              <div className="m-menu-langs" role="group" aria-label="Language">
                {LANGS.map((lang) => (
                  <button key={lang.code} type="button" lang={lang.code} aria-label={langName(lang.code)} aria-pressed={lang.code === locale} onClick={() => setLocale(lang.code)}>
                    <img className="m-flag is-sm" src={FLAGS[lang.code]} alt="" />
                    {lang.short}
                  </button>
                ))}
              </div>
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
