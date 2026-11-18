"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useApi } from "@/lib/api";
import { useI18n } from "@/lib/i18n/provider";

import { useMyNotifications, useMyOrders, useProfile } from "./data";
import { Icon } from "./Icon";
import { IC, initials, tabOf } from "./model";
import { AC, type AcKey } from "./text";
import { useText } from "@/lib/admin/text";
import "./account.css";

/**
 * "My account", as the website prototype draws it: a white card on the start
 * side with the customer, the sections and two buttons, and the section on
 * the other side. Above 884px (the prototype's 960 at its zoom) the card is a
 * sticky column; below, it sits on top and its sections scroll sideways.
 *
 * Mounted once by the /konto layout, so moving between sections keeps the
 * card and only swaps the content. The middleware already sent anyone without
 * a session to sign in; this covers a session that ends while the page is open.
 */

interface FlashValue {
  flash: { text: string; error?: boolean } | null;
  say: (text: string, error?: boolean) => void;
}

const FlashContext = createContext<FlashValue>({ flash: null, say: () => undefined });

const CARRIED_FLASH = "mon.account-flash";

/** Shows `text` on the next account page, for a change that navigates (a new language). */
export function flashOnNextPage(text: string): void {
  try {
    sessionStorage.setItem(CARRIED_FLASH, text);
  } catch {
    // Blocked storage only loses the message.
  }
}

/** The green line at the top of the section ("Booking cancelled…"), cleared on the next page. */
export function useFlash(): FlashValue["say"] {
  return useContext(FlashContext).say;
}

export function useAccountText() {
  return useText(AC);
}

const NAV: { key: string; path: string; label: AcKey; icon: string }[] = [
  { key: "overview", path: "", label: "overview", icon: IC.home },
  { key: "profile", path: "/profil", label: "profile", icon: IC.users },
  { key: "orders", path: "/auftraege", label: "myOrders", icon: IC.truck },
  { key: "notifications", path: "/benachrichtigungen", label: "notifs", icon: IC.bell },
  { key: "invoices", path: "/rechnungen", label: "invoices", icon: IC.doc },
  { key: "addresses", path: "/adressen", label: "addresses", icon: IC.pin },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const { user, loading, isStaff, signOut } = useApi();
  const { locale } = useI18n();
  const tx = useAccountText();
  const pathname = usePathname();
  const router = useRouter();

  const [flash, setFlash] = useState<FlashValue["flash"]>(null);
  const say = useCallback((text: string, error?: boolean) => {
    setFlash({ text, ...(error ? { error } : {}) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // A new section starts without the last one's message — except one left for
  // it by a change that reloaded the page in another language.
  useEffect(() => {
    let carried: string | null = null;
    try {
      carried = sessionStorage.getItem(CARRIED_FLASH);
      sessionStorage.removeItem(CARRIED_FLASH);
    } catch {
      // Blocked storage only loses the message.
    }
    setFlash(carried ? { text: carried } : null);
  }, [pathname]);

  const route = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  const base = `/${locale}/konto`;

  // Set while signing out, so the "no session" redirect to the sign-in page
  // does not race the trip home.
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (loading || leaving) return;
    if (!user) {
      router.replace(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    // The office works in the dashboard; its accounts have no bookings of their own here.
    if (isStaff) router.replace(`/${locale}/admin`);
  }, [loading, leaving, user, isStaff, router, locale, pathname]);

  const profile = useProfile();
  const orders = useMyOrders();
  const notifications = useMyNotifications();
  const upcoming = useMemo(() => (orders.data?.items ?? []).filter((order) => tabOf(order) === "up").length, [orders.data]);
  const unread = notifications.data?.unread ?? 0;

  const flashValue = useMemo(() => ({ flash, say }), [flash, say]);

  if (loading || !user || isStaff) {
    return (
      <section className="ac" aria-busy="true">
        <div className="ac-skel" style={{ height: 420 }} />
        <div className="ac-main">
          <div className="ac-skel" style={{ height: 64, borderRadius: 14 }} />
          <div className="ac-skel" style={{ height: 260 }} />
        </div>
      </section>
    );
  }

  const name = user.fullName || user.email;
  const badges: Record<string, number> = { orders: upcoming, notifications: unread };

  return (
    <FlashContext.Provider value={flashValue}>
      <section className="ac" data-screen-label="My account">
        <aside className="ac-aside">
          <div className="ac-who">
            {profile.data?.avatar ? (
              // A data URL the profile saved; next/image has nothing to optimise here.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ac-ini is-photo" src={profile.data.avatar} alt="" />
            ) : (
              <span className="ac-ini">{initials(name)}</span>
            )}
            <span className="ac-who-t">
              <b>{name}</b>
              <small>{user.email}</small>
            </span>
          </div>

          <nav className="ac-nav" aria-label={tx("myAccount")}>
            {NAV.map((item) => {
              const href = `${base}${item.path}`;
              const here = item.path === "" ? route === "/konto" : route === `/konto${item.path}` || route.startsWith(`/konto${item.path}/`);
              const badge = badges[item.key] ?? 0;
              return (
                <Link key={item.key} href={href} aria-current={here ? "page" : undefined}>
                  <Icon d={item.icon} />
                  <span>{tx(item.label)}</span>
                  {badge > 0 ? <span className="ac-badge">{badge}</span> : null}
                </Link>
              );
            })}
          </nav>

          <Link href={`/${locale}/rechner`} className="ac-new">
            <Icon d={IC.plus} size={14} sw={2.6} />
            {tx("newBooking")}
          </Link>
          <button
            type="button"
            className="ac-out"
            onClick={() => {
              setLeaving(true);
              void signOut().then(() => {
                router.push(`/${locale}`);
                router.refresh();
              });
            }}
          >
            <Icon d={IC.logout} size={15} sw={1.9} />
            {tx("signOut")}
          </button>
        </aside>

        <div className="ac-main">
          {flash ? (
            <p role="status" className={`ac-flash${flash.error ? " is-err" : ""}`}>
              <Icon d={flash.error ? "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v5M12 16h.01" : IC.check} size={16} sw={2.4} />
              {flash.text}
            </p>
          ) : null}
          {children}
        </div>
      </section>
    </FlashContext.Provider>
  );
}
