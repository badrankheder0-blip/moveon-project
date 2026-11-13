"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { permissionFor } from "@/lib/access/staff-routes";
import { useDraftSummary, usePublishing } from "@/lib/admin/drafts";
import { forgetSignIn, signInExpired } from "@/lib/admin/session";
import { ADMIN_GROUPS, ADMIN_ICONS, ADMIN_PATHS, NAV_TEXT, type AdminView } from "@/lib/admin/nav";
import { useText } from "@/lib/admin/text";
import { pagePermissionsOf, useApi } from "@/lib/api";
import { LOCALE_META, LOCALES, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/provider";
import { useSiteSettings } from "@/lib/site/useSiteSettings";

/**
 * The admin dashboard's frame, as the admin prototype draws it: a floating
 * grey sidebar that collapses to icons (a drawer on phones), a sticky header
 * with the breadcrumb, the global search, the language and the signed-in
 * person, and a 1180px column for the screen itself.
 *
 * As with the old shell, none of this is the authorisation boundary: the edge
 * middleware keeps people out of /admin, and every endpoint checks the
 * capability again. A section someone may not open is simply not shown.
 */

/** The menu's scroll position, carried from one page's shell to the next. */
let navScroll = 0;

const SIDE_KEY = "mon.admin.side";
const AVATAR_COLOURS = ["#d71635", "#252b28", "#3f705a", "#a0661c", "#3d5a99", "#7a3e8f"];
const CHEVRON = "M6 9l6 6 6-6";
const NEXT = "M9 18l6-6-6-6";
const PREV = "M15 18l-6-6 6-6";

// ── Toasts ────────────────────────────────────────────────────────────────

const ToastContext = createContext<(message: string) => void>(() => undefined);

/** Shows a short confirmation at the bottom of the screen. */
export function useToast() {
  return useContext(ToastContext);
}

/** The badges: new orders and unread website messages. */
interface AdminCounts {
  newOrders: number;
  unreadInbox: number;
}

function useAdminCounts(enabled: boolean) {
  const { sdk } = useApi();
  return useQuery({
    queryKey: ["admin", "counts"],
    queryFn: () => sdk.http.get<AdminCounts>("/api/admin/counts"),
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** The key of the Homepage editor's entry, shown only to those who may open it. */
export const HOME_SUB = "__home";

/** One page under Content editing in the sidebar; `edited` marks unpublished changes. */
export interface AdminSubPage {
  key: string;
  label: string;
  href: string;
  current: boolean;
  edited: boolean;
}

export function AdminShell({
  view,
  crumb,
  pages: subPages,
  children,
}: {
  /** The section this screen belongs to; highlights it in the sidebar. */
  view: AdminView;
  /** What the breadcrumb shows after "Admin" — the section's name by default. */
  crumb?: string;
  /**
   * The website's pages, listed under Content editing while it is open (the
   * content screens know them; elsewhere only the Homepage link shows).
   */
  pages?: AdminSubPage[];
  children: ReactNode;
}) {
  const { user, loading, isStaff, can, signOut } = useApi();
  const { locale, setLocale } = useI18n();
  const site = useSiteSettings();
  const tx = useText(NAV_TEXT);
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [host, setHost] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const counts = useAdminCounts(isStaff).data;
  const drafts = useDraftSummary(isStaff).data;
  const publishing = usePublishing();
  const rtl = LOCALE_META[locale].dir === "rtl";
  const href = (path: string) => `/${locale}${path}`;

  useEffect(() => {
    setHost(window.location.host);
    try {
      setCollapsed(localStorage.getItem(SIDE_KEY) === "1");
    } catch {
      // Without storage the sidebar starts open each time.
    }
  }, []);

  // A session that ends or is demoted while the tab is open: the edge never
  // sees that, because no navigation happens.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/${locale}/admin/anmelden?next=${encodeURIComponent(pathname)}`);
    else if (!isStaff) router.replace(`/${locale}/konto`);
    // "Keep me signed in" was unticked and the browser has closed since.
    else if (signInExpired()) {
      forgetSignIn();
      void signOut().then(() => router.replace(`/${locale}/admin/anmelden`));
    }
  }, [loading, user, isStaff, router, locale, pathname, signOut]);

  useEffect(() => {
    setDrawer(false);
    setLangOpen(false);
  }, [pathname]);

  // Each page mounts its own shell, so the menu would jump back to the top
  // on every click; the prototype's menu stays where it was, with the
  // current item in sight.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    el.scrollTop = navScroll;
    // The current item together with its open sub-pages.
    const active = el.querySelector<HTMLElement>('[aria-current="page"]')?.closest<HTMLElement>(".a-group > div");
    if (!active) return;
    const box = el.getBoundingClientRect();
    const row = active.getBoundingClientRect();
    if (row.top < box.top || row.bottom > box.bottom) active.scrollIntoView({ block: "nearest" });
  }, [pathname, loading, subPages?.length]);

  useEffect(() => {
    if (!drawer && !langOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawer(false);
      setLangOpen(false);
    };
    const onDown = (event: MouseEvent) => {
      if (!(event.target as Element | null)?.closest("[data-a-lang]")) setLangOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [drawer, langOpen]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);

  const toggleSide = () => {
    setCollapsed((current) => {
      try {
        localStorage.setItem(SIDE_KEY, current ? "0" : "1");
      } catch {
        // Not remembered, which is all that is lost.
      }
      return !current;
    });
  };

  // A "selected pages" member sees exactly the pages ticked for them (Content
  // editing also opens the homepage editor, as in the prototype); everyone
  // else by capability. The capability is checked either way, and the API
  // enforces it again.
  const pages = pagePermissionsOf(user);
  const allowed = (key: AdminView) =>
    can(permissionFor(ADMIN_PATHS[key])) &&
    (pages === null || pages.includes(key) || (key === "home" && pages.includes("pages")) || (key === "pages" && pages.includes("home")));
  const userKids = (["customers", "users"] as const).filter(allowed);
  const inUsers = userKids.some((key) => key === view);
  const usersExpanded = usersOpen ?? inUsers;

  const groups = ADMIN_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => (item === "usermgmt" ? userKids.length > 0 : allowed(item))),
  })).filter((group) => group.items.length > 0);

  const badge = (key: AdminView) => (key === "orders" ? counts?.newOrders : key === "inbox" ? counts?.unreadInbox : 0) ?? 0;

  const role = user?.role === "super_admin" ? tx("roleOwner") : user?.role === "admin" ? tx("roleAdmin") : tx("roleMember");
  const name = user?.fullName?.trim() || user?.email || "";
  // The prototype's avatar: first letters of the first two words, and a
  // colour picked by a string hash of the email.
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "·";
  const colour = AVATAR_COLOURS[[...(user?.email ?? "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 0) % AVATAR_COLOURS.length];

  const nav = (inDrawer: boolean) => {
    const open = inDrawer || !collapsed;
    return groups.map((group) => (
      <div key={group.key} className="a-group">
        {open ? <span className="a-group-label">{tx(group.key)}</span> : <span className="a-group-rule" />}
        {group.items.map((item) => {
          if (item === "usermgmt") {
            const highlight = inUsers && (!open || !usersExpanded);
            return (
              <div key={item}>
                <button
                  type="button"
                  className="a-nav"
                  title={tx("usermgmt")}
                  aria-label={tx("usermgmt")}
                  aria-expanded={usersExpanded}
                  aria-current={highlight ? "page" : undefined}
                  onClick={() => {
                    if (!open && userKids[0]) router.push(href(ADMIN_PATHS[userKids[0]]));
                    else setUsersOpen(!usersExpanded);
                  }}
                >
                  {/* Open on its current child, the parent reads as the
                      section you are in: red icon, bold label. */}
                  <span className="a-nav-ic" style={inUsers && !highlight ? { color: "var(--a-red)" } : undefined}>
                    <Svg d={ADMIN_ICONS.usermgmt} />
                  </span>
                  {open ? (
                    <>
                      <b style={inUsers && !highlight ? { fontWeight: 650, color: "var(--a-ink)" } : undefined}>{tx("usermgmt")}</b>
                      <svg className="a-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: usersExpanded ? "rotate(180deg)" : "none" }} aria-hidden="true">
                        <path d={CHEVRON} />
                      </svg>
                    </>
                  ) : null}
                </button>
                {open && usersExpanded ? (
                  <div className="a-subs">
                    {userKids.map((kid) => (
                      <Link key={kid} href={href(ADMIN_PATHS[kid])} className="a-sub" title={tx(kid)} aria-current={view === kid ? "page" : undefined}>
                        <span>{tx(kid)}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          const current = view === item || (item === "pages" && view === "home");
          const count = badge(item);
          return (
            <div key={item}>
              <Link href={href(ADMIN_PATHS[item])} className="a-nav" title={tx(item)} aria-label={tx(item)} aria-current={current ? "page" : undefined}>
                <span className="a-nav-ic">
                  <Svg d={ADMIN_ICONS[item]} />
                  {count > 0 && !open ? <i className="a-nav-dot" /> : null}
                </span>
                {open ? <b>{tx(item)}</b> : null}
                {count > 0 && open ? <span className="a-pill-badge">{count}</span> : null}
              </Link>
              {item === "pages" && open && current && subPages?.length ? (
                <div className="a-subs">
                  {subPages.filter((page) => page.key !== HOME_SUB || allowed("home")).map((page) => (
                    <Link key={page.key} href={page.href} className="a-sub" title={page.label} aria-current={page.current ? "page" : undefined}>
                      <span>{page.label}</span>
                      {page.edited ? <i aria-hidden="true" /> : null}
                    </Link>
                  ))}
                </div>
              ) : item === "pages" && open && current && allowed("home") ? (
                <div className="a-subs">
                  <Link href={href(ADMIN_PATHS.home)} className="a-sub" aria-current={view === "home" ? "page" : undefined}>
                    <span>{tx("home")}</span>
                  </Link>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <ToastContext.Provider value={showToast}>
      <div className="adm">
        <div className="a-frame">
          <aside className={`a-side${collapsed ? " is-closed" : ""}`}>
            <div className="a-side-glow" aria-hidden="true">
              <b />
              <i />
            </div>
            <div className="a-side-logo">
              <Link href={href(ADMIN_PATHS.overview)} aria-label="m.on">
                <img src={site.logo} alt="m.on" />
              </Link>
              <button type="button" className="a-side-toggle" onClick={toggleSide} aria-label={tx(collapsed ? "expand" : "collapse")} title={tx(collapsed ? "expand" : "collapse")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={collapsed !== rtl ? NEXT : PREV} />
                </svg>
              </button>
            </div>
            <nav className="a-side-nav" aria-label={tx("menu")} ref={navRef} onScroll={(event) => (navScroll = event.currentTarget.scrollTop)}>
              {nav(false)}
            </nav>
            <div className="a-side-foot">
              <a href={href("/")} target="_blank" rel="noopener noreferrer" className="a-live" title={tx("openSite")}>
                <span className="a-live-dot">
                  <i />
                  <i />
                </span>
                {!collapsed ? (
                  <>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>{tx("liveSite")}</b>
                      <small>
                        {drafts?.lastPublishedAt
                          ? tx("lastPublished", {
                              date: new Date(drafts.lastPublishedAt).toLocaleString(locale === "ar" ? "ar-u-nu-latn" : locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
                            })
                          : host && tx("notPublished")}
                      </small>
                    </span>
                    <ExternalIcon />
                  </>
                ) : null}
              </a>
            </div>
          </aside>

          <div className="a-col">
            <header className="a-head">
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <button type="button" className="a-burger a-narrow-only" aria-label={tx("menu")} onClick={() => setDrawer(true)}>
                  <Svg d="M3 6h18M3 12h18M3 18h18" size={18} width={2} />
                </button>
                <img className="a-narrow-only" src={site.logo} alt="m.on" style={{ height: 36, width: "auto" }} />
                <div className="a-crumb a-wide-only">
                  <span style={{ whiteSpace: "nowrap" }}>{tx("brand")}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={rtl ? PREV : NEXT} />
                  </svg>
                  <b>
                    <bdi>{crumb ?? tx(view)}</bdi>
                  </b>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className="a-search a-wide-only">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#737870" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" />
                  </svg>
                  <input
                    value={query}
                    placeholder={tx("searchAll")}
                    aria-label={tx("searchAll")}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || !query.trim()) return;
                      router.push(`${href(ADMIN_PATHS.orders)}?q=${encodeURIComponent(query.trim())}`);
                      setQuery("");
                    }}
                  />
                  <kbd>↵</kbd>
                </label>
                <div data-a-lang="1" style={{ position: "relative" }}>
                  <button type="button" className="a-lang" aria-haspopup="true" aria-expanded={langOpen} aria-label={tx("language")} onClick={() => setLangOpen((open) => !open)}>
                    <Svg d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" size={15} />
                    <span>{LOCALE_META[locale].label}</span>
                  </button>
                  {langOpen ? (
                    <div className="a-lang-list">
                      {LOCALES.map((code: Locale) => (
                        <button key={code} type="button" lang={code} aria-current={code === locale} onClick={() => setLocale(code)}>
                          <span>{LOCALE_META[code].label}</span>
                          <small style={{ fontSize: 10.5, fontWeight: 700, color: "var(--a-muted2)" }}>{code.toUpperCase()}</small>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                {user ? (
                  <div className="a-me">
                    <span className="a-me-av" title={user.email} style={{ background: colour }}>
                      {initials}
                    </span>
                    <span className="a-me-who a-wide-only">
                      <b>{name}</b>
                      <small>{role}</small>
                    </span>
                    <button type="button" className="a-me-out" aria-label={tx("logout")} title={tx("logout")} onClick={() => {
                      forgetSignIn();
                      void signOut().then(() => router.push(`/${locale}/admin/anmelden`));
                    }}>
                      <Svg d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" size={16} width={1.9} />
                    </button>
                  </div>
                ) : null}
                <a className="a-site-sq a-narrow-only" href={href("/")} target="_blank" rel="noopener noreferrer" aria-label={tx("openSite")}>
                  <ExternalIcon colour="currentColor" />
                </a>
              </div>
            </header>
            <main className="a-main">
              <div className="a-main-in">
                {children}
                {drafts?.count ? (
                  <div className="a-publish" role="region" aria-label={tx("unsaved")}>
                    <span>
                      <i />
                      {tx("unsaved")}
                    </span>
                    <div className="a-actions">
                      <button
                        type="button"
                        className="a-btn is-ghost"
                        disabled={publishing.discard.isPending}
                        onClick={() => publishing.discard.mutate(undefined, { onSuccess: () => showToast(tx("discarded")) })}
                      >
                        {tx("discard")}
                      </button>
                      <button
                        type="button"
                        className="a-btn"
                        disabled={publishing.publish.isPending}
                        onClick={() =>
                          publishing.publish.mutate(undefined, {
                            onSuccess: () => showToast(tx("published")),
                            onError: () => showToast(tx("publishFailed")),
                          })
                        }
                      >
                        <Svg d="M5 12l5 5L20 7" size={15} width={2.4} />
                        {tx("publish")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </main>
          </div>
        </div>

        {drawer ? (
          <>
            <button type="button" className="a-drawer-bg" tabIndex={-1} aria-label={tx("close")} onClick={() => setDrawer(false)} />
            <div className="a-drawer" role="dialog" aria-modal="true" aria-label={tx("menu")}>
              <div className="a-drawer-head">
                <img src={site.logo} alt="m.on" />
                <button type="button" className="a-burger" aria-label={tx("close")} onClick={() => setDrawer(false)}>
                  <Svg d="M6 6l12 12M18 6 6 18" size={18} width={2} />
                </button>
              </div>
              <nav className="a-side-nav">{nav(true)}</nav>
            </div>
          </>
        ) : null}

        {toast ? (
          <div className="a-toast" role="status">
            <Svg d="M5 12l5 5L20 7" size={16} width={2.4} />
            {toast}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

function Svg({ d, size = 18, width = 1.8 }: { d: string; size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function ExternalIcon({ colour = "#737870" }: { colour?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colour} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
